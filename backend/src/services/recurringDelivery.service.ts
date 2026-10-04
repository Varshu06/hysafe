import mongoose from 'mongoose';
import { RecurringDelivery, IRecurringDelivery, RecurringFrequency } from '../models/RecurringDelivery.model';
import { RecurringBill } from '../models/RecurringBill.model';
import { Order } from '../models/Order.model';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { InventoryItem } from '../models/InventoryItem.model';
import { getProductAvailabilityState } from './productAvailability.service';
import { emitNewOrder } from './socket.service';
import { sendNotificationToStaff } from './notification.service';
import { notifyOrderCreated, notifyCustomerBill } from './inAppNotification.service';
import { calculateRecurringBill, calculateRecurringBillAmount, dateKey, getBillingPeriod, getFirstScheduledDeliveryOnOrAfter, getNextScheduledDelivery, getScheduledDatesInPeriod, normalizeBillingFrequency } from './recurringBilling.service';

export const calculateNextDeliveryDate = (baseDate: Date = new Date(), frequency: RecurringFrequency, deliveryDays?: number[]): Date =>
  getNextScheduledDelivery(baseDate, frequency, deliveryDays);

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  ordersCreated: string[];
  errors: { deliveryId: string; error: string }[];
}

export const getTrustedInventoryItem = async (productId: string) =>
  mongoose.Types.ObjectId.isValid(productId) ? InventoryItem.findById(productId) : null;

export const getTrustedInventoryPrice = (inventoryItem: { price?: unknown; available?: boolean; comingSoon?: boolean } | null): number => {
  if (!inventoryItem) throw new Error('Recurring delivery product not found in inventory');
  if (inventoryItem.comingSoon === true) throw new Error('Recurring delivery product is coming soon');
  if (inventoryItem.available !== true) throw new Error('Recurring delivery product is unavailable');
  if (inventoryItem.price === null || inventoryItem.price === undefined || inventoryItem.price === '') {
    throw new Error('Recurring delivery product has no valid inventory price');
  }
  const unitPrice = Number(inventoryItem.price);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error('Recurring delivery product has no valid inventory price');
  }
  return unitPrice;
};

export const assertRecurringDeliveryStock = (
  inventoryItem: { quantity?: number; available?: boolean; comingSoon?: boolean } | null,
  requestedQuantity: number,
): void => {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
    throw new Error('Recurring delivery quantity or inventory is invalid');
  }
  const state = getProductAvailabilityState(inventoryItem, requestedQuantity);
  if (state === 'coming_soon') throw new Error('Recurring delivery product is coming soon');
  if (state === 'unavailable') {
    if (inventoryItem?.available !== true) throw new Error('Recurring delivery product is unavailable');
    throw new Error('Insufficient inventory stock for recurring delivery');
  }
};

const getTrustedProduct = async (delivery: IRecurringDelivery) => {
  const inventoryItem = await getTrustedInventoryItem(delivery.productId);
  const unitPrice = getTrustedInventoryPrice(inventoryItem);
  const deliveryCharge = Number(inventoryItem?.deliveryCharge ?? 0);
  const productId = inventoryItem!._id;
  return { inventoryItem, unitPrice, deliveryCharge, productId };
};

const getOrCreateBill = async (delivery: IRecurringDelivery, occurrence: Date, unitPrice: number) => {
  const billingFrequency = normalizeBillingFrequency(delivery.billingFrequency || delivery.paymentTerms) || 'per_order';
  const calculation = calculateRecurringBill({
    unitPrice,
    quantityPerDelivery: Number(delivery.quantity),
    frequency: delivery.frequency,
    deliveryDays: delivery.deliveryDays,
    billingFrequency,
    startDate: delivery.startDate,
    endDate: delivery.endDate,
    occurrence,
  });
  const occurrenceDateKey = billingFrequency === 'per_order' ? dateKey(occurrence) : '';
  const billFilter = {
    recurringDeliveryId: delivery._id,
    billingFrequency,
    periodStart: calculation.periodStart,
    occurrenceDateKey,
  };
  let bill;
  try {
    bill = await RecurringBill.findOneAndUpdate(
      billFilter,
      {
        $setOnInsert: {
          customerId: delivery.customerId,
          recurringDeliveryId: delivery._id,
          billingFrequency,
          periodStart: calculation.periodStart,
          periodEnd: calculation.periodEnd,
          occurrenceDateKey,
          dueDate: calculation.dueDate,
          scheduledDeliveryDates: calculation.scheduledDeliveryDates,
          productId: delivery.productId,
          productName: delivery.productName,
          unitPrice,
          quantityPerDelivery: delivery.quantity,
          deliveryCount: calculation.deliveryCount,
          amount: calculation.amount,
          // Confirming the recurring plan also authorizes this scheduled bill;
          // payment remains outstanding until staff records the offline payment.
          status: 'confirmed',
          preferredPaymentMethod: delivery.offlinePaymentMethod,
          paymentMethod: delivery.offlinePaymentMethod,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error: any) {
    // Concurrent scheduler/payment requests may race on the unique period key.
    if (error?.code !== 11000) throw error;
    bill = await RecurringBill.findOne(billFilter);
    if (!bill) throw error;
  }
  if (delivery.initialBillStatus === 'pending') {
    const initialOccurrence = getFirstScheduledDeliveryOnOrAfter(delivery.startDate, delivery.frequency, delivery.deliveryDays);
    const initialPeriod = getBillingPeriod(initialOccurrence, billingFrequency);
    const isInitialBill = calculation.periodStart.getTime() === initialPeriod.periodStart.getTime()
      && (billingFrequency !== 'per_order' || occurrenceDateKey === dateKey(initialOccurrence));
    if (isInitialBill) {
      delivery.initialBillStatus = 'ready';
      await delivery.save();
    }
  }
  if (bill.status === 'pending' || bill.status === 'confirmed') void notifyCustomerBill(bill, 'bill_due');
  return bill;
};

const unpaidRecurringBillStatuses = ['pending', 'confirmed', 'overdue'];

const getBillFilterForOccurrence = (delivery: IRecurringDelivery, occurrence: Date) => {
  const billingFrequency = normalizeBillingFrequency(delivery.billingFrequency || delivery.paymentTerms) || 'per_order';
  const { periodStart } = getBillingPeriod(occurrence, billingFrequency);
  return {
    recurringDeliveryId: delivery._id,
    billingFrequency,
    periodStart,
    occurrenceDateKey: billingFrequency === 'per_order' ? dateKey(occurrence) : '',
  };
};

/** Remove one unfulfillable, not-yet-generated occurrence from an unpaid bill. */
export const excludeUnfulfillableOccurrenceFromBill = async (
  delivery: IRecurringDelivery,
  occurrence: Date,
): Promise<void> => {
  const bill = await RecurringBill.findOne(getBillFilterForOccurrence(delivery, occurrence));
  if (!bill || !unpaidRecurringBillStatuses.includes(bill.status)) return;

  const occurrenceKey = dateKey(occurrence);
  const storedDate = bill.scheduledDeliveryDates.find((date) => dateKey(date) === occurrenceKey);
  if (!storedDate) return;

  // A separate worker may have generated this occurrence after our stock read.
  if (await Order.findOne({ recurringDeliveryId: delivery._id, deliverySlot: storedDate })) return;

  const remainingDates = bill.scheduledDeliveryDates.filter((date) => dateKey(date) !== occurrenceKey);
  if (!remainingDates.length && !(bill.orderIds || []).length) {
    await RecurringBill.deleteOne({
      _id: bill._id,
      status: { $in: unpaidRecurringBillStatuses },
      scheduledDeliveryDates: storedDate,
      orderIds: { $size: 0 },
    });
    return;
  }

  const updatedBill = await RecurringBill.findOneAndUpdate(
    {
      _id: bill._id,
      status: { $in: unpaidRecurringBillStatuses },
      scheduledDeliveryDates: storedDate,
      deliveryCount: { $gt: 1 },
    },
    {
      $pull: { scheduledDeliveryDates: storedDate },
      $inc: {
        deliveryCount: -1,
        amount: -calculateRecurringBillAmount(Number(bill.unitPrice), Number(bill.quantityPerDelivery), 1),
      },
    },
    { new: true },
  );

  if (updatedBill && dateKey(bill.dueDate) === occurrenceKey && updatedBill.scheduledDeliveryDates.length) {
    const nextDueDate = updatedBill.scheduledDeliveryDates
      .slice()
      .sort((left, right) => left.getTime() - right.getTime())[0];
    await RecurringBill.updateOne(
      { _id: bill._id, status: { $in: unpaidRecurringBillStatuses }, dueDate: bill.dueDate },
      { $set: { dueDate: nextDueDate } },
    );
  }
};

/** Restore a retried occurrence to an unpaid bill only after its order exists. */
export const restoreGeneratedOccurrenceToBill = async (
  delivery: IRecurringDelivery,
  occurrence: Date,
  bill: any,
): Promise<void> => {
  if (!unpaidRecurringBillStatuses.includes(bill.status)) return;
  if (bill.scheduledDeliveryDates.some((date: Date) => dateKey(date) === dateKey(occurrence))) return;

  await RecurringBill.updateOne(
    {
      _id: bill._id,
      status: { $in: unpaidRecurringBillStatuses },
      scheduledDeliveryDates: { $ne: occurrence },
    },
    {
      $addToSet: { scheduledDeliveryDates: occurrence },
      $inc: {
        deliveryCount: 1,
        amount: calculateRecurringBillAmount(Number(bill.unitPrice), Number(bill.quantityPerDelivery), 1),
      },
      $min: { dueDate: occurrence },
    },
  );
};

const isUnfulfillableInventoryError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /coming soon|unavailable|insufficient inventory stock|product not found in inventory|no valid inventory price/i.test(message);
};

// Ensures the following period exists after payment using the same trusted
// price, shared calculation and unique-key upsert used by the scheduler.
export const ensureNextRecurringBillAfterPayment = async (paidBillId: string): Promise<void> => {
  const paidBill = await RecurringBill.findById(paidBillId);
  if (!paidBill) {
    console.info('[RecurringService] Rollover skipped: paid bill not found', { paidBillId });
    return;
  }
  const paidBillContext = {
    planId: paidBill.recurringDeliveryId.toString(),
    paidBillId: paidBill._id.toString(),
    paidBillPeriodStart: paidBill.periodStart.toISOString(),
    paidBillPeriodEnd: paidBill.periodEnd.toISOString(),
    billingFrequency: paidBill.billingFrequency,
  };
  console.info('[RecurringService] Recurring bill rollover started', paidBillContext);
  if (paidBill.status !== 'paid') {
    console.info('[RecurringService] Rollover skipped: bill is not paid', { ...paidBillContext, status: paidBill.status });
    return;
  }
  if (paidBill.billingFrequency === 'per_order') {
    console.info('[RecurringService] Rollover skipped: pay-per-order bills remain scheduler-driven', paidBillContext);
    return;
  }

  const delivery = await RecurringDelivery.findById(paidBill.recurringDeliveryId);
  if (!delivery) {
    console.info('[RecurringService] Rollover skipped: recurring plan not found', paidBillContext);
    return;
  }
  if (!delivery.isActive || delivery.status === 'paused' || delivery.status === 'cancelled') {
    console.info('[RecurringService] Rollover skipped: recurring plan is inactive', {
      ...paidBillContext,
      isActive: delivery.isActive,
      planStatus: delivery.status,
    });
    return;
  }

  const dayAfterPeriod = new Date(paidBill.periodEnd);
  dayAfterPeriod.setHours(0, 0, 0, 0);
  dayAfterPeriod.setDate(dayAfterPeriod.getDate() + 1);
  const nextOccurrence = getFirstScheduledDeliveryOnOrAfter(dayAfterPeriod, delivery.frequency, delivery.deliveryDays);
  if (delivery.endDate && nextOccurrence > delivery.endDate) {
    console.info('[RecurringService] Rollover skipped: next delivery is after plan end date', {
      ...paidBillContext,
      nextOccurrence: nextOccurrence.toISOString(),
      planEndDate: delivery.endDate.toISOString(),
    });
    return;
  }

  const nextPeriodBounds = getBillingPeriod(nextOccurrence, paidBill.billingFrequency);
  // This range check prevents the calculation's legacy empty-schedule fallback
  // from creating a bill without valid deliveries.
  const nextPeriod = getScheduledDatesInPeriod(delivery, nextPeriodBounds.periodStart, nextPeriodBounds.periodEnd);
  const nextPeriodContext = {
    ...paidBillContext,
    nextPeriodStart: nextPeriodBounds.periodStart.toISOString(),
    nextPeriodEnd: nextPeriodBounds.periodEnd.toISOString(),
    scheduledDeliveryCount: nextPeriod.length,
  };
  console.info('[RecurringService] Recurring bill rollover period calculated', nextPeriodContext);
  if (!nextPeriod.length) {
    console.info('[RecurringService] Rollover skipped: no scheduled deliveries in next billing period', nextPeriodContext);
    return;
  }

  try {
    const trusted = await getTrustedProduct(delivery);
    assertRecurringDeliveryStock(trusted.inventoryItem, Number(delivery.quantity));
    const nextBill = await getOrCreateBill(delivery, nextOccurrence, trusted.unitPrice);
    console.info('[RecurringService] Recurring bill rollover completed', {
      ...nextPeriodContext,
      nextBillId: nextBill._id.toString(),
      nextBillAmount: nextBill.amount,
      nextBillStatus: nextBill.status,
    });
  } catch (error) {
    console.error('[RecurringService] Recurring bill rollover failed', { ...nextPeriodContext, error });
    throw error;
  }
};

// Plan creation needs the same server-owned bill calculation as the scheduler.
// Keeping it here makes the operation idempotent under the bill's unique index.
export const getOrCreateInitialRecurringBill = async (delivery: IRecurringDelivery) => {
  const trusted = await getTrustedProduct(delivery);
  assertRecurringDeliveryStock(trusted.inventoryItem, Number(delivery.quantity));
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
      let scheduledFor: Date | undefined;
      try {
        scheduledFor = delivery.nextDeliveryDate || now;
        const user = await User.findById(delivery.customerId);
        if (!user) {
          delivery.isActive = false;
          await delivery.save();
          result.failed += 1;
          result.errors.push({ deliveryId: delivery._id.toString(), error: 'Customer account not found' });
          continue;
        }
        const profile = await CustomerProfile.findOne({ userId: delivery.customerId });
        let trusted: Awaited<ReturnType<typeof getTrustedProduct>>;
        try {
          trusted = await getTrustedProduct(delivery);
          assertRecurringDeliveryStock(trusted.inventoryItem, Number(delivery.quantity));
        } catch (error) {
          if (isUnfulfillableInventoryError(error)) {
            await excludeUnfulfillableOccurrenceFromBill(delivery, scheduledFor);
          }
          throw error;
        }
        const bill = await getOrCreateBill(delivery, scheduledFor, trusted.unitPrice);
        let order = await Order.findOne({ recurringDeliveryId: delivery._id, deliverySlot: scheduledFor });
        let orderWasCreated = false;
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
          orderWasCreated = true;
          result.succeeded += 1;
          result.ordersCreated.push(order._id.toString());
        } else if (!order.recurringBillId) {
          order.recurringBillId = bill._id;
          await order.save();
        }
        await restoreGeneratedOccurrenceToBill(delivery, scheduledFor, bill);
        await RecurringBill.updateOne({ _id: bill._id }, { $addToSet: { orderIds: order._id } });
        if (orderWasCreated) {
          const populatedOrder = await Order.findById(order._id)
            .populate('customerId', 'name phone')
            .populate('recurringBillId', 'amount status paymentMethod preferredPaymentMethod');
          void notifyOrderCreated(order);
          if (populatedOrder) {
            emitNewOrder(populatedOrder);
            await sendNotificationToStaff(populatedOrder).catch((error) => console.error('[RecurringService] Staff notification failed:', error));
          }
        }
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
