import { Response } from 'express';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Order } from '../models/Order.model';
import { RecurringDelivery } from '../models/RecurringDelivery.model';
import { LoginActivity } from '../models/LoginActivity.model';
import { Otp } from '../models/Otp.model';
import { Staff } from '../models/Staff.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { runTransaction } from '../utils/transaction.util';

// Update customer profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    // Only allow customers to update their own profile
    if (user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can update their profile' });
    }

    const { name, email, customerType, paymentTerms } = req.body;

    // Validate customer type if provided
    if (customerType && !['home', 'shop', 'hotel', 'bank', 'event'].includes(customerType)) {
      return res.status(400).json({ message: 'Invalid customer type' });
    }

    // Validate payment terms if provided
    if (paymentTerms && !['one-time', 'weekly', 'monthly'].includes(paymentTerms)) {
      return res.status(400).json({ message: 'Invalid payment terms' });
    }

    // Update user data (name, email)
    const updateUserData: any = {};
    if (name !== undefined) updateUserData.name = name;
    if (email !== undefined) updateUserData.email = email?.toLowerCase();

    if (Object.keys(updateUserData).length > 0) {
      await User.findByIdAndUpdate(user._id, updateUserData);
    }

    // Update or create customer profile
    const updateProfileData: any = {};
    if (name !== undefined) updateProfileData.name = name;
    if (customerType !== undefined) updateProfileData.customerType = customerType;
    if (paymentTerms !== undefined) updateProfileData.paymentTerms = paymentTerms;

    let profile = await CustomerProfile.findOne({ userId: user._id });
    
    if (profile) {
      // Update existing profile
      await CustomerProfile.findByIdAndUpdate(profile._id, updateProfileData);
    } else {
      // Create new profile if it doesn't exist
      profile = await CustomerProfile.create({
        userId: user._id,
        name: name || user.name,
        address: 'Address not provided', // Default, can be updated later
        customerType: customerType || 'home',
        paymentTerms: paymentTerms || 'one-time',
        defaultPaymentMethod: 'offline',
      });
    }

    // Get updated user and profile
    const updatedUser = await User.findById(user._id);
    const updatedProfile = await CustomerProfile.findOne({ userId: user._id });

    const { password: _, ...userResponse } = updatedUser!.toObject();

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...userResponse,
        ...(updatedProfile?.toObject() || {}),
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
};

// Get customer profile (can be used if needed separately)
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access this endpoint' });
    }

    const profile = await CustomerProfile.findOne({ userId: user._id });
    const { password: _, ...userResponse } = user.toObject();

    res.json({
      user: {
        ...userResponse,
        ...(profile?.toObject() || {}),
      },
    });
  } catch (error: any) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to get profile' });
  }
};

/**
 * Delete user account and associated personal records.
 * Securely operates strictly on req.user._id (derived from verified JWT).
 * Protects active in-flight orders and prevents admin self-deletion.
 */
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Disallow admin self-deletion via self-service endpoint
    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Admin accounts cannot be deleted via self-service. Please contact system management.',
      });
    }

    const userId = user._id;

    // Guard: Prevent deletion if there are active in-flight orders
    if (user.role === 'customer') {
      const activeOrdersCount = await Order.countDocuments({
        customerId: userId,
        status: { $in: ['pending', 'accepted', 'out_for_delivery'] },
      });

      if (activeOrdersCount > 0) {
        return res.status(400).json({
          message:
            'Cannot delete account while you have active orders in progress. Please wait until your orders are delivered or cancelled.',
        });
      }
    } else if (user.role === 'staff') {
      const activeDeliveriesCount = await Order.countDocuments({
        assignedStaffId: userId,
        status: { $in: ['accepted', 'out_for_delivery'] },
      });

      if (activeDeliveriesCount > 0) {
        return res.status(400).json({
          message:
            'Cannot delete staff account while you have active deliveries assigned.',
        });
      }
    }

    // Execute cascading deletion within a transaction (with standalone fallback)
    await runTransaction(async (session) => {
      // 1. Delete customer profile
      await CustomerProfile.deleteMany({ userId }, { session });

      // 2. Delete recurring deliveries to prevent automated ghost orders
      await RecurringDelivery.deleteMany({ customerId: userId }, { session });

      // 3. Delete login activity audit history (user privacy / right to be forgotten)
      await LoginActivity.deleteMany({ userId }, { session });

      // 4. Delete OTP records for user's phone / email
      const identifiers = [user.phone, user.email].filter(Boolean);
      if (identifiers.length > 0) {
        await Otp.deleteMany({ identifier: { $in: identifiers } }, { session });
      }

      // 5. If staff, clean up Staff document
      if (user.role === 'staff') {
        await Staff.deleteMany({ userId }, { session });
      }

      // 6. Delete core User document
      await User.findByIdAndDelete(userId, { session });
    });

    console.log(`[HySafe] Successfully deleted account for user ID: ${userId} (${user.phone})`);

    return res.status(200).json({
      success: true,
      message: 'Your account and personal data have been permanently deleted.',
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      message: error.message || 'Failed to delete account. Please try again.',
    });
  }
};




