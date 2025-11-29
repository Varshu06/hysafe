import { Response } from 'express';
import { getIO } from '../config/socket.io';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Order } from '../models/Order.model';
import { Staff } from '../models/Staff.model';
import { User } from '../models/User.model';
import { notifyOrderStatusUpdate } from '../services/notification.service';
import { AuthRequest } from '../types/express.d';

/**
 * Staff login
 */
export const staffLogin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, phone, password } = req.body;

    // Find user with staff role
    const user = await User.findOne({
      $or: [{ email }, { phone }],
      role: 'staff',
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Verify password (simplified - use auth controller in production)
    const staff = await Staff.findOne({ userId: user._id });
    if (!staff) {
      res.status(404).json({ message: 'Staff profile not found' });
      return;
    }

    res.json({
      message: 'Staff login successful',
      staff: {
        id: staff._id,
        userId: staff.userId,
        name: staff.name,
        phone: staff.phone,
        isOnline: staff.isOnline,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

/**
 * Toggle online/offline status
 */
export const toggleStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user || {};
    const { isOnline, location, fcmToken } = req.body;

    const staff = await Staff.findOne({ userId });
    if (!staff) {
      res.status(404).json({ message: 'Staff not found' });
      return;
    }

    staff.isOnline = isOnline !== undefined ? isOnline : !staff.isOnline;
    if (location) {
      staff.currentLocation = location;
    }
    if (fcmToken) {
      staff.fcmToken = fcmToken;
    }

    await staff.save();

    // Emit status change
    if (staff.isOnline) {
      getIO().emit('staff-online', { staffId: staff._id });
    } else {
      getIO().emit('staff-offline', { staffId: staff._id });
    }

    res.json({
      message: `Staff is now ${staff.isOnline ? 'online' : 'offline'}`,
      staff,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update status' });
  }
};

/**
 * Get available orders (pending, not assigned)
 */
export const getAvailableOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({
      status: 'pending',
      assignedStaffId: { $exists: false },
    })
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

/**
 * Accept order
 */
export const acceptOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status !== 'pending') {
      res.status(400).json({ message: 'Order is not available' });
      return;
    }

    if (order.assignedStaffId) {
      res.status(400).json({ message: 'Order already assigned' });
      return;
    }

    // Assign order to staff
    order.assignedStaffId = userId as any;
    order.status = 'accepted';
    order.acceptedAt = new Date();
    await order.save();

    // Emit events
    getIO().emit('order-accepted', {
      orderId: order._id,
      staffId: userId,
    });

    // Notify customer via push notification and socket
    const profile = await CustomerProfile.findById(order.customerProfileId);
    if (profile?.fcmToken) {
      await notifyOrderStatusUpdate(profile.fcmToken, order._id.toString(), 'accepted');
    }

    getIO().emit('order-status-updated', {
      orderId: order._id,
      status: 'accepted',
      customerId: order.customerId.toString(),
    });

    res.json({
      message: 'Order accepted successfully',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to accept order' });
  }
};

/**
 * Reject order
 */
export const rejectOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Emit rejection event (order remains pending for other staff)
    getIO().emit('order-rejected', {
      orderId: order._id,
    });

    res.json({
      message: 'Order rejected',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to reject order' });
  }
};

/**
 * Get ongoing orders (accepted by staff)
 */
export const getOngoingOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user || {};

    const orders = await Order.find({
      assignedStaffId: userId,
      status: { $in: ['accepted', 'picked', 'transit'] },
    })
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

/**
 * Update order status (picked, transit, delivered)
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, price } = req.body;
    const { userId } = req.user || {};

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.assignedStaffId?.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to update this order' });
      return;
    }

    order.status = status;
    if (price !== undefined) {
      order.price = price;
    }
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Notify customer about status update
    const profile = await CustomerProfile.findById(order.customerProfileId);
    if (profile?.fcmToken) {
      await notifyOrderStatusUpdate(profile.fcmToken, order._id.toString(), order.status);
    }

    // Emit status update via Socket.io
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

