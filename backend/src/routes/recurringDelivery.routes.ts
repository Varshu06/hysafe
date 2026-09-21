import { Router } from 'express';
import { getAllRecurringDeliveries } from '../controllers/recurringDelivery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get('/', authenticate, requireRole('admin'), getAllRecurringDeliveries);

export default router;
