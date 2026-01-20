import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, requireRole('customer'), createOrder);
router.get('/', authenticate, requireRole('customer'), getMyOrders);
router.get('/:id', authenticate, getOrderById);
router.put('/:id/cancel', authenticate, requireRole('customer'), cancelOrder);

export default router;

