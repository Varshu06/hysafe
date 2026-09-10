import mongoose from "mongoose";
import { Response } from "express";
import { Order } from "../models/Order.model";
import { CustomerProfile } from "../models/CustomerProfile.model";
import { User } from "../models/User.model";
import { Staff } from "../models/Staff.model";
import { InventoryItem } from "../models/InventoryItem.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { emitNewOrder, emitOrderStatusUpdate } from "../services/socket.service";
import { sendNotificationToStaff } from "../services/notification.service";
import { runTransaction } from "../utils/transaction.util";
import {
  reserveInventoryAtomic,
  restoreInventoryAtomic,
  validateStatusTransition,
} from "../utils/orderInventory.util";

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

    if (!deliveryAddress || typeof deliveryAddress !== "string" || !deliveryAddress.trim()) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Get customer profile
    const profile = await CustomerProfile.findOne({ userId: customerId });

    const normalizedItems: OrderItem[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index] as any;
      const quantity = Number(item.quantity);
      const productIdStr = String(item.productId || "").trim();

      if (!productIdStr || !mongoose.Types.ObjectId.isValid(productIdStr)) {
        return res.status(400).json({ message: `Invalid product ID format at item index ${index}` });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: `Quantity must be a positive integer for item index ${index}` });
      }

      // Exact product ID lookup (NO name, regex, or any-product fallback)
      const inventoryItem = await InventoryItem.findById(productIdStr);

      if (!inventoryItem) {
        return res.status(400).json({ message: `Product not found for ID: ${productIdStr}` });
      }

      if (!inventoryItem.available) {
        return res.status(400).json({ message: `Product "${inventoryItem.name}" is currently unavailable` });
      }

      if (inventoryItem.quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${inventoryItem.name}". Requested: ${quantity}, Available: ${inventoryItem.quantity}`,
        });
      }

      normalizedItems.push({
        productId: String(inventoryItem._id),
        productName: inventoryItem.name,
        quantity,
        price: Number(inventoryItem.price),
        deliveryCharge: Number(inventoryItem.deliveryCharge ?? 0),
      });
    }

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Reconcile order quantity: Authoritative calculation of total order quantity
    const totalOrderQuantity = normalizedItems.reduce(
      (sum: number, item: OrderItem) => sum + item.quantity,
      0,
    );

    if (totalOrderQuantity < 1) {
      return res.status(400).json({ message: "Total order quantity must be at least 1" });
    }

    // Compute subtotal (sum of price * quantity)
    const subtotal = normalizedItems.reduce(
      (total: number, item: OrderItem) => total + item.price * item.quantity,
      0,
    );

    const orderDeliveryCharge = normalizedItems.reduce(
      (max: number, item: OrderItem) => Math.max(max, Number(item.deliveryCharge || 0)),
      0,
    );

    const totalPrice = subtotal + orderDeliveryCharge;

    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return res.status(400).json({ message: "Invalid order total price" });
    }

    // Create order (Pending state)
    const order = await Order.create({
      customerId,
      customerProfileId: profile?._id,
      quantity: totalOrderQuantity,
      items: normalizedItems,
      totalPrice,
      price: totalPrice,
      deliveryCharge: orderDeliveryCharge,
      status: "pending",
      paymentMethod: "offline", // Standard COD / offline delivery model
      paymentStatus: "pending",
      deliveryAddress,
      location,
      notes,
      deliverySlot: deliverySlot ? new Date(deliverySlot) : undefined,
      isEventOrder: Boolean(isEventOrder),
      eventName,
      receiverName: receiverName || profile?.name || req.user.name,
      receiverPhone: receiverPhone || req.user.phone,
      paymentTerms: paymentTerms || profile?.paymentTerms || "one-time",
    });

    const populatedOrder = await Order.findById(order._id).populate(
      "customerId",
      "name phone",
    );

    if (populatedOrder) {
      emitNewOrder(populatedOrder);
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

    if (!validateStatusTransition(order.status, "cancelled")) {
      return res.status(400).json({
        message: `Cannot cancel order with current status: ${order.status}`,
      });
    }

    const previousStatus = order.status;

    const resultOrder = await runTransaction(async (session) => {
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: id,
          customerId: req.user._id,
          status: previousStatus,
        },
        {
          $set: { status: "cancelled" },
        },
        { session, new: true },
      );

      if (!updatedOrder) {
        throw new Error("Order status could not be updated or was modified concurrently");
      }

      // Restore inventory atomically if order was previously accepted
      if (previousStatus === "accepted") {
        await restoreInventoryAtomic(updatedOrder.items, session);
      }

      return updatedOrder;
    });

    res.json({
      message: "Order cancelled successfully",
      order: resultOrder,
    });
  } catch (error: any) {
    console.error("Cancel order error:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to cancel order" });
  }
};

export const assignOrderStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId || typeof staffId !== "string") {
      return res.status(400).json({ message: "A valid staffId string is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const staffProfile = await Staff.findOne({
      $or: [
        ...(mongoose.Types.ObjectId.isValid(staffId) ? [{ _id: staffId }, { userId: staffId }] : []),
      ],
    });

    const staffUser = await User.findOne({
      _id: staffProfile?.userId || (mongoose.Types.ObjectId.isValid(staffId) ? staffId : null),
      role: "staff",
    }).select("_id name phone");

    if (!staffUser) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const previousStatus = order.status;

    if (previousStatus !== "pending" && !validateStatusTransition(previousStatus, "accepted")) {
      return res.status(400).json({ message: `Cannot assign staff to order in status: ${previousStatus}` });
    }

    const updatedOrder = await runTransaction(async (session) => {
      if (previousStatus === "pending") {
        // Atomically reserve inventory
        await reserveInventoryAtomic(order.items, session);
      }

      const assigned = await Order.findOneAndUpdate(
        { _id: id, status: previousStatus },
        {
          $set: {
            assignedStaffId: staffUser._id as any,
            ...(previousStatus === "pending" && {
              status: "accepted",
              acceptedAt: new Date(),
            }),
          },
        },
        { session, new: true },
      );

      if (!assigned) {
        throw new Error("Order status was updated concurrently by another request");
      }

      return assigned;
    });

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate("customerId", "name phone email")
      .populate("assignedStaffId", "name phone");

    res.json({
      success: true,
      message: "Staff assigned successfully",
      data: populatedOrder || updatedOrder,
    });
  } catch (error: any) {
    console.error("Assign staff error:", error);
    res
      .status(400)
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

    if (previousStatus === status) {
      return res.status(400).json({ message: `Order is already in status "${status}"` });
    }

    if (!validateStatusTransition(previousStatus, status)) {
      return res.status(400).json({
        message: `Invalid state transition from "${previousStatus}" to "${status}"`,
      });
    }

    const totalOrderQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const updatedOrder = await runTransaction(async (session) => {
      // 1. Stock Reservation (pending -> accepted)
      if (previousStatus === "pending" && status === "accepted") {
        await reserveInventoryAtomic(order.items, session);
      }

      // 2. Cancellation restoration
      if ((previousStatus === "accepted" || previousStatus === "out_for_delivery") && status === "cancelled") {
        await restoreInventoryAtomic(order.items, session);
      }

      // 3. Driver cansInHand side effects
      if (order.assignedStaffId) {
        if (previousStatus === "accepted" && status === "out_for_delivery") {
          await Staff.findOneAndUpdate(
            { userId: order.assignedStaffId },
            { $inc: { cansInHand: totalOrderQuantity } },
            { session },
          );
        } else if (previousStatus === "out_for_delivery" && status === "delivered") {
          await Staff.findOneAndUpdate(
            { userId: order.assignedStaffId },
            { $inc: { cansInHand: -totalOrderQuantity } },
            { session },
          );
        } else if (previousStatus === "out_for_delivery" && status === "cancelled") {
          await Staff.findOneAndUpdate(
            { userId: order.assignedStaffId },
            { $inc: { cansInHand: -totalOrderQuantity } },
            { session },
          );
        }
      }

      const timestamps: Record<string, any> = {};
      if (status === "accepted" && !order.acceptedAt) timestamps.acceptedAt = new Date();
      if (status === "out_for_delivery" && !order.outForDeliveryAt) timestamps.outForDeliveryAt = new Date();
      if (status === "delivered") {
        if (!order.deliveredAt) timestamps.deliveredAt = new Date();
        timestamps.paymentStatus = "paid";
      }

      const result = await Order.findOneAndUpdate(
        { _id: id, status: previousStatus },
        {
          $set: {
            status,
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

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate("customerId", "name phone email")
      .populate("assignedStaffId", "name phone");

    if (populatedOrder) {
      emitOrderStatusUpdate(populatedOrder);
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: populatedOrder || updatedOrder,
    });
  } catch (error: any) {
    console.error("Admin update order status error:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to update order status" });
  }
};

export const getOrderStats = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const now = new Date();

    const startOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999
    );

    // Total Stats
    const totalOrders = await Order.countDocuments();

    const totalRevenueResult = await Order.aggregate([
      {
        $match: {
          status: "delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalRevenue =
      totalRevenueResult.length > 0
        ? totalRevenueResult[0].total
        : 0;

    const activeDeliveries = await Order.countDocuments({
      status: "out_for_delivery",
    });
    const pendingOrders = await Order.countDocuments({
      status: "pending",
    });

    const acceptedOrders = await Order.countDocuments({
      status: "accepted",
    });

    const deliveredOrders = await Order.countDocuments({
      status: "delivered",
    });

    const cancelledOrders = await Order.countDocuments({
      status: "cancelled",
    });
    const totalCustomers = await User.countDocuments({
      role: "customer",
    });

    // Growth Calculation
    const currentMonthOrders = await Order.countDocuments({
      createdAt: {
        $gte: startOfCurrentMonth,
      },
    });

    const previousMonthOrders = await Order.countDocuments({
      createdAt: {
        $gte: startOfPreviousMonth,
        $lte: endOfPreviousMonth,
      },
    });

    const orderGrowth =
      previousMonthOrders === 0
        ? 0
        : Math.round(
          ((currentMonthOrders -
            previousMonthOrders) /
            previousMonthOrders) *
          100
        );
    const currentMonthRevenueResult = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: startOfCurrentMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const previousMonthRevenueResult = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: {
            $gte: startOfPreviousMonth,
            $lte: endOfPreviousMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const currentRevenue =
      currentMonthRevenueResult.length > 0
        ? currentMonthRevenueResult[0].total
        : 0;

    const previousRevenue =
      previousMonthRevenueResult.length > 0
        ? previousMonthRevenueResult[0].total
        : 0;

    const revenueGrowth =
      previousRevenue === 0
        ? 0
        : Math.round(
          ((currentRevenue - previousRevenue) / previousRevenue) * 100
        );
    const currentMonthCustomers = await User.countDocuments({
      role: "customer",
      createdAt: {
        $gte: startOfCurrentMonth,
      },
    });

    const previousMonthCustomers = await User.countDocuments({
      role: "customer",
      createdAt: {
        $gte: startOfPreviousMonth,
        $lte: endOfPreviousMonth,
      },
    });

    const customerGrowth =
      previousMonthCustomers === 0
        ? 0
        : Math.round(
          ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100);
    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        activeDeliveries,

        pendingOrders,
        acceptedOrders,
        deliveredOrders,
        cancelledOrders,

        orderGrowth,
        revenueGrowth,
        customerGrowth,
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};

export const getOrdersChart = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Create last 7 dates
    const chart: {
      date: string;
      fullDate: string;
      orders: number;
      revenue: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      chart.push({
        date: date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        fullDate: date.toISOString().split("T")[0],
        orders: 0,
        revenue: 0,
      });
    }


    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt)
        .toISOString()
        .split("T")[0];

      const index = chart.findIndex(
        (item) => item.fullDate === orderDate
      );

      if (index !== -1) {
        chart[index].orders += 1;

        // Revenue only from delivered orders
        if (order.status === "delivered") {
          chart[index].revenue += order.totalPrice;
        }
      }
    });

    res.json({
      success: true,
      data: chart.map(({ fullDate, ...rest }) => rest),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch chart data",
    });
  }
};
export const getRecentOrders = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recent orders",
    });
  }
};