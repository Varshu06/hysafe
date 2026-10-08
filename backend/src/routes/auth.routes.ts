import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getProfile, changePassword, googleAuth, linkGoogle, forgotPassword, verifyOtp, resetPassword, logout } from '../controllers/auth.controller';
import { deleteAccount } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { googleAuthSchema, loginSchema, registerSchema } from '../validators/auth.validation';

const router = Router();

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit to 5 request OTP attempts per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please try again in 15 minutes.' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit to 10 OTP verification attempts per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many OTP verification attempts. Please try again in 15 minutes.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit to 5 password reset attempts per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please try again in 15 minutes.' },
});

const accountIdentifier = (req: Request): string => {
  const identifier = String(req.body?.email || req.body?.phone || '').trim().toLowerCase();
  return identifier || 'missing-identifier';
};

const accountLimiter = (message: string) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: accountIdentifier,
  validate: { keyGeneratorIpFallback: false },
  message: { message },
});

const accountForgotLimiter = accountLimiter('Too many password reset requests. Please try again in 15 minutes.');
const accountVerifyLimiter = accountLimiter('Too many OTP verification attempts. Please try again in 15 minutes.');
const accountResetLimiter = accountLimiter('Too many password reset attempts. Please try again in 15 minutes.');

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many Google sign-in attempts. Please try again in 15 minutes.' },
});

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/google', googleLimiter, validateBody(googleAuthSchema), googleAuth);
router.post('/google/link', googleLimiter, authenticate, validateBody(googleAuthSchema), linkGoogle);
router.post('/forgot-password', forgotPasswordLimiter, accountForgotLimiter, forgotPassword);
router.post('/verify-otp', verifyOtpLimiter, accountVerifyLimiter, verifyOtp);
router.post('/reset-password', resetPasswordLimiter, accountResetLimiter, resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);
router.delete('/account', authenticate, deleteAccount);

export default router;




