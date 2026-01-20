import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Staff } from '../models/Staff.model';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';
import { generateToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, name, role, customerType, address } = req.body;

    // Validation
    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email: email.toLowerCase() }] : [])],
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email: email?.toLowerCase(),
      phone,
      password: hashedPassword,
      name,
      role: role || 'customer',
    });

    // Create role-specific profile
    if (user.role === 'customer') {
      await CustomerProfile.create({
        userId: user._id,
        name: name || 'Customer',
        address: (address && address.trim()) || 'Address not provided',
        customerType: customerType || 'home',
        paymentTerms: 'one-time',
        defaultPaymentMethod: 'offline',
      });
    } else if (user.role === 'staff') {
      await Staff.create({
        userId: user._id,
        name: name || 'Staff',
        phone: user.phone,
        isOnline: false,
      });
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userResponse,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Phone or email already exists' });
    }
    res.status(500).json({ 
      message: error.message || 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: 'Phone number and password are required',
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // Get profile data
    let profile = null;
    if (user.role === 'customer') {
      profile = await CustomerProfile.findOne({ userId: user._id });
    } else if (user.role === 'staff') {
      profile = await Staff.findOne({ userId: user._id });
    }

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();

    // Merge profile data
    const userWithProfile = {
      ...userResponse,
      ...(profile?.toObject() || {}),
    };

    res.json({
      message: 'Login successful',
      token,
      user: userWithProfile,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Get role-specific profile
    let profile = null;
    if (user.role === 'customer') {
      profile = await CustomerProfile.findOne({ userId: user._id });
    } else if (user.role === 'staff') {
      profile = await Staff.findOne({ userId: user._id });
    }

    const { password: _, ...userResponse } = user.toObject();

    res.json({
      user: {
        ...userResponse,
        ...(profile?.toObject() || {}),
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to get profile' });
  }
};

