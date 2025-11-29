import { Router } from 'express';
import { cancelOrder, createOrder, getOrderById, getOrders, updateOrderStatus } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, authorize('customer'), createOrder);
router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrderById);
router.put('/:id/status', authenticate, updateOrderStatus);
router.delete('/:id', authenticate, cancelOrder);

export default router;

