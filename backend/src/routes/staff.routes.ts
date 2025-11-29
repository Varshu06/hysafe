import { Router } from 'express';
import {
    acceptOrder,
    getAvailableOrders,
    getOngoingOrders,
    rejectOrder,
    staffLogin,
    toggleStatus,
    updateOrderStatus,
} from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

router.post('/login', staffLogin);
router.put('/status', authenticate, authorize('staff'), toggleStatus);
router.get('/available-orders', authenticate, authorize('staff'), getAvailableOrders);
router.post('/accept-order/:id', authenticate, authorize('staff'), acceptOrder);
router.post('/reject-order/:id', authenticate, authorize('staff'), rejectOrder);
router.get('/ongoing-orders', authenticate, authorize('staff'), getOngoingOrders);
router.put('/update-status/:id', authenticate, authorize('staff'), updateOrderStatus);

export default router;

