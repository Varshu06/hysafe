import crypto from 'crypto';
import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Staff } from '../models/Staff.model';
import { LoginActivity } from '../models/LoginActivity.model';
import { Otp } from '../models/Otp.model';
import { sendOtpEmail } from '../services/email.service';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';
import { generateToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { normalizeIndianMobilePhone } from '../utils/phone.util';

const hashOtp = (otp: string): string => {
  const salt = process.env.OTP_SALT || 'hysafe_secure_otp_salt_2026';
  return crypto.createHash('sha256').update(otp + salt).digest('hex');
};


// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, name, customerType, address } = req.body;

    const normalizedEmail = typeof email === 'string' && email.trim()
      ? email.trim().toLowerCase()
      : undefined;
    const rawPhone = typeof phone === 'string' ? phone : String(phone || '');
    let normalizedPhone = rawPhone.replace(/\D/g, '');

    // Support inputs like +91XXXXXXXXXX by storing only the local 10-digit number.
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.slice(2);
    }

    // Validation
    if (!normalizedPhone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const duplicateFilters: Array<Record<string, string>> = [{ phone: normalizedPhone }];
    if (normalizedEmail) {
      duplicateFilters.push({ email: normalizedEmail });
    }

    const existingUser = await User.findOne({
      $or: duplicateFilters,
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userData: Record<string, any> = {
      phone: normalizedPhone,
      password: hashedPassword,
      name,
      // Public registration must never grant a privileged role. Staff accounts
      // are created through the authenticated admin staff-management endpoint.
      role: 'customer',
    };

    if (normalizedEmail) {
      userData.email = normalizedEmail;
    }

    const user = await User.create(userData);

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
    const { phone,email, password } = req.body;

    if (!phone && !email || !password) {
      return res.status(400).json({
        message: 'Phone number/email and password are required',
      });
    }

    const normalizedPhone = normalizeIndianMobilePhone(phone);
    const normalizedEmail =
      typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase()
        : undefined;

    const conditions = [];
    if (normalizedPhone) conditions.push({ phone: normalizedPhone });
    if (normalizedEmail) conditions.push({ email: normalizedEmail });

    if (conditions.length === 0) {
      return res.status(400).json({ message: 'A valid 10-digit phone number or email is required' });
    }

    // Find user by phone number or email
    const user = await User.findOne({ $or: conditions });

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

    // Track login activity
    try {
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
      const userAgent = req.get('user-agent') || 'Unknown';
      
      // Try to extract device info from user agent
      let deviceInfo = 'Unknown Device';
      if (userAgent.includes('Mobile')) {
        deviceInfo = 'Mobile Device';
      } else if (userAgent.includes('Tablet')) {
        deviceInfo = 'Tablet';
      } else if (userAgent.includes('Windows') || userAgent.includes('Mac') || userAgent.includes('Linux')) {
        deviceInfo = 'Desktop';
      }

      await LoginActivity.create({
        userId: user._id,
        deviceInfo,
        ipAddress: ipAddress.toString(),
        userAgent,
        location: 'Unknown', // Could be enhanced with IP geolocation service
        loginAt: new Date(),
      });
    } catch (activityError) {
      // Don't fail login if activity tracking fails
      console.error('Failed to track login activity:', activityError);
    }

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

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
};

// Google OAuth authentication
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ message: 'Google ID and email are required' });
    }

    // Check if user exists by Google ID or email
    let user = await User.findOne({
      $or: [
        { googleId },
        { email: email.toLowerCase() },
      ],
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }

      // Update name and picture if provided
      if (name && !user.name) {
        user.name = name;
      }
      if (picture) {
        user.picture = picture;
      }
      await user.save();
    } else {
      // Create new user with Google account
      // Generate a random phone number placeholder (user can update later)
      const randomPhone = `9${crypto.randomInt(100000000, 1000000000)}`;
      
      user = await User.create({
        email: email.toLowerCase(),
        phone: randomPhone,
        name: name || 'Google User',
        password: await hashPassword(crypto.randomBytes(16).toString('hex')), // Random password
        googleId,
        picture,
        role: 'customer',
      });


      // Create customer profile
      await CustomerProfile.create({
        userId: user._id,
        name: name || 'Google User',
        address: 'Address not provided',
        customerType: 'home',
        paymentTerms: 'one-time',
        defaultPaymentMethod: 'offline',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
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

    // Track login activity
    try {
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
      const userAgent = req.get('user-agent') || 'Unknown';
      
      let deviceInfo = 'Unknown Device';
      if (userAgent.includes('Mobile')) {
        deviceInfo = 'Mobile Device';
      } else if (userAgent.includes('Tablet')) {
        deviceInfo = 'Tablet';
      } else if (userAgent.includes('Windows') || userAgent.includes('Mac') || userAgent.includes('Linux')) {
        deviceInfo = 'Desktop';
      }

      await LoginActivity.create({
        userId: user._id,
        deviceInfo,
        ipAddress: ipAddress.toString(),
        userAgent,
        location: 'Unknown',
        loginAt: new Date(),
      });
    } catch (activityError) {
      console.error('Failed to track login activity:', activityError);
    }

    res.json({
      message: 'Google authentication successful',
      token,
      user: userWithProfile,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: error.message || 'Google authentication failed' });
  }
};

// Forgot Password - Send OTP to user's email
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;
    const identifier = (email || phone || '').trim().toLowerCase();

    if (!identifier) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    const genericSuccessResponse = {
      success: true,
      message: 'If an account exists, a verification code has been sent.',
    };

    const normalizedPhone = normalizeIndianMobilePhone(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    // Account Enumeration Prevention: Return same generic response if user doesn't exist
    if (!user) {
      console.log(`[FORGOT PASSWORD] Reset requested for non-existing identifier: ${identifier}`);
      return res.json(genericSuccessResponse);
    }

    const possibleIdentifiers = [
      user.email,
      user.phone,
      identifier,
    ].filter(Boolean) as string[];

    // Rate Limiting / Cooldown Check: Ensure 60s cooldown per user request
    const existingRecentOtp = await Otp.findOne({
      identifier: { $in: possibleIdentifiers },
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (existingRecentOtp) {
      console.log(`[FORGOT PASSWORD] Cooldown active for identifier: ${user.email || user.phone}`);
      return res.status(429).json({
        message: 'Please wait 60 seconds before requesting another verification code.',
      });
    }

    // Phone-Only User Check (No SMS provider integrated currently)
    if (!user.email && user.phone) {
      console.log(`[FORGOT PASSWORD] Reset requested for phone-only account (${user.phone}). SMS provider unavailable.`);
      return res.json(genericSuccessResponse);
    }

    const targetEmail = user.email;
    if (!targetEmail) {
      return res.json(genericSuccessResponse);
    }

    // Cryptographically secure 6-digit OTP generation using Node's crypto module
    const generatedOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(generatedOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`🔑 [FORGOT PASSWORD] New OTP generated for ${targetEmail}: ${generatedOtp} (Valid until ${expiresAt.toLocaleTimeString()})`);

    // Remove existing OTPs for this user's identifiers and store hashed OTP
    await Otp.deleteMany({ identifier: { $in: possibleIdentifiers } });
    await Otp.create({
      identifier: targetEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      isVerified: false,
    });

    // Send email with OTP code (Resend API / SMTP)
    const emailDelivered = await sendOtpEmail(targetEmail, generatedOtp);

    if (!emailDelivered) {
      // Clean up stored OTP if email delivery failed
      await Otp.deleteMany({ identifier: { $in: possibleIdentifiers } });
      return res.status(500).json({
        message: 'Password reset service is currently unavailable. Please try again later.',
      });
    }

    return res.json(genericSuccessResponse);
  } catch (error: any) {
    console.error('Forgot password error:', error.message || error);
    res.status(500).json({ message: 'Failed to process forgot password request' });
  }
};

// Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, phone, otp } = req.body;
    const identifier = (email || phone || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!identifier || !cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ message: 'A valid email/phone and 6-digit OTP code are required' });
    }

    const normalizedPhone = normalizeIndianMobilePhone(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    const possibleIdentifiers = [
      identifier,
      ...(user?.email ? [user.email] : []),
      ...(user?.phone ? [user.phone] : []),
    ];

    const otpRecord = await Otp.findOne({
      identifier: { $in: possibleIdentifiers },
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({ message: 'Maximum verification attempts exceeded. Please request a new OTP code.' });
    }

    const submittedHash = hashOtp(cleanOtp);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(otpRecord.otpHash),
      Buffer.from(submittedHash)
    );

    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return res.status(400).json({ message: 'Maximum verification attempts exceeded. Please request a new OTP code.' });
      }

      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error.message || error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// Reset Password with OTP
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, phone, otp, newPassword } = req.body;
    const identifier = (email || phone || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!identifier || !cleanOtp || !newPassword) {
      return res.status(400).json({ message: 'Email/Phone, OTP and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const normalizedPhone = normalizeIndianMobilePhone(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid request or reset code' });
    }

    const possibleIdentifiers = [
      identifier,
      ...(user.email ? [user.email] : []),
      ...(user.phone ? [user.phone] : []),
    ];

    const submittedHash = hashOtp(cleanOtp);
    console.log(`[RESET PASSWORD] Attempting reset for ${identifier} with OTP: ${cleanOtp}`);
    const otpRecord = await Otp.findOne({
      identifier: { $in: possibleIdentifiers },
      otpHash: submittedHash,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      console.warn(`[RESET PASSWORD] No matching or unexpired OTP found in DB for: ${identifier} (Submitted: ${cleanOtp})`);
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({ message: 'Maximum verification attempts exceeded. Please request a new OTP code.' });
    }

    // Atomic consumption to prevent race conditions & double-use
    const consumedOtp = await Otp.findOneAndUpdate(
      { _id: otpRecord._id, isUsed: false },
      { $set: { isUsed: true } },
      { new: true }
    );

    if (!consumedOtp) {
      return res.status(400).json({ message: 'OTP has already been used. Please request a new OTP code.' });
    }

    // Update user password with bcrypt hashing
    user.password = await hashPassword(String(newPassword));
    await user.save();

    // Invalidate / clear all OTP records for this user
    await Otp.deleteMany({ identifier: { $in: possibleIdentifiers } });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error.message || error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

