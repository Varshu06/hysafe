import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Staff } from '../models/Staff.model';
import { LoginActivity } from '../models/LoginActivity.model';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';
import { generateToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, name, role, customerType, address } = req.body;

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
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

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
      role: role || 'customer',
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
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({
        message: 'Phone number/email and password are required',
      });
    }

    let normalizedPhone = undefined;
    if (phone) {
      const rawPhone = typeof phone === 'string' ? phone : String(phone);
      normalizedPhone = rawPhone.replace(/\D/g, '');
      if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
        normalizedPhone = normalizedPhone.slice(2);
      }
    }

    const queryFilters: Array<Record<string, any>> = [];
    if (normalizedPhone) {
      queryFilters.push({ phone: normalizedPhone });
    }
    if (email) {
      queryFilters.push({ email: email.toLowerCase() });
    }

    const user = await User.findOne({ $or: queryFilters });

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
      const randomPhone = `9${Math.floor(Math.random() * 1000000000)}`;
      
      user = await User.create({
        email: email.toLowerCase(),
        phone: randomPhone,
        name: name || 'Google User',
        password: await hashPassword(Math.random().toString(36)), // Random password
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

let cachedTransporter: nodemailer.Transporter | null = null;

const getMailTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransporter;
  }

  console.log('🔄 Creating Ethereal Email test account...');
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log('✅ Ethereal Email test account created:', testAccount.user);
  return cachedTransporter;
};

const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const rawPhone = typeof phone === 'string' ? phone : String(phone || '');
    let normalizedPhone = rawPhone.replace(/\D/g, '');
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.slice(2);
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(404).json({ message: 'User with this phone number not found' });
    }

    if (!user.email) {
      return res.status(400).json({ 
        message: 'No email registered for this account. Please register an email to receive OTP.' 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 mins

    // Store in map
    otpStore.set(normalizedPhone, { code: otp, expiresAt });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #BAE6FD; border-radius: 12px; background-color: #F0F9FF;">
        <h2 style="color: #0284C7; border-bottom: 2px solid #0284C7; padding-bottom: 10px;">Hy-Safe Password Reset</h2>
        <p>Hello <strong>${user.name || 'User'}</strong>,</p>
        <p>You requested a password reset for your Hy-Safe account.</p>
        <div style="background-color: #E0F2FE; border: 1px solid #38BDF8; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748B;">Your Verification OTP Code</p>
          <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold; color: #0284C7; letter-spacing: 5px;">${otp}</p>
        </div>
        <p style="font-size: 13px; color: #64748B;">This OTP is valid for <strong>5 minutes</strong>. If you did not request this reset, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #BAE6FD; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748B; text-align: center;">Pure Water, Delivered Fast. &copy; 2026 Hy-Safe</p>
      </div>
    `;

    // 1. Send via Resend API if API Key is configured
    if (process.env.RESEND_API_KEY) {
      console.log('✉️ Attempting email delivery via Resend API...');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const resendResponse = await resend.emails.send({
        from: process.env.SMTP_FROM || 'onboarding@resend.dev',
        to: user.email,
        subject: 'Hy-Safe Password Reset OTP',
        html: htmlContent
      });

      if (resendResponse.error) {
        console.error('❌ Resend API Error:', resendResponse.error);
        throw new Error(resendResponse.error.message || 'Failed to send email via Resend');
      }

      console.log('✉️ Resend email sent successfully, ID:', resendResponse.data?.id);
      return res.status(200).json({
        message: 'OTP sent successfully to your registered email address',
        email: user.email
      });
    }

    // 2. Otherwise, fallback to Nodemailer SMTP/Ethereal
    const transporter = await getMailTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Hy-Safe Support" <support@hysafe.com>',
      to: user.email,
      subject: 'Hy-Safe Password Reset OTP',
      text: `Hello ${user.name || 'User'},\n\nYour OTP to reset your password is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nHy-Safe Team`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Nodemailer sent successfully:', info.messageId);

    // If using Ethereal, print clickable preview link to server log
    if (!process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
      
      // Let's also return it in response during development for absolute ease of use
      return res.status(200).json({
        message: 'OTP sent successfully (Ethereal Dev Sandbox Mode)',
        previewUrl,
        email: user.email,
        otp // return the OTP in the body for easy testing/simulation on client side if URL cannot be visited!
      });
    }

    return res.status(200).json({
      message: 'OTP sent successfully to your registered email address',
      email: user.email
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message || 'Forgot password request failed' });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: 'Phone, OTP, and new password are required' });
    }

    const rawPhone = typeof phone === 'string' ? phone : String(phone || '');
    let normalizedPhone = rawPhone.replace(/\D/g, '');
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.slice(2);
    }

    // Retrieve from store
    const storedData = otpStore.get(normalizedPhone);
    if (!storedData) {
      return res.status(400).json({ message: 'No OTP requested for this phone number' });
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check match
    if (storedData.code !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clear OTP after successful use
    otpStore.delete(normalizedPhone);

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Reset password failed' });
  }
};


