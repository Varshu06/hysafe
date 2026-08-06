import { Response } from "express";
import { Order } from "../models/Order.model";
import { CustomerProfile } from "../models/CustomerProfile.model";
import { User } from "../models/User.model";
import { Staff } from "../models/Staff.model";
import { Inventory } from "../models/Inventory.model";
import { InventoryItem } from "../models/InventoryItem.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { emitNewOrder, emitOrderStatusUpdate, } from "../services/socket.service";
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

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Get customer profile
    const profile = await CustomerProfile.findOne({ userId: customerId });

    const normalizedItems: OrderItem[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index] as any;
      const quantity = Number(item.quantity);

      if (!item.productId || !Number.isFinite(quantity) || quantity < 1) {
        throw new Error(`Invalid item at index ${index}`);
      }

      const inventoryItem = await InventoryItem.findById(item.productId);

      if (!inventoryItem) {
        return res.status(400).json({ message: "Invalid productId" });
      }

      if (!inventoryItem.available || inventoryItem.quantity < quantity) {
        return res.status(400).json({ message: "Product is unavailable" });
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
      await updateInventoryOnOrderCancel(order.items);
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
    console.log("assignOrderStaff called");
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

      await reserveInventory(order.items);

      order.status = "accepted";
      order.acceptedAt = new Date();
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
    console.log("updateOrderStatusByAdmin called");
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
    // Reserve stock when order is accepted
    if (
      previousStatus === "pending" &&
      status === "accepted"
    ) {
      await reserveInventory(order.items);
    }

    // Complete delivery
    if (
      previousStatus !== "delivered" &&
      status === "delivered"
    ) {
      await completeInventoryDelivery(order.items);
    }

    // Return stock if accepted order gets cancelled
    if (
      previousStatus === "accepted" &&
      status === "cancelled"
    ) {
      await updateInventoryOnOrderCancel(order.items);
    }

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

    if (populatedOrder) {
      emitOrderStatusUpdate(populatedOrder);
    }

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
async function reserveInventory(
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
      throw new Error(`Inventory item not found: ${item.productName}`);
    }

    

    inventoryItem.quantity -= item.quantity;

    

    await inventoryItem.save();

    
  }

  
}
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
// Helper function to update inventory when order is cancelled (customer cancellation)
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