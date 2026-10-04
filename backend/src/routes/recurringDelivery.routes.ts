import { Router } from 'express';
import { getAllRecurringDeliveries, updateRecurringDeliveryStatus } from '../controllers/recurringDelivery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateObjectId } from '../middleware/objectId.middleware';

const router = Router();
router.param('id', validateObjectId);
router.get('/', authenticate, requireRole('admin'), getAllRecurringDeliveries);
router.put('/:id/status', authenticate, requireRole('admin'), updateRecurringDeliveryStatus);

export default router;
