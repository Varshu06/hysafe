import { Router } from 'express';
import {
    getOrderById,
    getOrders,
    getProfile,
    updateProfile,
} from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

router.get('/profile', authenticate, authorize('customer'), getProfile);
router.put('/profile', authenticate, authorize('customer'), updateProfile);
router.get('/orders', authenticate, authorize('customer'), getOrders);
router.get('/orders/:id', authenticate, authorize('customer'), getOrderById);

export default router;


