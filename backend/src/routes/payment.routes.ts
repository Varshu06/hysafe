import { Router } from 'express';
import {
    createPayment,
    getPayments,
    updatePaymentStatus,
    verifyPayment,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, createPayment);
router.get('/', authenticate, getPayments);
router.put('/:id', authenticate, authorize('admin', 'staff'), updatePaymentStatus);
router.post('/verify', authenticate, verifyPayment);

export default router;




