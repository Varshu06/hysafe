import { Router } from 'express';
import {
  createCustomerAnnouncement,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/customerNotification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateObjectId } from '../middleware/objectId.middleware';

const router = Router();
router.use(authenticate, requireRole('customer', 'staff', 'admin'));
router.get('/', getNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/read-all', markAllNotificationsRead);
router.post('/announcements', requireRole('admin'), createCustomerAnnouncement);
router.param('id', validateObjectId);
router.patch('/:id/read', markNotificationRead);

export default router;
