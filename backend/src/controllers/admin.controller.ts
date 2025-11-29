import { Response } from 'express';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Inventory } from '../models/Inventory.model';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { Staff } from '../models/Staff.model';
import { User } from '../models/User.model';
import { AuthRequest } from '../types/express.d';
import { hashPassword } from '../utils/bcrypt.util';

/**
 * Get dashboard stats
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      todayOrders,
      totalRevenue,
      totalCustomers,
      totalStaff,
      onlineStaff,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CustomerProfile.countDocuments(),
      Staff.countDocuments(),
      Staff.countDocuments({ isOnline: true }),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        todayOrders,
        totalRevenue: revenue,
        totalCustomers,
        totalStaff,
        onlineStaff,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard' });
  }
};

/**
 * Get all orders with filters
 */
export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, staffId, customerId, startDate, endDate } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (staffId) filter.assignedStaffId = staffId;
    if (customerId) filter.customerId = customerId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'email phone')
      .populate('assignedStaffId', 'email phone')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

/**
 * Assign order to staff (manual assignment)
 */
export const assignOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status !== 'pending') {
      res.status(400).json({ message: 'Order is not available for assignment' });
      return;
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      res.status(404).json({ message: 'Staff not found' });
      return;
    }

    order.assignedStaffId = staffId as any;
    order.status = 'accepted';
    order.acceptedAt = new Date();
    await order.save();

    res.json({
      message: 'Order assigned successfully',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to assign order' });
  }
};

/**
 * Get all staff
 */
export const getAllStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await Staff.find()
      .populate('userId', 'email phone isActive')
      .sort({ createdAt: -1 });

    res.json({ staff });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch staff' });
  }
};

/**
 * Create user (Staff or Admin)
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, phone, password, name, role, vehicleType } = req.body;

    if (!['staff', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Invalid role. Allowed: staff, admin' });
      return;
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Create user
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      email,
      phone,
      password: hashedPassword,
      role: role, // staff or admin
    });

    // Create specific profile based on role
    if (role === 'staff') {
        await Staff.create({
            userId: user._id,
            name: name || 'Staff Member',
            phone,
            vehicleType,
            isOnline: false,
        });
    }
    // Admin doesn't need a separate profile model for now, but we could create one if needed.
    // Assuming Admin info is self-contained in User or we don't need extra profile yet.

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        name: name,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create user' });
  }
};

/**
 * Get inventory
 */
export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inventory = await Inventory.find()
      .sort({ date: -1 })
      .limit(30); // Last 30 days

    res.json({ inventory });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch inventory' });
  }
};

/**
 * Update inventory
 */
export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, totalCans, deliveredCans, pendingCans, returnedCans, notes } = req.body;
    const { userId } = req.user || {};

    const inventory = await Inventory.create({
      date: date ? new Date(date) : new Date(),
      totalCans,
      deliveredCans,
      pendingCans,
      returnedCans,
      notes,
      updatedBy: userId as any,
    });

    res.json({
      message: 'Inventory updated successfully',
      inventory,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update inventory' });
  }
};

/**
 * Get payment summary
 */
export const getPaymentSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const payments = await Payment.find(filter)
      .populate('orderId')
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 })
      .limit(100);

    const summary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ payments, summary });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch payments' });
  }
};

/**
 * Get all customers
 */
export const getAllCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customers = await CustomerProfile.find()
      .populate('userId', 'email phone isActive')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ customers });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch customers' });
  }
};

