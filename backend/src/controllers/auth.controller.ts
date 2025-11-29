import { Response } from 'express';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { User } from '../models/User.model';
import { AuthRequest } from '../types/express.d';
import { comparePassword, hashPassword } from '../utils/bcrypt.util';
import { generateToken } from '../utils/jwt.util';

/**
 * Register new user
 */
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, phone, password, role, name, address } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      res.status(400).json({ message: 'User already exists with this email or phone' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    // FORCE ROLE TO BE CUSTOMER
    const forcedRole = 'customer';
    
    const user = await User.create({
      email,
      phone,
      password: hashedPassword,
      role: forcedRole,
    });

    // Create profile based on role (Always customer here)
    await CustomerProfile.create({
      userId: user._id,
      name: name || 'Customer',
      address: address || '',
    });

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

/**
 * Login user
 */
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      res.status(400).json({ message: 'Email or phone is required' });
      return;
    }

    // Find user
    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch user' });
  }
};

