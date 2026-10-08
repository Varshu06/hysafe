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
import { notifyOrderCreated, notifyCustomerOrderStatus } from "../services/inAppNotification.service";
import { runTransaction } from "../utils/transaction.util";
import { shouldAutoMarkOrderPaidOnDelivery } from "../services/recurringBilling.service";
import { getProductAvailabilityState } from "../services/productAvailability.service";
import {
  reserveInventoryAtomic,
  restoreInventoryAtomic,
  validateStatusTransition,
} from "../utils/orderInventory.util";
import { assessDeliveryLocation, serviceAreaFromEnv } from "../services/deliveryArea.policy";

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
      isRecurring,
      recurringDeliveryId,
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

      const availabilityState = getProductAvailabilityState(inventoryItem, quantity);
      if (availabilityState === "coming_soon") {
        return res.status(400).json({ code: "PRODUCT_COMING_SOON", message: `Product "${inventoryItem.name}" is coming soon` });
      }

      if (availabilityState === "unavailable" && inventoryItem.available !== true) {
        return res.status(400).json({ message: `Product "${inventoryItem.name}" is currently unavailable` });
      }

      if (availabilityState === "unavailable") {
        return res.status(400).json({
          code: "INSUFFICIENT_STOCK",
          message: `Insufficient stock for "${inventoryItem.name}". Requested: ${quantity}, Available: ${Number(inventoryItem.quantity) || 0}`,
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

    const deliveryArea = assessDeliveryLocation(location, serviceAreaFromEnv(process.env));
    if (!deliveryArea.ok) {
      return res.status(deliveryArea.status).json({ message: deliveryArea.message });
    }
    const storedLocation = deliveryArea.location;

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
      location: storedLocation,
      notes,
      deliverySlot: deliverySlot ? new Date(deliverySlot) : undefined,
      isEventOrder: Boolean(isEventOrder),
      eventName,
      isRecurring: Boolean(isRecurring),
      recurringDeliveryId: recurringDeliveryId && mongoose.Types.ObjectId.isValid(recurringDeliveryId)
        ? new mongoose.Types.ObjectId(recurringDeliveryId)
        : undefined,
      receiverName: receiverName || profile?.name || req.user.name,
      receiverPhone: receiverPhone || req.user.phone,
      // One-time checkout is always COD; only recurring-generated orders carry plan billing terms.
      paymentTerms: isRecurring ? (paymentTerms || "one-time") : "one-time",
    });

    const populatedOrder = await Order.findById(order._id).populate(
      "customerId",
      "name phone",
    );
    void notifyOrderCreated(order);

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
      .populate("assignedStaffId", "name phone")
      .populate("recurringBillId", "amount status paymentMethod preferredPaymentMethod");

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
    void notifyCustomerOrderStatus(resultOrder, "order_cancelled");

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

    if (previousStatus === "pending" && populatedOrder) {
      void notifyCustomerOrderStatus(populatedOrder, "order_accepted");
    }

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
        // A recurring delivery belongs to a recurring bill. Delivery completion
        // must not record collection of that bill as payment.
        if (shouldAutoMarkOrderPaidOnDelivery(order.isRecurring)) timestamps.paymentStatus = "paid";
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
      const notificationTypes: Record<string, "order_accepted" | "order_cancelled" | "order_out_for_delivery" | "order_delivered"> = {
        accepted: "order_accepted",
        cancelled: "order_cancelled",
        out_for_delivery: "order_out_for_delivery",
        delivered: "order_delivered",
      };
      const notificationType = notificationTypes[status];
      if (notificationType) void notifyCustomerOrderStatus(populatedOrder, notificationType);
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
    const queryString = (value: unknown) => typeof value === "string" ? value : undefined;
    const parseDateOnly = (value: unknown): Date | null => {
      const text = queryString(value);
      const match = text?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const date = new Date(year, month, day);
      return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
        ? date
        : null;
    };
    const addLocalDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    const localDateKey = (date: Date) => [
      date.getFullYear().toString().padStart(4, "0"),
      (date.getMonth() + 1).toString().padStart(2, "0"),
      date.getDate().toString().padStart(2, "0"),
    ].join("-");
    const localDayCount = (start: Date, endExclusive: Date) => {
      const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
      const endUtc = Date.UTC(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate());
      return Math.round((endUtc - startUtc) / 86_400_000);
    };
    const weekStart = (date: Date) => addLocalDays(date, -((date.getDay() + 6) % 7));
    const isoWeekKey = (date: Date) => {
      const isoDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      isoDate.setUTCDate(isoDate.getUTCDate() + 4 - (isoDate.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(isoDate.getUTCFullYear(), 0, 1));
      const week = Math.ceil(((isoDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
      return `${isoDate.getUTCFullYear()}-${week.toString().padStart(2, "0")}`;
    };

    const period = queryString(req.query.period) || "weekly";
    if (!["daily", "weekly", "monthly", "custom"].includes(period)) {
      return res.status(400).json({ message: "Invalid chart period" });
    }

    let periodStart: Date;
    let periodEndExclusive: Date;
    if (period === "custom") {
      const start = parseDateOnly(req.query.startDate);
      const end = parseDateOnly(req.query.endDate);
      if (!start || !end || start > end) {
        return res.status(400).json({ message: "A valid custom date range is required" });
      }
      periodStart = start;
      periodEndExclusive = addLocalDays(end, 1);
    } else {
      const anchor = req.query.anchorDate === undefined
        ? new Date()
        : parseDateOnly(req.query.anchorDate);
      if (!anchor) return res.status(400).json({ message: "Invalid chart anchor date" });

      if (period === "daily") {
        periodStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
        periodEndExclusive = addLocalDays(periodStart, 1);
      } else if (period === "weekly") {
        periodStart = weekStart(anchor);
        periodEndExclusive = addLocalDays(periodStart, 7);
      } else {
        periodStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        periodEndExclusive = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
      }
    }

    const periodEnd = addLocalDays(periodEndExclusive, -1);
    const dayCount = localDayCount(periodStart, periodEndExclusive);
    const granularity = period === "daily"
      ? "four-hours"
      : period === "weekly" || period === "monthly"
        ? "day"
        : dayCount <= 62
          ? "day"
          : dayCount <= 731
            ? "week"
            : dayCount <= 3650
            ? "month"
              : "year";
    const yearSpan = periodEndExclusive.getFullYear() - periodStart.getFullYear() + 1;
    const yearStep = granularity === "year" ? Math.max(1, Math.ceil(yearSpan / 90)) : 1;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const dateString = (format: string) => ({
      $dateToString: { format, date: "$createdAt", timezone },
    });
    const groupKey = granularity === "four-hours"
      ? { $floor: { $divide: [{ $hour: { date: "$createdAt", timezone } }, 4] } }
      : granularity === "day"
        ? dateString("%Y-%m-%d")
        : granularity === "week"
          ? dateString("%G-%V")
          : granularity === "month"
            ? dateString("%Y-%m")
            : yearStep === 1
              ? dateString("%Y")
              : {
                  $multiply: [
                    { $floor: { $divide: [{ $year: { date: "$createdAt", timezone } }, yearStep] } },
                    yearStep,
                  ],
                };

    const aggregates = await Order.aggregate([
      { $match: { createdAt: { $gte: periodStart, $lt: periodEndExclusive } } },
      {
        $group: {
          _id: groupKey,
          orders: { $sum: 1 },
          // Preserve the dashboard's established revenue definition: delivered order totals.
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                { $ifNull: ["$totalPrice", 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const aggregateByKey = new Map(aggregates.map(item => [String(item._id), item]));
    const buckets: Array<{ key: string; label: string }> = [];
    if (granularity === "four-hours") {
      for (let index = 0; index < 6; index += 1) {
        buckets.push({ key: String(index), label: ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"][index] });
      }
    } else {
      let cursor = new Date(periodStart);
      if (granularity === "week") cursor = weekStart(cursor);
      if (granularity === "month") cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      if (granularity === "year") {
        cursor = new Date(Math.floor(cursor.getFullYear() / yearStep) * yearStep, 0, 1);
      }

      while (cursor < periodEndExclusive) {
        let key: string;
        let label: string;
        if (granularity === "day") {
          key = localDateKey(cursor);
          label = period === "weekly"
            ? cursor.toLocaleDateString("en-GB", { weekday: "short" })
            : period === "monthly"
              ? String(cursor.getDate())
              : cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        } else if (granularity === "week") {
          key = isoWeekKey(cursor);
          label = cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        } else if (granularity === "month") {
          key = `${cursor.getFullYear()}-${(cursor.getMonth() + 1).toString().padStart(2, "0")}`;
          label = cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        } else {
          const year = cursor.getFullYear();
          key = String(year);
          label = yearStep === 1 ? key : `${year}–${year + yearStep - 1}`;
        }
        buckets.push({ key, label });
        cursor = granularity === "day"
          ? addLocalDays(cursor, 1)
          : granularity === "week"
            ? addLocalDays(cursor, 7)
            : granularity === "month"
              ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
              : new Date(cursor.getFullYear() + yearStep, 0, 1);
      }
    }

    const points = buckets.map(bucket => {
      const aggregate = aggregateByKey.get(bucket.key);
      return {
        date: bucket.label,
        orders: aggregate?.orders || 0,
        revenue: aggregate?.revenue || 0,
      };
    });

    res.json({
      success: true,
      data: {
        points,
        periodStart: localDateKey(periodStart),
        periodEnd: localDateKey(periodEnd),
        currentDate: localDateKey(new Date()),
        granularity,
      },
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
