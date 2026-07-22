import { Router } from 'express';
import {
  getCustomerById,
  getCustomerOrders,
  getCustomerStats,
  getCustomers,
} from '../controllers/admin.controller';
import { updateProfile, getProfile } from '../controllers/customer.controller';
import { getLoginActivity } from '../controllers/loginActivity.controller';
import {
  createRecurringDelivery,
  getRecurringDeliveries,
  updateRecurringDelivery,
  deleteRecurringDelivery,
} from '../controllers/recurringDelivery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, requireRole('admin'), getCustomers);
router.get('/stats', authenticate, requireRole('admin'), getCustomerStats);

router.get('/profile', authenticate, requireRole('customer'), getProfile);
router.put('/profile', authenticate, requireRole('customer'), updateProfile);
router.get('/login-activity', authenticate, requireRole('customer'), getLoginActivity);

// Recurring deliveries
router.post('/recurring-deliveries', authenticate, requireRole('customer'), createRecurringDelivery);
router.get('/recurring-deliveries', authenticate, requireRole('customer'), getRecurringDeliveries);
router.put('/recurring-deliveries/:id', authenticate, requireRole('customer'), updateRecurringDelivery);
router.delete('/recurring-deliveries/:id', authenticate, requireRole('customer'), deleteRecurringDelivery);

router.get('/:id/orders', authenticate, requireRole('admin'), getCustomerOrders);
router.get('/:id', authenticate, requireRole('admin'), getCustomerById);

export default router;

