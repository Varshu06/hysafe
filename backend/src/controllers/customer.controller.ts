import { Response } from 'express';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { AuthRequest } from '../middleware/auth.middleware';

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



