import { Response } from 'express';
import { getIO } from '../config/socket.io';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Order } from '../models/Order.model';
import { Staff } from '../models/Staff.model';
import { notifyNewOrder, notifyOrderStatusUpdate } from '../services/notification.service';
import { AuthRequest } from '../types/express.d';

/**
 * Create new order (Customer)
 */
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { quantity, deliveryAddress, deliverySlot, paymentMethod, notes, location } = req.body;
    const customerId = req.user?.userId;

    if (!customerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get customer profile
    const profile = await CustomerProfile.findOne({ userId: customerId });
    if (!profile) {
      res.status(404).json({ message: 'Customer profile not found' });
      return;
    }

    // Create order
    const order = await Order.create({
      customerId,
      customerProfileId: profile._id,
      quantity,
      pickupAddress: 'Warehouse Address', // Default pickup
      deliveryAddress,
      deliverySlot: deliverySlot ? new Date(deliverySlot) : undefined,
      paymentMethod: paymentMethod || 'offline',
      notes,
      location,
      status: 'pending',
    });

    // Notify all online staff about new order
    const onlineStaff = await Staff.find({ isOnline: true }).select('fcmToken');
    const fcmTokens = onlineStaff.map((s) => s.fcmToken).filter((token) => token) as string[];

    if (fcmTokens.length > 0) {
      await notifyNewOrder(
        fcmTokens,
        order._id.toString(),
        order.quantity,
        order.deliveryAddress
      );
    }

    // Also emit via Socket.io (real-time)
    getIO().emit('new-order', {
      orderId: order._id,
      quantity: order.quantity,
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      location: order.location,
      createdAt: order.createdAt,
    });

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create order' });
  }
};

/**
 * Get orders (role-based)
 */
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, userId } = req.user || {};
    let orders;

    if (role === 'customer') {
      orders = await Order.find({ customerId: userId })
        .populate('assignedStaffId', 'email phone')
        .sort({ createdAt: -1 });
    } else if (role === 'staff') {
      orders = await Order.find({ assignedStaffId: userId })
        .populate('customerId', 'email phone')
        .sort({ createdAt: -1 });
    } else if (role === 'admin') {
      orders = await Order.find()
        .populate('customerId', 'email phone')
        .populate('assignedStaffId', 'email phone')
        .sort({ createdAt: -1 });
    } else {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user || {};

    const order = await Order.findById(id)
      .populate('customerId', 'email phone')
      .populate('assignedStaffId', 'email phone');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check access
    if (role === 'customer' && order.customerId.toString() !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (role === 'staff' && order.assignedStaffId?.toString() !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    res.json({ order });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch order' });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId } = req.user || {};

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Update status
    order.status = status;
    if (status === 'accepted') {
      order.acceptedAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Notify customer about status update
    const profile = await CustomerProfile.findById(order.customerProfileId);
    if (profile?.fcmToken) {
      await notifyOrderStatusUpdate(profile.fcmToken, order._id.toString(), order.status);
    }

    // Also emit via Socket.io (real-time)
    getIO().emit('order-status-updated', {
      orderId: order._id,
      status: order.status,
      customerId: order.customerId.toString(),
    });

    res.json({
      message: 'Order status updated',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update order' });
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user || {};

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check access - customer can only cancel their own orders
    if (role === 'customer' && order.customerId.toString() !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Only allow cancellation if order is pending or accepted
    if (order.status !== 'pending' && order.status !== 'accepted') {
      res.status(400).json({ message: 'Cannot cancel order in current status' });
      return;
    }

    order.status = 'cancelled';
    await order.save();

    // Emit cancellation event
    getIO().emit('order-status-updated', {
      orderId: order._id,
      status: 'cancelled',
      customerId: order.customerId.toString(),
    });

    res.json({
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel order' });
  }
};

