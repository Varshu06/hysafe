import { Router } from 'express';
import { register, login, getProfile, changePassword, googleAuth } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../validators/auth.validation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/google', googleAuth);
router.get('/me', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

export default router;



