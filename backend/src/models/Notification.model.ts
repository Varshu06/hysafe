import mongoose, { Document, Schema } from 'mongoose';

export type NotificationRole = 'customer' | 'staff' | 'admin';
export type NotificationType =
  | 'recurring_delivery_paused'
  | 'recurring_delivery_resumed'
  | 'recurring_delivery_cancelled'
  | 'order_placed'
  | 'order_accepted'
  | 'order_cancelled'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'new_order_available'
  | 'admin_new_order'
  | 'bill_due'
  | 'bill_paid'
  | 'admin_announcement';

export interface INotification extends Document {
  recipientId?: mongoose.Types.ObjectId;
  recipientRole?: NotificationRole;
  type: NotificationType;
  title?: string;
  message?: string;
  productName?: string;
  orderId?: mongoose.Types.ObjectId;
  billId?: mongoose.Types.ObjectId;
  recurringDeliveryId?: mongoose.Types.ObjectId;
  announcementId?: mongoose.Types.ObjectId;
  amount?: number;
  dueDate?: Date;
  eventKey?: string;
  isRead?: boolean;
  readAt?: Date;
  // Legacy fields retained so existing CustomerNotification documents remain readable.
  customerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  recipientRole: { type: String, enum: ['customer', 'staff', 'admin'], index: true },
  type: {
    type: String,
    enum: [
      'recurring_delivery_paused', 'recurring_delivery_resumed', 'recurring_delivery_cancelled',
      'order_placed', 'order_accepted', 'order_cancelled', 'order_out_for_delivery', 'order_delivered',
      'new_order_available', 'admin_new_order', 'bill_due', 'bill_paid', 'admin_announcement',
    ],
    required: true,
  },
  title: { type: String },
  message: { type: String },
  productName: { type: String, trim: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  billId: { type: Schema.Types.ObjectId, ref: 'RecurringBill' },
  recurringDeliveryId: { type: Schema.Types.ObjectId, ref: 'RecurringDelivery' },
  announcementId: { type: Schema.Types.ObjectId },
  amount: { type: Number, min: 0 },
  dueDate: { type: Date },
  eventKey: { type: String, unique: true, sparse: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  // `customernotifications` is the original CustomerNotification collection.
  // Keeping this collection name preserves existing documents without a data migration.
  customerId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'customernotifications' });

NotificationSchema.index({ recipientId: 1, recipientRole: 1, createdAt: -1 });
NotificationSchema.index({ customerId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
