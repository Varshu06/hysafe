import { Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.model";
import { RecurringBill } from "../models/RecurringBill.model";
import { Staff } from "../models/Staff.model";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  emitOrderAccepted,
  emitOrderAcceptedToStaff,
  emitOrderStatusUpdate,
} from "../services/socket.service";
import { runTransaction } from "../utils/transaction.util";
import { shouldAutoMarkOrderPaidOnDelivery } from "../services/recurringBilling.service";
import {
  reserveInventoryAtomic,
  restoreInventoryAtomic,
  validateStatusTransition,
} from "../utils/orderInventory.util";
import { processDueRecurringDeliveries } from "../services/recurringDelivery.service";
import { notifyCustomerBill, notifyCustomerOrderStatus } from "../services/inAppNotification.service";

// Toggle online/offline status
export const toggleStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { isOnline, location, fcmToken } = req.body;

    const updateData: any = {
      isOnline,
      ...(location && { currentLocation: location }),
    };

    // Update FCM token if provided
    if (fcmToken) {
      updateData.fcmToken = fcmToken;
      console.log(
        `🔔 Updating FCM token for staff: ${fcmToken.substring(0, 20)}...`,
      );
    }

    const staff = await Staff.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true },
    );

    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found" });
    }

    res.json({
      message: `Staff is now ${isOnline ? "online" : "offline"}`,
      staff,
    });
  } catch (error: any) {
    console.error("Toggle status error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to update status" });
  }
};

// Get available orders (pending, not assigned)
export const getAvailableOrders = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure any due recurring deliveries for today are materialized into orders
    await processDueRecurringDeliveries().catch((err) =>
      console.error("[StaffController] Error processing due recurring deliveries on demand:", err)
    );

    const orders = await Order.find({
      status: "pending",
      $or: [{ assignedStaffId: { $exists: false } }, { assignedStaffId: null }],
    })
      .populate("customerId", "name phone")
      .populate("recurringBillId", "amount status paymentMethod preferredPaymentMethod")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error: any) {
    console.error("Get available orders error:", error);
    res.status(500).json({ message: error.message || "Failed to get orders" });
  }
};

// Accept order
export const acceptOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const staffId = req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order is no longer available" });
    }

    if (order.assignedStaffId) {
      return res.status(400).json({ message: "Order is no longer available" });
    }

    const updatedOrder = await runTransaction(async (session) => {
      // Claim the order before touching inventory. This compare-and-swap makes
      // concurrent acceptance safe even on standalone MongoDB deployments.
      const accepted = await Order.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
          $or: [{ assignedStaffId: { $exists: false } }, { assignedStaffId: null }],
        },
        {
          $set: {
            status: "accepted",
            assignedStaffId: staffId,
            acceptedAt: new Date(),
          },
        },
        { session, new: true },
      );

      if (!accepted) {
        throw new Error("Order is no longer available");
      }

      const reservedItems: typeof order.items = [];
      try {
        for (const item of order.items) {
          await reserveInventoryAtomic([item], session);
          reservedItems.push(item);
        }
      } catch (error) {
        // Transaction deployments roll back the claim. On a standalone MongoDB
        // deployment, explicitly release it if inventory reservation failed.
        if (!session) {
          if (reservedItems.length) await restoreInventoryAtomic(reservedItems);
          await Order.updateOne(
            { _id: id, status: "accepted", assignedStaffId: staffId },
            { $set: { status: "pending" }, $unset: { assignedStaffId: 1, acceptedAt: 1 } },
          );
        }
        throw error;
      }

      return accepted;
    });

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate("customerId", "name phone")
      .populate("assignedStaffId", "name phone");

    if (populatedOrder) {
      emitOrderAccepted(populatedOrder);
      emitOrderAcceptedToStaff(populatedOrder);
      void notifyCustomerOrderStatus(populatedOrder, "order_accepted");
    }

    res.json({
      message: "Order accepted successfully",
      order: populatedOrder || updatedOrder,
    });
  } catch (error: any) {
    console.error("Accept order error:", error);
    const message = error?.code === 112 || /write.?conflict|already accepted|no longer available/i.test(error?.message || "")
      ? "Order is no longer available"
      : error.message || "Failed to accept order";
    res
      .status(400)
      .json({ message });
  }
};

// Reject order
export const rejectOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log(
      `Staff ${req.user._id} rejected order ${id}. Reason: ${reason || "No reason provided"}`,
    );

    res.json({
      message: "Order rejected",
    });
  } catch (error: any) {
    console.error("Reject order error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to reject order" });
  }
};

// Get ongoing orders (accepted, out_for_delivery, and delivered orders for this staff)
export const getOngoingOrders = async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.user._id;

    const orders = await Order.find({
      assignedStaffId: staffId,
      status: { $in: ["accepted", "out_for_delivery", "delivered"] },
    })
      .populate("customerId", "name phone")
      .populate("recurringBillId", "amount status paymentMethod preferredPaymentMethod")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error: any) {
    console.error("Get ongoing orders error:", error);
    res.status(500).json({ message: error.message || "Failed to get orders" });
  }
};

// Update order status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let { status, notes } = req.body;
    const codCollected = req.body.codCollected === true;
    const submittedCollectionMethod = req.body.collectedPaymentMethod === 'cash' || req.body.collectedPaymentMethod === 'shop'
      ? req.body.collectedPaymentMethod as 'cash' | 'shop'
      : undefined;

    const statusMap: { [key: string]: string } = {
      picked: "out_for_delivery",
      transit: "out_for_delivery",
      "in-transit": "out_for_delivery",
    };

    if (statusMap[status]) {
      status = statusMap[status];
    }

    const validStatuses = [
      "accepted",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Valid statuses: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Staff Ownership Authorization Check
    if (order.assignedStaffId?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    const previousStatus = order.status;

    if (previousStatus === status) {
      return res.status(400).json({ message: `Order is already in status "${status}"` });
    }

    if (!validateStatusTransition(previousStatus, status)) {
      return res.status(400).json({
        message: `Invalid state transition from "${previousStatus}" to "${status}"`,
      });
    }

    const totalOrderQuantity = order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    let paidBillId: mongoose.Types.ObjectId | null = null;
    const updatedOrder = await runTransaction(async (session) => {
      // Side effects executed exactly once per valid transition:
      if (previousStatus === "accepted" && status === "out_for_delivery") {
        // Driver picks up cans
        await updateDriverInventory(req.user._id, totalOrderQuantity, "pickup", session);
      } else if (previousStatus === "out_for_delivery" && status === "delivered") {
        // Driver delivers cans
        await updateDriverInventory(req.user._id, totalOrderQuantity, "deliver", session);
      } else if (previousStatus === "out_for_delivery" && status === "cancelled") {
        // Return cans from driver
        await updateDriverInventory(req.user._id, totalOrderQuantity, "return", session);
        await restoreInventoryAtomic(order.items, session);
      } else if (previousStatus === "accepted" && status === "cancelled") {
        // Return reserved stock
        await restoreInventoryAtomic(order.items, session);
      }

      const timestamps: Record<string, any> = {};
      if (status === "out_for_delivery" && !order.outForDeliveryAt) {
        timestamps.outForDeliveryAt = new Date();
      }
      if (status === "delivered") {
        if (!order.deliveredAt) timestamps.deliveredAt = new Date();
        if (shouldAutoMarkOrderPaidOnDelivery(order.isRecurring)) timestamps.paymentStatus = "paid";

        if (order.isRecurring && order.recurringDeliveryId) {
          const billQuery = order.recurringBillId
            ? { _id: order.recurringBillId, recurringDeliveryId: order.recurringDeliveryId }
            : { recurringDeliveryId: order.recurringDeliveryId, orderIds: order._id };
          const bill = await RecurringBill.findOne(billQuery).session(session || null);
          if (bill?.status === "paid") {
            // The period bill may cover multiple scheduled orders. Once paid,
            // later deliveries in the same period must not request collection again.
            timestamps.paymentStatus = "paid";
          } else if (codCollected && bill && (bill.status === "confirmed" || bill.status === "overdue")) {
            const savedMethod = bill.preferredPaymentMethod ||
              (order.paymentMethod === "cash" || order.paymentMethod === "shop" ? order.paymentMethod : undefined);
            if (savedMethod && submittedCollectionMethod && submittedCollectionMethod !== savedMethod) {
              throw new Error("Collected payment method does not match the recurring plan");
            }
            const collectionMethod = savedMethod || submittedCollectionMethod;
            if (collectionMethod) {
              const paidAt = new Date();
              const recordedBill = await RecurringBill.findOneAndUpdate(
                { _id: bill._id, status: { $in: ["confirmed", "overdue"] } },
                { $set: { status: "paid", paymentMethod: collectionMethod, paymentAmount: bill.amount, paidAt, paidBy: req.user._id } },
                { session: session || undefined, new: true },
              );
              if (recordedBill) {
                paidBillId = recordedBill._id;
                timestamps.paymentStatus = "paid";
              }
            }
          }
        }
      }

      const result = await Order.findOneAndUpdate(
        {
          _id: id,
          assignedStaffId: req.user._id,
          status: previousStatus,
        },
        {
          $set: {
            status,
            ...(notes && { notes }),
            ...timestamps,
          },
        },
        { session, new: true },
      );

      if (!result) {
        throw new Error("Order status update failed due to concurrent modification");
      }

      return result;
    });

    const populatedOrder = await Order.findById(updatedOrder._id).populate(
      "customerId",
      "name phone",
    );

    if (paidBillId) {
      const paidBill = await RecurringBill.findById(paidBillId);
      if (paidBill) void notifyCustomerBill(paidBill, "bill_paid");
    }

    if (populatedOrder) {
      emitOrderStatusUpdate(populatedOrder);
      const notificationTypes: Record<string, "order_out_for_delivery" | "order_delivered" | "order_cancelled"> = {
        out_for_delivery: "order_out_for_delivery",
        delivered: "order_delivered",
        cancelled: "order_cancelled",
      };
      const notificationType = notificationTypes[status];
      if (notificationType) void notifyCustomerOrderStatus(populatedOrder, notificationType);
    }

    res.json({
      message: "Order status updated",
      order: populatedOrder || updatedOrder,
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to update status" });
  }
};

// Helper function to update driver's inventory (cans in hand)
async function updateDriverInventory(
  staffId: mongoose.Types.ObjectId,
  quantity: number,
  action: "pickup" | "deliver" | "return",
  session?: mongoose.ClientSession | null,
) {
  try {
    const options = session ? { session } : {};
    if (action === "pickup") {
      await Staff.findOneAndUpdate(
        { userId: staffId },
        { $inc: { cansInHand: quantity } },
        options,
      );
    } else if (action === "deliver" || action === "return") {
      const staff = await Staff.findOne({ userId: staffId });
      if (staff) {
        const decrement = Math.min(staff.cansInHand || 0, quantity);
        if (decrement > 0) {
          await Staff.findOneAndUpdate(
            { userId: staffId },
            { $inc: { cansInHand: -decrement } },
            options,
          );
        }
      }
    }
  } catch (error: any) {
    console.error("Error updating driver inventory:", error);
    throw error;
  }
}
