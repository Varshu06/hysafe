import { Router } from 'express';
import {
  toggleStatus,
  getAvailableOrders,
  acceptOrder,
  rejectOrder,
  getOngoingOrders,
  updateOrderStatus,
} from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole('staff'));

router.put('/status', toggleStatus);
router.get('/available-orders', getAvailableOrders);
router.post('/accept-order/:id', acceptOrder);
router.post('/reject-order/:id', rejectOrder);
router.get('/ongoing-orders', getOngoingOrders);
router.put('/update-status/:id', updateOrderStatus);

export default router;




