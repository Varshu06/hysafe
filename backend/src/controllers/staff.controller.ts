import { Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.model";
import { Staff } from "../models/Staff.model";
import { Inventory } from "../models/Inventory.model";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  emitOrderAccepted,
  emitOrderAcceptedToStaff,
  emitOrderStatusUpdate,
} from "../services/socket.service";

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

    console.log(
      `✅ Staff ${staff.name} is now ${isOnline ? "online" : "offline"}${fcmToken ? " (FCM token updated)" : ""}`,
    );
    if (fcmToken && staff.fcmToken) {
      console.log(
        `🔔 Staff ${staff.name} FCM token saved: ${staff.fcmToken.substring(0, 20)}...`,
      );
    } else if (isOnline && !staff.fcmToken) {
      console.warn(`⚠️ Staff ${staff.name} is online but has no FCM token!`);
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
      assignedStaffId: { $exists: false },
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

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order is not available" });
    }

    if (order.assignedStaffId) {
      return res.status(400).json({ message: "Order already assigned" });
    }

    // Assign order to staff
    const staffId = req.user._id;
    order.assignedStaffId = staffId;
    order.status = "accepted";
    order.acceptedAt = new Date();
    await order.save();

    // Update inventory: Reserve stock when order is accepted
    await updateInventoryOnOrderAccept(order.quantity);

    console.log(
      `✅ Order ${order._id} accepted by staff ${staffId}. Status: ${order.status}, AssignedStaffId: ${order.assignedStaffId}`,
    );

    // Populate order for socket emission
    const populatedOrder = await Order.findById(order._id)
      .populate("customerId", "name phone")
      .populate("assignedStaffId", "name phone");

    // Emit socket events
    if (populatedOrder) {
      emitOrderAccepted(populatedOrder);
      emitOrderAcceptedToStaff(populatedOrder);
    }

    res.json({
      message: "Order accepted successfully",
      order: populatedOrder || order,
    });
  } catch (error: any) {
    console.error("Accept order error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to accept order" });
  }
};

// Reject order
export const rejectOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Just log rejection, order remains available for other staff
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

    // Get all orders assigned to this staff member that are not cancelled
    const orders = await Order.find({
      assignedStaffId: staffId,
      status: { $in: ["accepted", "out_for_delivery", "delivered"] },
    })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 });

    console.log(`Found ${orders.length} ongoing orders for staff ${staffId}`);

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
    let { status, paymentMethod, transactionId, notes } = req.body;

    // Map frontend statuses to backend statuses
    const statusMap: { [key: string]: string } = {
      picked: "out_for_delivery",
      transit: "out_for_delivery",
      "in-transit": "out_for_delivery",
    };

    // Convert frontend status to backend status if needed
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

    if (order.assignedStaffId?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    // Update status
    const previousStatus = order.status;
    order.status = status as any;

    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.notes = notes || order.notes;
    if (transactionId) {
      order.transactionId = transactionId;
      order.paymentStatus = "paid"; // Mark as paid if transaction ID is provided
    }

    if (status === "out_for_delivery") {
      order.outForDeliveryAt = new Date();
      // Driver picks up cans: Add to driver's inventory
      await updateDriverInventory(req.user._id, order.quantity, "pickup");
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
      if (order.paymentMethod === "offline") {
        order.paymentStatus = "paid"; // Auto-mark as paid on delivery
      }

      // Driver delivers cans: Remove from driver's inventory
      await updateDriverInventory(req.user._id, order.quantity, "deliver");

      // Update factory inventory: Reduce stock when order is delivered
      await updateInventoryOnOrderDelivered(order.quantity, previousStatus);
    } else if (status === "cancelled" && previousStatus !== "pending") {
      // If order was accepted/out_for_delivery and now cancelled, release reserved stock
      if (previousStatus === "out_for_delivery") {
        // Driver had picked up cans, return them to driver's inventory (or factory)
        await updateDriverInventory(req.user._id, order.quantity, "return");
      }
      await updateInventoryOnOrderCancel(order.quantity, previousStatus);
    }

    await order.save();

    console.log(
      `✅ Order ${order._id} status updated from ${previousStatus} to ${status} by staff ${req.user._id}`,
    );

    // Populate order for socket emission
    const populatedOrder = await Order.findById(order._id).populate(
      "customerId",
      "name phone",
    );

    // Emit socket event to notify customer
    if (populatedOrder) {
      emitOrderStatusUpdate(populatedOrder);
    }

    res.json({
      message: "Order status updated",
      order,
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to update status" });
  }
};

// Helper function to update inventory when order is accepted
async function updateInventoryOnOrderAccept(quantity: number) {
  try {
    // Get or create inventory document
    let inventory = await Inventory.findOne();
    if (!inventory) {
      // Initialize inventory if it doesn't exist
      inventory = await Inventory.create({
        totalStock: 1000, // Default starting stock
        availableStock: 1000,
        reservedStock: 0,
        deliveredStock: 0,
        lowStockThreshold: 50,
      });
    }

    // Reserve stock: Move from available to reserved
    if (inventory.availableStock >= quantity) {
      inventory.availableStock -= quantity;
      inventory.reservedStock += quantity;
      inventory.lastUpdated = new Date();
      await inventory.save();
      console.log(
        `📦 Inventory updated: Reserved ${quantity} cans. Available: ${inventory.availableStock}, Reserved: ${inventory.reservedStock}`,
      );
    } else {
      console.warn(
        `⚠️ Insufficient stock: Requested ${quantity}, Available: ${inventory.availableStock}`,
      );
    }
  } catch (error: any) {
    console.error("Error updating inventory on order accept:", error);
    // Don't throw - inventory update shouldn't block order acceptance
  }
}

// Helper function to update inventory when order is delivered
async function updateInventoryOnOrderDelivered(
  quantity: number,
  previousStatus: string,
) {
  try {
    let inventory = await Inventory.findOne();
    if (!inventory) {
      console.warn("Inventory not found, creating new inventory record");
      inventory = await Inventory.create({
        totalStock: 1000,
        availableStock: 1000,
        reservedStock: 0,
        deliveredStock: quantity,
        lowStockThreshold: 50,
      });
      return;
    }

    // If order was previously accepted/out_for_delivery, release from reserved
    if (
      previousStatus === "accepted" ||
      previousStatus === "out_for_delivery"
    ) {
      if (inventory.reservedStock >= quantity) {
        inventory.reservedStock -= quantity;
      } else {
        // Handle edge case where reserved stock might be less
        inventory.reservedStock = Math.max(
          0,
          inventory.reservedStock - quantity,
        );
      }
    }

    // Reduce total stock and update delivered count
    inventory.totalStock = Math.max(0, inventory.totalStock - quantity);
    inventory.deliveredStock += quantity;
    inventory.lastUpdated = new Date();
    await inventory.save();

    console.log(
      `📦 Inventory updated on delivery: Delivered ${quantity} cans. Total: ${inventory.totalStock}, Available: ${inventory.availableStock}, Reserved: ${inventory.reservedStock}`,
    );

    // Check for low stock
    if (inventory.availableStock < inventory.lowStockThreshold) {
      console.warn(
        `⚠️ LOW STOCK ALERT: Available stock (${inventory.availableStock}) is below threshold (${inventory.lowStockThreshold})`,
      );
    }
  } catch (error: any) {
    console.error("Error updating inventory on order delivery:", error);
    // Don't throw - inventory update shouldn't block order delivery
  }
}

// Helper function to update inventory when order is cancelled
async function updateInventoryOnOrderCancel(
  quantity: number,
  previousStatus: string,
) {
  try {
    const inventory = await Inventory.findOne();
    if (!inventory) return;

    // If order was accepted/out_for_delivery, release reserved stock back to available
    if (
      previousStatus === "accepted" ||
      previousStatus === "out_for_delivery"
    ) {
      if (inventory.reservedStock >= quantity) {
        inventory.reservedStock -= quantity;
        inventory.availableStock += quantity;
        inventory.lastUpdated = new Date();
        await inventory.save();
        console.log(
          `📦 Inventory updated on cancel: Released ${quantity} cans. Available: ${inventory.availableStock}, Reserved: ${inventory.reservedStock}`,
        );
      }
    }
  } catch (error: any) {
    console.error("Error updating inventory on order cancel:", error);
  }
}

// Helper function to update driver's inventory (cans in hand)
async function updateDriverInventory(
  staffId: mongoose.Types.ObjectId,
  quantity: number,
  action: "pickup" | "deliver" | "return",
) {
  try {
    const staff = await Staff.findOne({ userId: staffId });
    if (!staff) {
      console.warn(`Staff not found for userId: ${staffId}`);
      return;
    }

    if (action === "pickup") {
      // Driver picks up cans from factory
      staff.cansInHand = (staff.cansInHand || 0) + quantity;
      console.log(
        `🚚 Driver ${staff.name} picked up ${quantity} cans. Total cans in hand: ${staff.cansInHand}`,
      );
    } else if (action === "deliver") {
      // Driver delivers cans to customer
      if (staff.cansInHand >= quantity) {
        staff.cansInHand = staff.cansInHand - quantity;
        console.log(
          `✅ Driver ${staff.name} delivered ${quantity} cans. Remaining cans in hand: ${staff.cansInHand}`,
        );
      } else {
        console.warn(
          `⚠️ Driver ${staff.name} tried to deliver ${quantity} cans but only has ${staff.cansInHand} cans in hand`,
        );
        staff.cansInHand = Math.max(0, staff.cansInHand - quantity); // Prevent negative
      }
    } else if (action === "return") {
      // Return cans (e.g., on cancellation after pickup)
      if (staff.cansInHand >= quantity) {
        staff.cansInHand = staff.cansInHand - quantity;
        console.log(
          `🔄 Driver ${staff.name} returned ${quantity} cans. Remaining cans in hand: ${staff.cansInHand}`,
        );
      }
    }

    await staff.save();
  } catch (error: any) {
    console.error("Error updating driver inventory:", error);
    // Don't throw - driver inventory update shouldn't block order status update
  }
}
