import { Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.model";
import { Staff } from "../models/Staff.model";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  emitOrderAccepted,
  emitOrderAcceptedToStaff,
  emitOrderStatusUpdate,
} from "../services/socket.service";
import { runTransaction } from "../utils/transaction.util";
import {
  reserveInventoryAtomic,
  restoreInventoryAtomic,
  validateStatusTransition,
} from "../utils/orderInventory.util";

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
    const orders = await Order.find({
      status: "pending",
      $or: [{ assignedStaffId: { $exists: false } }, { assignedStaffId: null }],
    })
      .populate("customerId", "name phone")
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
      return res.status(400).json({ message: "Order is already assigned to another staff member" });
    }

    const updatedOrder = await runTransaction(async (session) => {
      // 1. Atomically reserve inventory
      await reserveInventoryAtomic(order.items, session);

      // 2. Atomic state transition & staff assignment
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
        throw new Error("Order was already accepted by another staff member");
      }

      return accepted;
    });

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate("customerId", "name phone")
      .populate("assignedStaffId", "name phone");

    if (populatedOrder) {
      emitOrderAccepted(populatedOrder);
      emitOrderAcceptedToStaff(populatedOrder);
    }

    res.json({
      message: "Order accepted successfully",
      order: populatedOrder || updatedOrder,
    });
  } catch (error: any) {
    console.error("Accept order error:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to accept order" });
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
        timestamps.paymentStatus = "paid";
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

    if (populatedOrder) {
      emitOrderStatusUpdate(populatedOrder);
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

