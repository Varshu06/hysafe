import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getProfile, changePassword, googleAuth, forgotPassword, verifyOtp, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../validators/auth.validation';

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

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.get('/me', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

export default router;




