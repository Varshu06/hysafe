import { Router } from 'express';
import { register, login, getProfile, changePassword, googleAuth } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

export default router;




