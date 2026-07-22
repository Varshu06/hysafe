import { Response } from 'express';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Staff } from '../models/Staff.model';
import { Order } from '../models/Order.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/bcrypt.util';

const toObject = (doc: any) => (doc?.toObject ? doc.toObject() : doc);

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const query: any = { role: 'customer' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userIds = users.map((user) => user._id);
    const profiles = await CustomerProfile.find({ userId: { $in: userIds } });
    const profileMap = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));

    const data = users.map((user) => {
      const profile = profileMap.get(user._id.toString());
      const userData = toObject(user);
      const profileData = toObject(profile);

      return {
        ...userData,
        ...(profileData || {}),
      };
    });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      data,
      total,
    });
  } catch (error: any) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get customers',
    });
  }
};

export const getCustomerStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalCustomers, activeCustomers, customersWithProfiles] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', isActive: true }),
      CustomerProfile.countDocuments(),
    ]);

    res.json({
      success: true,
      message: 'Customer stats retrieved successfully',
      data: {
        totalCustomers,
        activeCustomers,
        customersWithProfiles,
      },
    });
  } catch (error: any) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get customer stats',
    });
  }
};

export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const query: any = { role: 'staff' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userIds = users.map((user) => user._id);
    const staffProfiles = await Staff.find({ userId: { $in: userIds } });
    const staffMap = new Map(staffProfiles.map((staff) => [staff.userId.toString(), staff]));

    const data = users.map((user) => {
      const staffProfile = staffMap.get(user._id.toString());
      const userData = toObject(user);
      const staffData = toObject(staffProfile);

      return {
        ...userData,
        ...(staffData || {}),
      };
    });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      message: 'Staff retrieved successfully',
      data,
      total,
    });
  } catch (error: any) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get staff',
    });
  }
};

export const getStaffStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalStaff, activeStaff, onlineStaff] = await Promise.all([
      User.countDocuments({ role: 'staff' }),
      User.countDocuments({ role: 'staff', isActive: true }),
      Staff.countDocuments({ isOnline: true }),
    ]);

    res.json({
      success: true,
      message: 'Staff stats retrieved successfully',
      data: {
        totalStaff,
        activeStaff,
        onlineStaff,
      },
    });
  } catch (error: any) {
    console.error('Get staff stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get staff stats',
    });
  }
};

export const getDashboardSummary = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalCustomers, totalStaff, activeDeliveries, totalOrders] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'staff' }),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Order.countDocuments({}),
    ]);

    res.json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: {
        totalCustomers,
        totalStaff,
        activeDeliveries,
        totalOrders,
      },
    });
  } catch (error: any) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get dashboard summary',
    });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let user: any = await User.findOne({ _id: id, role: 'customer' }).select('-password');

    if (!user) {
      const profileById = await CustomerProfile.findById(id);
      if (profileById) {
        user = await User.findOne({ _id: profileById.userId, role: 'customer' }).select('-password');
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const profile = await CustomerProfile.findOne({ userId: user._id });

    res.json({
      success: true,
      message: 'Customer retrieved successfully',
      data: {
        ...toObject(user),
        ...(toObject(profile) || {}),
      },
    });
  } catch (error: any) {
    console.error('Get customer by id error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get customer',
    });
  }
};

export const getCustomerOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    let user: any = await User.findOne({ _id: id, role: 'customer' }).select('_id name phone email');

    if (!user) {
      const profileById = await CustomerProfile.findById(id);
      if (profileById) {
        user = await User.findOne({ _id: profileById.userId, role: 'customer' }).select('_id name phone email');
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const orders = await Order.find({ customerId: user._id })
      .populate('assignedStaffId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      message: 'Customer orders retrieved successfully',
      data: orders,
      total: await Order.countDocuments({ customerId: user._id }),
    });
  } catch (error: any) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get customer orders',
    });
  }
};

const resolveStaffUser = async (id: string) => {
  let user = await User.findOne({ _id: id, role: 'staff' });

  if (user) {
    return user;
  }

  const staffByProfileId = await Staff.findById(id);
  if (!staffByProfileId) {
    return null;
  }

  user = await User.findOne({ _id: staffByProfileId.userId, role: 'staff' });
  return user;
};

export const getStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await resolveStaffUser(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    const staffProfile = await Staff.findOne({ userId: user._id });

    res.json({
      success: true,
      message: 'Staff retrieved successfully',
      data: {
        ...toObject(user),
        ...(toObject(staffProfile) || {}),
      },
    });
  } catch (error: any) {
    console.error('Get staff by id error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get staff',
    });
  }
};

export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, password, isOnline } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone and password are required',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email: String(email).toLowerCase() }] : [])],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone or email already exists',
      });
    }

    const hashedPassword = await hashPassword(String(password));

    const user = await User.create({
      name,
      email: email ? String(email).toLowerCase() : undefined,
      phone,
      password: hashedPassword,
      role: 'staff',
      isActive: true,
    });

    const staffProfile = await Staff.create({
      userId: user._id,
      name,
      phone,
      isOnline: !!isOnline,
      cansInHand: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: {
        ...toObject(user),
        ...toObject(staffProfile),
      },
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create staff',
    });
  }
};

export const updateStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, isOnline, isActive } = req.body;

    const user = await resolveStaffUser(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone, _id: { $ne: user._id } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone already exists',
        });
      }
    }

    if (email && String(email).toLowerCase() !== (user.email || '').toLowerCase()) {
      const existingEmail = await User.findOne({
        email: String(email).toLowerCase(),
        _id: { $ne: user._id },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email ? String(email).toLowerCase() : undefined;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = !!isActive;
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters',
        });
      }
      user.password = await hashPassword(String(password));
    }
    await user.save();

    const staffProfile = await Staff.findOneAndUpdate(
      { userId: user._id },
      {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(isOnline !== undefined && { isOnline: !!isOnline }),
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Staff updated successfully',
      data: {
        ...toObject(user),
        ...(toObject(staffProfile) || {}),
      },
    });
  } catch (error: any) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update staff',
    });
  }
};

export const deleteStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await resolveStaffUser(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    await Promise.all([
      Staff.deleteOne({ userId: user._id }),
      User.deleteOne({ _id: user._id, role: 'staff' }),
      Order.updateMany(
        { assignedStaffId: user._id },
        { $unset: { assignedStaffId: '' }, $set: { status: 'pending' } }
      ),
    ]);

    res.json({
      success: true,
      message: 'Staff deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete staff',
    });
  }
};