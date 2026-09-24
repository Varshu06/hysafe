import mongoose from 'mongoose';
import { Notification, NotificationRole, NotificationType } from '../models/Notification.model';
import { User } from '../models/User.model';
import { emitAdminNotificationCreated } from './socket.service';

type NotificationInput = {
  recipientId: mongoose.Types.ObjectId | string;
  recipientRole: NotificationRole;
  type: NotificationType;
  eventKey?: string;
  title?: string;
  message?: string;
  productName?: string;
  orderId?: mongoose.Types.ObjectId | string;
  billId?: mongoose.Types.ObjectId | string;
  recurringDeliveryId?: mongoose.Types.ObjectId | string;
  amount?: number;
  dueDate?: Date;
};

export const createInAppNotification = async (input: NotificationInput) => {
  try {
    return await Notification.create(input);
  } catch (error: any) {
    // A stable event key makes retried order/bill events idempotent.
    if (error?.code === 11000 && input.eventKey) return null;
    throw error;
  }
};

const notifyRecipients = async (recipients: Array<{ id: mongoose.Types.ObjectId; role: NotificationRole }>, makeInput: (recipientId: mongoose.Types.ObjectId, role: NotificationRole) => NotificationInput) => {
  await Promise.all(recipients.map(async recipient => {
    try { await createInAppNotification(makeInput(recipient.id, recipient.role)); }
    catch (error) { console.error('[InAppNotifications] Failed to create notification:', error); }
  }));
};

const getId = (value: any): mongoose.Types.ObjectId | null => {
  const id = value?._id || value;
  return id && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

export const notifyOrderCreated = async (order: any): Promise<void> => {
  const orderId = getId(order?._id);
  const customerId = getId(order?.customerId);
  if (!orderId) return;
  const productName = order?.items?.[0]?.productName || 'Order';
  const recipients: Array<{ id: mongoose.Types.ObjectId; role: NotificationRole; type: NotificationType }> = [];
  if (customerId) recipients.push({ id: customerId, role: 'customer', type: 'order_placed' });

  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    admins.forEach(admin => recipients.push({ id: admin._id, role: 'admin', type: 'admin_new_order' }));
  } catch (error) {
    console.error('[InAppNotifications] Failed to resolve order notification recipients:', error);
  }

  await notifyRecipients(recipients, (recipientId, role) => {
    const type = recipients.find(r => r.id.equals(recipientId) && r.role === role)?.type || 'order_placed';
    return {
      recipientId, recipientRole: role, type, orderId, productName,
      eventKey: `order:${orderId}:${type}:${recipientId}`,
    };
  });
  if (recipients.some(recipient => recipient.role === 'admin')) emitAdminNotificationCreated();
};

export const notifyCustomerOrderStatus = async (order: any, type: Extract<NotificationType, 'order_accepted' | 'order_cancelled' | 'order_out_for_delivery' | 'order_delivered'>): Promise<void> => {
  const recipientId = getId(order?.customerId);
  const orderId = getId(order?._id);
  if (!recipientId || !orderId) return;
  try {
    await createInAppNotification({
      recipientId, recipientRole: 'customer', type, orderId,
      productName: order?.items?.[0]?.productName || 'Order',
      eventKey: `order:${orderId}:${type}:${recipientId}`,
    });
  } catch (error) { console.error('[InAppNotifications] Failed to create customer order notification:', error); }
};

export const notifyCustomerBill = async (bill: any, type: 'bill_due' | 'bill_paid'): Promise<void> => {
  const recipientId = getId(bill?.customerId);
  const billId = getId(bill?._id);
  if (!recipientId || !billId) return;
  try {
    await createInAppNotification({
      recipientId, recipientRole: 'customer', type, billId,
      recurringDeliveryId: getId(bill?.recurringDeliveryId) || undefined,
      productName: bill?.productName, amount: bill?.amount, dueDate: bill?.dueDate,
      eventKey: `bill:${billId}:${type}:${recipientId}`,
    });
  } catch (error) { console.error('[InAppNotifications] Failed to create customer bill notification:', error); }
};
