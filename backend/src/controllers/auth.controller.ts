import crypto from 'crypto';
import { Request, Response } from 'express';
import { ClientSession } from 'mongoose';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Staff } from '../models/Staff.model';
import { LoginActivity } from '../models/LoginActivity.model';
import { Otp } from '../models/Otp.model';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';
import { generateToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { normalizeIndianMobilePhone } from '../utils/phone.util';
import { runTransaction } from '../utils/transaction.util';
import {
  createCustomerAccount,
  REGISTRATION_FAILED_MESSAGE,
  registrationErrorLog,
  RegistrationDeps,
} from '../services/registration.service';
import { emailDeliveryAvailable, sendOtpEmail } from '../services/email.service';
import {
  decideForgotPassword,
  evaluateOtpAttempt,
  FORGOT_PASSWORD_MESSAGE,
  hashOtp,
  OTP_INVALID_MESSAGE,
  OTP_LOCKED_MESSAGE,
  OTP_REUSED_MESSAGE,
  OTP_UNAVAILABLE_MESSAGE,
  resolveOtpSalt,
} from '../services/otp.policy';
import {
  classifyDuplicateKey,
  decideGoogleLink,
  decideGoogleLogin,
  GoogleAccountSnapshot,
  GoogleAuthError,
  GoogleIdentity,
  GOOGLE_MESSAGES,
  googlePlaceholderPhone,
  isDuplicateKeyError,
} from '../services/googleIdentity.policy';
import { resolveGoogleCredential } from '../services/googleToken.service';

const registrationDeps: RegistrationDeps = {
  findExisting: async (phone, email) => {
    const filters: Array<Record<string, string>> = [{ phone }];
    if (email) filters.push({ email });
    const existing = await User.findOne({ $or: filters }).select('_id');
    return Boolean(existing);
  },
  insertUser: async (data, session) => {
    const user = new User(data);
    await user.save(session ? { session: session as ClientSession } : undefined);
    return user;
  },
  insertProfile: async (data, session) => {
    const profile = new CustomerProfile(data);
    await profile.save(session ? { session: session as ClientSession } : undefined);
  },
  deleteCreatedUser: async (userId) => {
    if (!userId) return;
    // Only the customer row created by this request can match.
    await User.deleteOne({ _id: userId, role: 'customer' });
  },
  runTransaction,
  hashPassword,
};

// Register
export const register = async (req: Request, res: Response) => {
  const outcome = await createCustomerAccount(req.body, registrationDeps);
  if (!outcome.ok) {
    return res.status(outcome.status).json({ message: outcome.message });
  }

  const userId = outcome.user._id || outcome.user.id;
  if (outcome.user.role !== 'customer' || !userId) {
    return res.status(500).json({ message: REGISTRATION_FAILED_MESSAGE });
  }

  const token = generateToken({
    userId: String(userId),
    role: 'customer',
  });

  return res.status(201).json({
    message: 'Registration successful',
    token,
    user: outcome.user,
  });
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

    user.password = hashedPassword;
    user.sessionValidAfter = new Date();
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
};

const googleAccountSnapshot = (user: {
  googleId?: string | null;
  email?: string | null;
  role?: string | null;
  isActive?: boolean | null;
} | null): GoogleAccountSnapshot | null => {
  if (!user) return null;
  return {
    googleId: user.googleId,
    email: user.email,
    role: user.role || '',
    isActive: user.isActive !== false,
  };
};

const rejectGoogleDecision = (res: Response, type: string): boolean => {
  if (type === 'unverified-email') {
    res.status(400).json({ message: GOOGLE_MESSAGES.unverifiedEmail });
    return true;
  }
  if (type === 'invalid-identity') {
    res.status(400).json({ message: GOOGLE_MESSAGES.invalid });
    return true;
  }
  if (type === 'conflict' || type === 'email-mismatch') {
    res.status(409).json({
      message: type === 'email-mismatch' ? GOOGLE_MESSAGES.emailMismatch : GOOGLE_MESSAGES.conflict,
    });
    return true;
  }
  if (type === 'taken') {
    res.status(409).json({ message: GOOGLE_MESSAGES.taken });
    return true;
  }
  if (type === 'forbidden-role') {
    res.status(403).json({ message: GOOGLE_MESSAGES.forbidden });
    return true;
  }
  if (type === 'inactive') {
    res.status(401).json({ message: GOOGLE_MESSAGES.inactive });
    return true;
  }
  return false;
};

const sendGoogleAuthError = (res: Response, error: unknown) => {
  if (error instanceof GoogleAuthError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error('Google authentication failed');
  return res.status(500).json({ message: 'Google sign-in failed' });
};

const createGoogleCustomer = async (identity: GoogleIdentity) => {
  const password = await hashPassword(crypto.randomBytes(32).toString('hex'));
  return runTransaction(async (session) => {
    const user = new User({
      email: identity.email,
      phone: googlePlaceholderPhone(identity.sub),
      name: identity.name,
      password,
      googleId: identity.sub,
      picture: identity.picture,
      role: 'customer',
      isActive: true,
    });
    await user.save(session ? { session: session as ClientSession } : undefined);
    try {
      const profile = new CustomerProfile({
        userId: user._id,
        name: identity.name || 'HySafe Customer',
        address: 'Address not provided',
        customerType: 'home',
        paymentTerms: 'one-time',
        defaultPaymentMethod: 'offline',
      });
      await profile.save(session ? { session: session as ClientSession } : undefined);
    } catch (profileError) {
      if (!session) {
        await User.deleteOne({ _id: user._id, role: 'customer', googleId: identity.sub });
      }
      throw profileError;
    }
    return user;
  });
};

const ensureCustomerProfile = async (user: { _id: unknown; name?: string }, fallbackName: string) => {
  const existing = await CustomerProfile.findOne({ userId: user._id });
  if (existing) return existing;
  return CustomerProfile.create({
    userId: user._id,
    name: user.name || fallbackName,
    address: 'Address not provided',
    customerType: 'home',
    paymentTerms: 'one-time',
    defaultPaymentMethod: 'offline',
  });
};

const buildSessionUser = async (user: any) => {
  let profile = null;
  if (user.role === 'customer') {
    profile = await CustomerProfile.findOne({ userId: user._id });
  } else if (user.role === 'staff') {
    profile = await Staff.findOne({ userId: user._id });
  }
  const raw = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete raw.password;
  return {
    ...raw,
    ...(profile?.toObject() || {}),
  };
};

const recordLoginActivity = async (req: Request, userId: unknown) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.get('user-agent') || 'Unknown';
    let deviceInfo = 'Unknown Device';
    if (userAgent.includes('Mobile')) deviceInfo = 'Mobile Device';
    else if (userAgent.includes('Tablet')) deviceInfo = 'Tablet';
    else if (userAgent.includes('Windows') || userAgent.includes('Mac') || userAgent.includes('Linux')) {
      deviceInfo = 'Desktop';
    }
    await LoginActivity.create({
      userId,
      deviceInfo,
      ipAddress: ipAddress.toString(),
      userAgent,
      location: 'Unknown',
      loginAt: new Date(),
    });
  } catch (activityError) {
    console.error('Failed to track login activity');
  }
};

const publicUser = (user: any) => {
  const raw = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete raw.password;
  return raw;
};

// Google sign-in. Identity comes only from a verified Google ID token.
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const identity = await resolveGoogleCredential(req.body);
    let linked = await User.findOne({ googleId: identity.sub });
    const emailAccount = await User.findOne({ email: identity.email });
    const decision = decideGoogleLogin(
      identity,
      googleAccountSnapshot(linked),
      googleAccountSnapshot(emailAccount),
    );

    if (rejectGoogleDecision(res, decision.type)) return;

    let user = linked;
    if (!user && emailAccount?.googleId === identity.sub) {
      user = emailAccount;
    }

    if (decision.type === 'create') {
      try {
        user = await createGoogleCustomer(identity);
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          console.error('Google account creation failed:', registrationErrorLog(error));
          return res.status(500).json({ message: 'Google sign-in failed' });
        }
        const duplicate = classifyDuplicateKey(error.keyPattern);
        if (duplicate === 'email') {
          const existing = await User.findOne({ email: identity.email });
          if (existing?.googleId === identity.sub) {
            user = existing;
          } else {
            return res.status(409).json({ message: GOOGLE_MESSAGES.conflict });
          }
        } else if (duplicate === 'google' || duplicate === 'phone') {
          user = await User.findOne({ googleId: identity.sub });
        }
        if (!user) {
          return res.status(409).json({ message: GOOGLE_MESSAGES.conflict });
        }
        const raced = decideGoogleLogin(identity, googleAccountSnapshot(user), null);
        if (rejectGoogleDecision(res, raced.type)) return;
        if (user.role === 'customer') {
          await ensureCustomerProfile(user, identity.name || user.name || 'HySafe Customer');
        }
      }
    }

    if (!user) {
      return res.status(400).json({ message: GOOGLE_MESSAGES.invalid });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ message: GOOGLE_MESSAGES.forbidden });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: GOOGLE_MESSAGES.inactive });
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });
    await recordLoginActivity(req, user._id);

    return res.json({
      message: GOOGLE_MESSAGES.success,
      token,
      user: await buildSessionUser(user),
    });
  } catch (error) {
    return sendGoogleAuthError(res, error);
  }
};

// Link Google to the already authenticated customer. Email must already match.
export const linkGoogle = async (req: AuthRequest, res: Response) => {
  try {
    const current = req.user;
    if (!current) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const identity = await resolveGoogleCredential(req.body);
    const owner = await User.findOne({ googleId: identity.sub, _id: { $ne: current._id } });
    const decision = decideGoogleLink(identity, {
      googleId: current.googleId,
      email: current.email,
      role: current.role,
      isActive: current.isActive !== false,
    }, googleAccountSnapshot(owner));

    if (decision === 'already-linked') {
      return res.json({ message: GOOGLE_MESSAGES.alreadyLinked, user: publicUser(current) });
    }
    if (rejectGoogleDecision(res, decision)) return;
    if (decision !== 'link') {
      return res.status(400).json({ message: GOOGLE_MESSAGES.invalid });
    }

    const updates: { googleId: string; picture?: string; name?: string } = { googleId: identity.sub };
    if (identity.picture && !current.picture) updates.picture = identity.picture;
    if (identity.name && !current.name) updates.name = identity.name;
    try {
      await User.updateOne({ _id: current._id, role: 'customer', isActive: true }, { $set: updates });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ message: GOOGLE_MESSAGES.taken });
      }
      throw error;
    }

    const updated = await User.findById(current._id).select('-password');
    return res.json({ message: GOOGLE_MESSAGES.linked, user: publicUser(updated || current) });
  } catch (error) {
    return sendGoogleAuthError(res, error);
  }
};

const genericForgotPassword = {
  success: true,
  message: FORGOT_PASSWORD_MESSAGE,
};

// Forgot Password - Send OTP to the account email. Phone-only accounts have no SMS provider.
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;
    const identifier = (email || phone || '').trim().toLowerCase();

    if (!identifier) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    const salt = resolveOtpSalt();
    const production = process.env.NODE_ENV === 'production';
    const unavailable = decideForgotPassword({
      saltOk: salt.ok,
      providerReady: emailDeliveryAvailable(),
      production,
      userExists: true,
      hasEmail: true,
      cooldown: false,
      delivered: true,
    });
    if (unavailable.status === 503) {
      return res.status(503).json({ message: unavailable.message });
    }

    const normalizedPhone = normalizeIndianMobilePhone(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    const possibleIdentifiers = [
      user?.email,
      user?.phone,
      identifier,
    ].filter(Boolean) as string[];

    const existingRecentOtp = user
      ? await Otp.findOne({
          identifier: { $in: possibleIdentifiers },
          createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
        })
      : null;

    const decision = decideForgotPassword({
      saltOk: true,
      providerReady: true,
      production,
      userExists: Boolean(user),
      hasEmail: Boolean(user?.email),
      cooldown: Boolean(existingRecentOtp),
      delivered: true,
    });
    if (!decision.send) {
      return res.status(decision.status).json({
        success: decision.status === 200 ? true : undefined,
        message: decision.message,
      });
    }

    const targetEmail = user?.email;
    if (!salt.ok || !targetEmail) {
      return res.json(genericForgotPassword);
    }

    const generatedOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ identifier: { $in: possibleIdentifiers } });
    await Otp.create({
      identifier: targetEmail,
      otpHash: hashOtp(generatedOtp, salt.salt),
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      isVerified: false,
    });

    const emailDelivered = await sendOtpEmail(targetEmail, generatedOtp);
    if (!emailDelivered) {
      await Otp.deleteMany({ identifier: { $in: possibleIdentifiers } });
      console.error('[Auth] Password reset delivery failed.');
      return res.json(genericForgotPassword);
    }

    console.info('[Auth] Password reset code sent.');
    return res.json(genericForgotPassword);
  } catch (error: any) {
    console.error('[Auth] Forgot password request failed.');
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

    const salt = resolveOtpSalt();
    if (!salt.ok) {
      return res.status(503).json({ message: OTP_UNAVAILABLE_MESSAGE });
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

    const result = evaluateOtpAttempt(
      otpRecord,
      hashOtp(cleanOtp, salt.salt),
      otpRecord.otpHash,
    );
    if (result === 'match') {
      otpRecord.isVerified = true;
      await otpRecord.save();
      return res.json({
        success: true,
        message: 'OTP verified successfully',
      });
    }

    if (result === 'invalid' || (result === 'locked' && otpRecord.attempts < otpRecord.maxAttempts)) {
      const updatedOtp = await Otp.findOneAndUpdate(
        {
          _id: otpRecord._id,
          isUsed: false,
          expiresAt: { $gt: new Date() },
          attempts: { $lt: otpRecord.maxAttempts },
        },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (!updatedOtp || updatedOtp.attempts >= updatedOtp.maxAttempts) {
        return res.status(400).json({ message: OTP_LOCKED_MESSAGE });
      }
      return res.status(400).json({ message: OTP_INVALID_MESSAGE });
    }

    return res.status(400).json({
      message: result === 'used'
        ? OTP_REUSED_MESSAGE
        : result === 'locked'
          ? OTP_LOCKED_MESSAGE
          : OTP_INVALID_MESSAGE,
    });
  } catch (error: any) {
    console.error('[Auth] OTP verification failed.');
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

    const salt = resolveOtpSalt();
    if (!salt.ok) {
      return res.status(503).json({ message: OTP_UNAVAILABLE_MESSAGE });
    }

    const normalizedPhone = normalizeIndianMobilePhone(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (!user) {
      return res.status(400).json({ message: OTP_INVALID_MESSAGE });
    }

    const possibleIdentifiers = [
      identifier,
      ...(user.email ? [user.email] : []),
      ...(user.phone ? [user.phone] : []),
    ];

    const submittedHash = hashOtp(cleanOtp, salt.salt);
    const otpRecord = await Otp.findOne({
      identifier: { $in: possibleIdentifiers },
    }).sort({ createdAt: -1 });

    const resetAttempt = otpRecord
      ? evaluateOtpAttempt(otpRecord, submittedHash, otpRecord.otpHash)
      : 'invalid';

    if (!otpRecord || resetAttempt === 'expired') {
      console.warn('[Auth] Password reset rejected: invalid or expired code.');
      return res.status(400).json({ message: OTP_INVALID_MESSAGE });
    }

    if (resetAttempt === 'used') {
      return res.status(400).json({ message: OTP_REUSED_MESSAGE });
    }

    if (resetAttempt === 'invalid' || (resetAttempt === 'locked' && otpRecord.attempts < otpRecord.maxAttempts)) {
      const updatedOtp = await Otp.findOneAndUpdate(
        {
          _id: otpRecord._id,
          isUsed: false,
          expiresAt: { $gt: new Date() },
          attempts: { $lt: otpRecord.maxAttempts },
        },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (!updatedOtp || updatedOtp.attempts >= updatedOtp.maxAttempts) {
        return res.status(400).json({ message: OTP_LOCKED_MESSAGE });
      }
      return res.status(400).json({ message: OTP_INVALID_MESSAGE });
    }

    if (resetAttempt !== 'match') {
      return res.status(400).json({
        message: resetAttempt === 'locked' ? OTP_LOCKED_MESSAGE : OTP_INVALID_MESSAGE,
      });
    }

    // The reset screen sends the code once. A prior /verify-otp call is optional.
    const consumedOtp = await Otp.findOneAndUpdate(
      {
        _id: otpRecord._id,
        isUsed: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: otpRecord.maxAttempts },
      },
      { $set: { isUsed: true, isVerified: true } },
      { new: true },
    );

    if (!consumedOtp) {
      return res.status(400).json({ message: OTP_REUSED_MESSAGE });
    }

    user.password = await hashPassword(String(newPassword));
    user.sessionValidAfter = new Date();
    await user.save();

    // Invalidate / clear all OTP records for this user
    await Otp.deleteMany({ identifier: { $in: possibleIdentifiers } });

    console.info('[Auth] Password reset completed.');
    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[Auth] Password reset failed.');
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await User.updateOne({ _id: userId }, { $set: { sessionValidAfter: new Date() } });
    return res.json({ message: 'Logged out' });
  } catch (error: any) {
    console.error('[Auth] Logout failed.');
    return res.status(500).json({ message: 'Failed to log out' });
  }
};
