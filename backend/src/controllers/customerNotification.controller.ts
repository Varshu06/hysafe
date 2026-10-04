import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';

const recipientFilter = (req: AuthRequest) => {
  const filters: Record<string, unknown>[] = [{ recipientId: req.user!._id, recipientRole: req.user!.role }];
  if (req.user!.role === 'customer') filters.push({ customerId: req.user!._id, recipientId: { $exists: false } });
  return { $or: filters };
};

const serializeLegacy = (notification: any, role: string) => ({
  ...notification,
  recipientId: notification.recipientId || notification.customerId,
  recipientRole: notification.recipientRole || role,
  isRead: notification.isRead === true,
});

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const owner = recipientFilter(req);
    const notifications = await Notification.find(owner)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({ $and: [owner, { isRead: { $ne: true } }] });
    res.json({ notifications: notifications.map(item => serializeLegacy(item, req.user!.role)), unreadCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
};

// Kept on /api/customers/notifications for compatibility with existing clients.
export const getCustomerNotifications = getNotifications;

export const getUnreadNotificationCount = async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = await Notification.countDocuments({ $and: [recipientFilter(req), { isRead: { $ne: true } }] });
    res.json({ unreadCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to count unread notifications' });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { $and: [{ _id: req.params.id }, recipientFilter(req)] },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    ).lean();
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification: serializeLegacy(notification, req.user!.role) });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const result = await Notification.updateMany(
      { $and: [recipientFilter(req), { isRead: { $ne: true } }] },
      { $set: { isRead: true, readAt: new Date() } },
    );
    res.json({ updatedCount: result.modifiedCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to mark notifications as read' });
  }
};

export const createCustomerAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title : '';
    const message = typeof req.body.message === 'string' ? req.body.message : '';
    const audience = req.body.audience;
    if (!title.trim() || title.length > 120) return res.status(400).json({ message: 'Title is required and must be at most 120 characters' });
    if (!message.trim() || message.length > 2000) return res.status(400).json({ message: 'Message is required and must be at most 2000 characters' });
    if (audience !== 'all_customers') return res.status(400).json({ message: 'Audience must be all_customers' });

    const customers = await User.find({ role: 'customer', isActive: true }).select('_id').lean();
    const announcementId = new mongoose.Types.ObjectId();
    if (customers.length) {
      await Notification.insertMany(customers.map(customer => ({
        recipientId: customer._id,
        recipientRole: 'customer',
        type: 'admin_announcement',
        title,
        message,
        announcementId,
        eventKey: `announcement:${announcementId}:${customer._id}`,
        isRead: false,
      })));
    }
    res.status(201).json({ message: 'Announcement published', announcementId, recipientCount: customers.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to publish announcement' });
  }
};
