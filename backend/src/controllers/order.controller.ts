import { Response } from "express";
import { Order } from "../models/Order.model";
import { CustomerProfile } from "../models/CustomerProfile.model";
import { User } from "../models/User.model";
import { Staff } from "../models/Staff.model";
import { Inventory } from "../models/Inventory.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { emitNewOrder } from "../services/socket.service";
import { sendNotificationToStaff } from "../services/notification.service";

// Create order
export const createOrder = async (req: AuthRequest, res: Response) => {
  interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    deliveryCharge: number;
  }

  try {
    const {
      quantity,
      items,
      deliveryAddress,
      location,
      paymentMethod,
      notes,
      deliverySlot,
      isEventOrder,
      eventName,
      receiverName,
      receiverPhone,
      paymentTerms,
    } = req.body;

    const customerId = req.user._id;

    // Validation
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    // Get customer profile
    const profile = await CustomerProfile.findOne({ userId: customerId });

    const normalizedItems = items.map((item: any, index: number) => {
      const price = Number(item.price);
      const deliveryCharge = Number(
        item.deliveryCharge ?? item.deliveryCharges ?? 0,
      );
      const quantity = Number(item.quantity);

      if (
        !item.productId ||
        !item.productName ||
        !Number.isFinite(price) ||
        !Number.isFinite(deliveryCharge) ||
        !Number.isFinite(quantity) ||
        quantity < 1
      ) {
        throw new Error(`Invalid item at index ${index}`);
      }

      return {
        productId: String(item.productId),
        productName: String(item.productName),
        quantity,
        price,
        deliveryCharge,
      } as OrderItem;
    });

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    const totalPrice = normalizedItems.reduce(
      (total: number, item: OrderItem) =>
        total + (item.price + item.deliveryCharge) * item.quantity,
      0,
    );

    if (!Number.isFinite(totalPrice)) {
      return res.status(400).json({ message: "Invalid order total" });
    }

    // Create order
    const order = await Order.create({
      customerId,
      customerProfileId: profile?._id,
      quantity,
      items: normalizedItems,
      totalPrice,
      price: totalPrice,
      status: "pending",
      paymentMethod:
        paymentMethod || profile?.defaultPaymentMethod || "offline",
      paymentStatus: paymentMethod === "online" ? "pending" : "pending",
      deliveryAddress,
      location,
      notes,
      deliverySlot: deliverySlot ? new Date(deliverySlot) : undefined,
      isEventOrder: isEventOrder || false,
      eventName,
      receiverName: receiverName || profile?.name || req.user.name,
      receiverPhone: receiverPhone || req.user.phone,
      paymentTerms: paymentTerms || profile?.paymentTerms || "one-time",
    });

    // Populate order for socket emission
    const populatedOrder = await Order.findById(order._id).populate(
      "customerId",
      "name phone",
    );

    // Emit socket event for new order
    if (populatedOrder) {
      emitNewOrder(populatedOrder);
      // Send push notification to online staff
      await sendNotificationToStaff(populatedOrder);
    }

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to create order" });
  }
};

// Get my orders (customer)
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.role === "admin") {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const skip = Math.max(Number(req.query.skip) || 0, 0);
      const status =
        typeof req.query.status === "string" ? req.query.status : "";

      const query: Record<string, unknown> = {};
      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate("customerId", "name phone email")
        .populate("assignedStaffId", "name phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const data = orders.map((order: any) => ({
        ...order.toObject(),
        customerName:
          order.customerId?.name || order.customerName || "Unknown Customer",
        assignedStaffName:
          order.assignedStaffId?.name || order.assignedStaffName,
      }));

      return res.json({
        success: true,
        message: "Orders retrieved successfully",
        data,
        total: await Order.countDocuments(query),
      });
    }

    const orders = await Order.find({ customerId: req.user._id })
      .populate("assignedStaffId", "name phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error: any) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: error.message || "Failed to get orders" });
  }
};

// Get order by ID
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("customerId", "name phone email")
      .populate("assignedStaffId", "name phone");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user has access to this order
    if (req.user.role === "customer") {
      // Customer can only view their own orders
      if (order.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (req.user.role === "staff") {
      // Staff can view orders assigned to them
      if (order.assignedStaffId?.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this order" });
      }
    }
    // Admin can view any order (no restriction)

    res.json(order);
  } catch (error: any) {
    console.error("Get order error:", error);
    res.status(500).json({ message: error.message || "Failed to get order" });
  }
};

// Cancel order (customer)
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Only allow cancellation if order is pending or accepted
    if (order.status !== "pending" && order.status !== "accepted") {
      return res.status(400).json({
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    // Update order status
    const previousStatus = order.status;
    order.status = "cancelled";
    await order.save();

    // Update inventory: Release reserved stock if order was accepted (not pending)
    if (previousStatus === "accepted") {
      await updateInventoryOnOrderCancel(order.quantity);
    }

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error: any) {
    console.error("Cancel order error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to cancel order" });
  }
};

export const assignOrderStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: "staffId is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const staffProfile = await Staff.findOne({
      $or: [{ _id: staffId }, { userId: staffId }],
    });

    const staffUser = await User.findOne({
      _id: staffProfile?.userId || staffId,
      role: "staff",
    }).select("_id name phone");
    if (!staffUser) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    order.assignedStaffId = staffUser._id as any;
    if (order.status === "pending") {
      order.status = "accepted";
      order.acceptedAt = order.acceptedAt || new Date();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("customerId", "name phone email")
      .populate("assignedStaffId", "name phone");

    res.json({
      success: true,
      message: "Staff assigned successfully",
      data: populatedOrder || order,
    });
  } catch (error: any) {
    console.error("Assign staff error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to assign staff" });
  }
};

export const updateOrderStatusByAdmin = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
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

    const previousStatus = order.status;
    order.status = status;

    if (status === "accepted" && !order.acceptedAt) {
      order.acceptedAt = new Date();
    }
    if (status === "out_for_delivery" && !order.outForDeliveryAt) {
      order.outForDeliveryAt = new Date();
    }
    if (status === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("customerId", "name phone email")
      .populate("assignedStaffId", "name phone");

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: populatedOrder || order,
    });
  } catch (error: any) {
    console.error("Admin update order status error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to update order status" });
  }
};

// Helper function to update inventory when order is cancelled (customer cancellation)
async function updateInventoryOnOrderCancel(quantity: number) {
  try {
    const inventory = await Inventory.findOne();
    if (!inventory) return;

    // Release reserved stock back to available
    if (inventory.reservedStock >= quantity) {
      inventory.reservedStock -= quantity;
      inventory.availableStock += quantity;
      inventory.lastUpdated = new Date();
      await inventory.save();
      console.log(
        `📦 Inventory updated on cancel: Released ${quantity} cans. Available: ${inventory.availableStock}, Reserved: ${inventory.reservedStock}`,
      );
    }
  } catch (error: any) {
    console.error("Error updating inventory on order cancel:", error);
  }
}
