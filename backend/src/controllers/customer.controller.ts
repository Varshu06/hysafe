import { Response } from 'express';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Order } from '../models/Order.model';
import { AuthRequest } from '../types/express.d';

/**
 * Get customer profile
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user || {};

    const profile = await CustomerProfile.findOne({ userId })
      .populate('userId', 'email phone');

    if (!profile) {
      res.status(404).json({ message: 'Customer profile not found' });
      return;
    }

    res.json({ profile });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch profile' });
  }
};

/**
 * Update customer profile
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user || {};
    const { name, address, customerType, paymentTerms, defaultPaymentMethod, location } = req.body;

    let profile = await CustomerProfile.findOne({ userId });

    if (!profile) {
      // Create profile if doesn't exist
      profile = await CustomerProfile.create({
        userId,
        name: name || 'Customer',
        address: address || '',
        customerType: customerType || 'regular',
        paymentTerms: paymentTerms || 'one-time',
        defaultPaymentMethod: defaultPaymentMethod || 'offline',
        location,
      });
    } else {
      // Update existing profile
      if (name) profile.name = name;
      if (address) profile.address = address;
      if (customerType) profile.customerType = customerType;
      if (paymentTerms) profile.paymentTerms = paymentTerms;
      if (defaultPaymentMethod) profile.defaultPaymentMethod = defaultPaymentMethod;
      if (location) profile.location = location;

      await profile.save();
    }

    res.json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
};

/**
 * Get customer orders
 */
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user || {};

    const orders = await Order.find({ customerId: userId })
      .populate('assignedStaffId', 'email phone')
      .sort({ createdAt: -1 });

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
    const { userId } = req.user || {};

    const order = await Order.findOne({ _id: id, customerId: userId })
      .populate('assignedStaffId', 'email phone')
      .populate('customerId', 'email phone');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch order' });
  }
};


