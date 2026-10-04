import mongoose, { Document, Schema } from 'mongoose';

export type RecurringBillFrequency = 'per_order' | 'weekly' | 'monthly';
export type RecurringBillStatus = 'pending' | 'confirmed' | 'paid' | 'overdue';
export type OfflinePaymentMethod = 'cash' | 'shop';

export interface IRecurringBill extends Document {
  customerId: mongoose.Types.ObjectId;
  recurringDeliveryId: mongoose.Types.ObjectId;
  orderIds: mongoose.Types.ObjectId[];
  occurrenceDateKey: string;
  billingFrequency: RecurringBillFrequency;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  scheduledDeliveryDates: Date[];
  productId: string;
  productName: string;
  unitPrice: number;
  quantityPerDelivery: number;
  deliveryCount: number;
  amount: number;
  status: RecurringBillStatus;
  confirmedAt?: Date;
  paymentMethod?: OfflinePaymentMethod;
  preferredPaymentMethod?: OfflinePaymentMethod;
  paymentAmount?: number;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringBillSchema = new Schema<IRecurringBill>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recurringDeliveryId: { type: Schema.Types.ObjectId, ref: 'RecurringDelivery', required: true, index: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    // For per-order bills this is the scheduled occurrence date; for period bills it is empty.
    occurrenceDateKey: { type: String, default: '' },
    billingFrequency: { type: String, enum: ['per_order', 'weekly', 'monthly'], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    scheduledDeliveryDates: [{ type: Date, required: true }],
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantityPerDelivery: { type: Number, required: true, min: 1 },
    deliveryCount: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'paid', 'overdue'], default: 'pending', index: true },
    confirmedAt: { type: Date },
    paymentMethod: { type: String, enum: ['cash', 'shop'] },
    preferredPaymentMethod: { type: String, enum: ['cash', 'shop'] },
    paymentAmount: { type: Number, min: 0 },
    paidAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// A billing period can have exactly one bill per plan. The occurrence key makes
// each pay-per-order delivery its own idempotent payment unit.
RecurringBillSchema.index(
  { recurringDeliveryId: 1, billingFrequency: 1, periodStart: 1, occurrenceDateKey: 1 },
  { unique: true },
);
RecurringBillSchema.index({ customerId: 1, dueDate: -1 });

export const RecurringBill = mongoose.model<IRecurringBill>('RecurringBill', RecurringBillSchema);
