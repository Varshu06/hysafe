import { Router } from 'express';
import {
  createStaff,
  deleteStaffById,
  getStaff,
  getStaffById,
  getStaffStats,
  updateStaffById,
} from '../controllers/admin.controller';
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
import { validateObjectId } from '../middleware/objectId.middleware';

const router = Router();

router.param('id', validateObjectId);

router.use(authenticate);

router.get('/', requireRole('admin'), getStaff);
router.get('/stats', requireRole('admin'), getStaffStats);
router.post('/', requireRole('admin'), createStaff);

router.put('/status', requireRole('staff'), toggleStatus);
router.get('/available-orders', requireRole('staff'), getAvailableOrders);
router.post('/accept-order/:id', requireRole('staff'), acceptOrder);
router.post('/reject-order/:id', requireRole('staff'), rejectOrder);
router.get('/ongoing-orders', requireRole('staff'), getOngoingOrders);
router.put('/update-status/:id', requireRole('staff'), updateOrderStatus);

router.get('/:id', requireRole('admin'), getStaffById);
router.put('/:id', requireRole('admin'), updateStaffById);
router.delete('/:id', requireRole('admin'), deleteStaffById);

export default router;



