import mongoose from 'mongoose';
import { RecurringDelivery, IRecurringDelivery, RecurringFrequency } from '../models/RecurringDelivery.model';
import { RecurringBill } from '../models/RecurringBill.model';
import { Order } from '../models/Order.model';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { InventoryItem } from '../models/InventoryItem.model';
import { emitNewOrder } from './socket.service';
import { sendNotificationToStaff } from './notification.service';
import { notifyOrderCreated, notifyCustomerBill } from './inAppNotification.service';
import { calculateRecurringBillAmount, dateKey, getBillingPeriod, getNextScheduledDelivery, getScheduledDatesInPeriod, normalizeBillingFrequency } from './recurringBilling.service';

export const calculateNextDeliveryDate = (baseDate: Date = new Date(), frequency: RecurringFrequency, deliveryDays?: number[]): Date =>
  getNextScheduledDelivery(baseDate, frequency, deliveryDays);

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  ordersCreated: string[];
  errors: { deliveryId: string; error: string }[];
}

const getTrustedProduct = async (delivery: IRecurringDelivery) => {
  const inventoryItem = mongoose.Types.ObjectId.isValid(delivery.productId)
    ? await InventoryItem.findById(delivery.productId)
    : null;
  // This is server-derived only. Legacy records with unavailable inventory keep
  // the existing scheduler's server-side fallback rather than trusting client data.
  const unitPrice = Number(inventoryItem?.price ?? 80);
  const deliveryCharge = Number(inventoryItem?.deliveryCharge ?? 0);
  const productId = inventoryItem?._id || (mongoose.Types.ObjectId.isValid(delivery.productId) ? new mongoose.Types.ObjectId(delivery.productId) : new mongoose.Types.ObjectId());
  return { inventoryItem, unitPrice, deliveryCharge, productId };
};

const getOrCreateBill = async (delivery: IRecurringDelivery, occurrence: Date, unitPrice: number) => {
  const billingFrequency = normalizeBillingFrequency(delivery.billingFrequency || delivery.paymentTerms) || 'per_order';
  const { periodStart, periodEnd } = getBillingPeriod(occurrence, billingFrequency);
  const scheduledDeliveryDates = billingFrequency === 'per_order'
    ? [new Date(occurrence)]
    : getScheduledDatesInPeriod(delivery, periodStart, periodEnd);
  // A legacy plan without a usable schedule is preserved, with its actual
  // occurrence as the payment unit, rather than silently inventing deliveries.
  const billDates = scheduledDeliveryDates.length ? scheduledDeliveryDates : [new Date(occurrence)];
  const occurrenceDateKey = billingFrequency === 'per_order' ? dateKey(occurrence) : '';
  const billFilter = {
    recurringDeliveryId: delivery._id,
    billingFrequency,
    periodStart,
    occurrenceDateKey,
  };
  const amount = calculateRecurringBillAmount(unitPrice, Number(delivery.quantity), billDates.length);
  const dueDate = billDates.reduce((first, date) => date < first ? date : first, billDates[0]);
  const bill = await RecurringBill.findOneAndUpdate(
    billFilter,
    {
      $setOnInsert: {
        customerId: delivery.customerId,
        recurringDeliveryId: delivery._id,
        billingFrequency,
        periodStart,
        periodEnd,
        occurrenceDateKey,
        dueDate,
        scheduledDeliveryDates: billDates,
        productId: delivery.productId,
        productName: delivery.productName,
        unitPrice,
        quantityPerDelivery: delivery.quantity,
        deliveryCount: billDates.length,
        amount,
        status: 'pending',
        preferredPaymentMethod: delivery.offlinePaymentMethod,
        paymentMethod: delivery.offlinePaymentMethod,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (bill.status === 'pending') void notifyCustomerBill(bill, 'bill_due');
  return bill;
};

// Plan creation needs the same server-owned bill calculation as the scheduler.
// Keeping it here makes the operation idempotent under the bill's unique index.
export const getOrCreateInitialRecurringBill = async (delivery: IRecurringDelivery) => {
  const trusted = await getTrustedProduct(delivery);
  const occurrence = delivery.nextDeliveryDate || delivery.startDate;
  return getOrCreateBill(delivery, occurrence, trusted.unitPrice);
};

const advanceDelivery = async (delivery: IRecurringDelivery, scheduledFor: Date): Promise<void> => {
  const nextDate = getNextScheduledDelivery(scheduledFor, delivery.frequency, delivery.deliveryDays);
  if (delivery.endDate && nextDate > delivery.endDate) delivery.isActive = false;
  else delivery.nextDeliveryDate = nextDate;
  await delivery.save();
};

export const processDueRecurringDeliveries = async (): Promise<ProcessResult> => {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const result: ProcessResult = { processed: 0, succeeded: 0, failed: 0, ordersCreated: [], errors: [] };
  try {
    const dueDeliveries = await RecurringDelivery.find({ isActive: true, nextDeliveryDate: { $lte: endOfToday } });
    result.processed = dueDeliveries.length;
    for (const delivery of dueDeliveries) {
      try {
        const scheduledFor = delivery.nextDeliveryDate || now;
        const user = await User.findById(delivery.customerId);
        if (!user) {
          delivery.isActive = false;
          await delivery.save();
          result.failed += 1;
          result.errors.push({ deliveryId: delivery._id.toString(), error: 'Customer account not found' });
          continue;
        }
        const profile = await CustomerProfile.findOne({ userId: delivery.customerId });
        const trusted = await getTrustedProduct(delivery);
        const bill = await getOrCreateBill(delivery, scheduledFor, trusted.unitPrice);
        let order = await Order.findOne({ recurringDeliveryId: delivery._id, deliverySlot: scheduledFor });
        if (!order) {
          const totalPrice = trusted.unitPrice * Number(delivery.quantity) + trusted.deliveryCharge;
          order = await Order.create({
            customerId: delivery.customerId,
            customerProfileId: profile?._id,
            quantity: delivery.quantity,
            items: [{ productId: trusted.productId, productName: delivery.productName || trusted.inventoryItem?.name || 'Water Item', quantity: delivery.quantity, price: trusted.unitPrice, deliveryCharge: trusted.deliveryCharge }],
            totalPrice,
            price: totalPrice,
            deliveryCharge: trusted.deliveryCharge,
            status: 'pending',
            paymentMethod: delivery.offlinePaymentMethod || 'offline',
            paymentStatus: 'pending',
            deliveryAddress: delivery.deliveryAddress,
            deliverySlot: scheduledFor,
            isRecurring: true,
            recurringDeliveryId: delivery._id,
            recurringBillId: bill._id,
            notes: delivery.specialInstructions ? `Recurring Delivery: ${delivery.specialInstructions}` : 'Automated recurring delivery order',
            receiverName: profile?.name || user.name,
            receiverPhone: user.phone,
            paymentTerms: delivery.paymentTerms || profile?.paymentTerms || 'one-time',
          });
          const populatedOrder = await Order.findById(order._id)
            .populate('customerId', 'name phone')
            .populate('recurringBillId', 'amount status paymentMethod preferredPaymentMethod');
          void notifyOrderCreated(order);
          if (populatedOrder) {
            emitNewOrder(populatedOrder);
            await sendNotificationToStaff(populatedOrder).catch((error) => console.error('[RecurringService] Staff notification failed:', error));
          }
          result.succeeded += 1;
          result.ordersCreated.push(order._id.toString());
        } else if (!order.recurringBillId) {
          order.recurringBillId = bill._id;
          await order.save();
        }
        await RecurringBill.updateOne({ _id: bill._id }, { $addToSet: { orderIds: order._id } });
        await advanceDelivery(delivery, scheduledFor);
      } catch (error: any) {
        console.error(`[RecurringService] Error processing delivery ${delivery._id}:`, error);
        result.failed += 1;
        result.errors.push({ deliveryId: delivery._id.toString(), error: error.message || 'Processing failed' });
      }
    }
  } catch (error: any) {
    console.error('[RecurringService] Fatal error in processDueRecurringDeliveries:', error);
  }
  return result;
};

let schedulerInterval: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;
export const startRecurringDeliveryScheduler = (intervalMs: number = 60 * 60 * 1000): void => {
  if (schedulerInterval) return;
  initialTimeout = setTimeout(() => processDueRecurringDeliveries().catch((error) => console.error('[RecurringService] Initial processing failed:', error)), 10000);
  schedulerInterval = setInterval(() => processDueRecurringDeliveries().catch((error) => console.error('[RecurringService] Periodic processing failed:', error)), intervalMs);
};
export const stopRecurringDeliveryScheduler = (): void => {
  if (initialTimeout) clearTimeout(initialTimeout);
  if (schedulerInterval) clearInterval(schedulerInterval);
  initialTimeout = null;
  schedulerInterval = null;
};
