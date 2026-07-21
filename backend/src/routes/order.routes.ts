import { Router } from 'express';
import {
  createOrder,
  assignOrderStaff,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatusByAdmin,
  getOrderStats,
  getOrdersChart,
  getRecentOrders
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, requireRole('customer'), createOrder);
router.get('/', authenticate, requireRole('customer', 'admin'), getMyOrders);
router.get('/stats', authenticate, requireRole('admin'), getOrderStats);
router.get('/chart', authenticate, requireRole('admin'), getOrdersChart);
router.get('/recent', authenticate, requireRole('admin'), getRecentOrders);
router.get('/:id', authenticate, getOrderById);
router.put('/:id/cancel', authenticate, requireRole('customer'), cancelOrder);
router.put('/:id/assign-staff', authenticate, requireRole('admin'), assignOrderStaff);
router.put('/:id/status', authenticate, requireRole('admin'), updateOrderStatusByAdmin);
export default router;

