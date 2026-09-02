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
import { InventoryItem } from "../models/InventoryItem.model";

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
  console.log("===== ACCEPT ORDER API HIT =====");
  try {
    console.log("===== STAFF ACCEPT ORDER =====");
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

    // Reserve stock before changing the order state
    await reserveInventory(order.items);

    // Assign order to staff
    const staffId = req.user._id;
    order.assignedStaffId = staffId;
    order.status = "accepted";
    order.acceptedAt = new Date();
    await order.save();

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

    const totalOrderQuantity = order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    if (status === "out_for_delivery") {
      order.outForDeliveryAt = new Date();
      // Driver picks up cans: Add to driver's inventory
      await updateDriverInventory(req.user._id, totalOrderQuantity, "pickup");
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
      if (order.paymentMethod === "offline") {
        order.paymentStatus = "paid"; // Auto-mark as paid on delivery
      }

      // Driver delivers cans: Remove from driver's inventory
      await updateDriverInventory(req.user._id, totalOrderQuantity, "deliver");

      // Update inventory: no extra deduction needed because stock was already reserved
      await completeInventoryDelivery(order.items);
    } else if (status === "cancelled" && previousStatus !== "pending") {
      // If order was accepted/out_for_delivery and now cancelled, release reserved stock
      if (previousStatus === "out_for_delivery") {
        // Driver had picked up cans, return them to driver's inventory (or factory)
        await updateDriverInventory(req.user._id, totalOrderQuantity, "return");
      }
      await updateInventoryOnOrderCancel(order.items);
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
async function reserveInventory(
  items: {
    productId?: any;
    productName: string;
    quantity: number;
  }[],
) {
  for (const item of items) {
    let inventoryItem = null;

    if (item.productId) {
      inventoryItem = await InventoryItem.findById(item.productId);
    }

    if (!inventoryItem && item.productName) {
      const cleanName = item.productName.trim();
      inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(`^${cleanName}$`, "i") },
      });
    }

    if (!inventoryItem && item.productName) {
      const firstWord = item.productName.trim().split(" ")[0];
      inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(firstWord, "i") },
      });
    }

    if (!inventoryItem) {
      inventoryItem = await InventoryItem.findOne({ available: true });
    }

    if (inventoryItem) {
      inventoryItem.quantity = Math.max(0, inventoryItem.quantity - item.quantity);
      inventoryItem.lastRestocked = new Date();
      await inventoryItem.save();
      console.log(`Reserved ${item.quantity} units from inventory item ${inventoryItem.name}`);
    } else {
      console.warn(`Could not find inventory item for reservation: ${item.productName}`);
    }
  }
}

// Helper function to update inventory when order is delivered
async function completeInventoryDelivery(
  items: {
    productName: string;
    quantity: number;
  }[],
) {
  // Stock was already deducted when the order was accepted.
  // Nothing more needs to be deducted on delivery.
  console.log(
    `Order delivered. Inventory already updated during acceptance.`,
  );
}

// Helper function to update inventory when order is cancelled
async function updateInventoryOnOrderCancel(
  items: {
    productName: string;
    quantity: number;
  }[],
) {
  for (const item of items) {
    const inventoryItem = await InventoryItem.findOne({
      name: item.productName,
    });

    if (!inventoryItem) {
      console.warn(
        `Inventory item not found: ${item.productName}`,
      );
      continue;
    }

    inventoryItem.quantity += item.quantity;
    inventoryItem.lastRestocked = new Date();

    await inventoryItem.save();

    console.log(
      `Returned ${item.quantity} ${item.productName} back to inventory.`,
    );
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
