import assert from 'assert';
import { Order } from './src/models/Order.model';
import { RecurringBill } from './src/models/RecurringBill.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { excludeUnfulfillableOccurrenceFromBill, restoreGeneratedOccurrenceToBill } from './src/services/recurringDelivery.service';

const originals: Array<{ target: any; key: string; value: any }> = [];
const replace = (target: any, key: string, value: any) => {
  originals.push({ target, key, value: target[key] });
  target[key] = value;
};

const date = (value: string) => new Date(`${value}T00:00:00`);
const sameDate = (left: Date, right: Date) => left.getTime() === right.getTime();

const run = async () => {
  const scheduled = [date('2026-09-28'), date('2026-09-29'), date('2026-09-30')];
  const bill: any = {
    _id: 'bill-1',
    recurringDeliveryId: 'plan-1',
    billingFrequency: 'weekly',
    periodStart: date('2026-09-28'),
    occurrenceDateKey: '',
    dueDate: scheduled[0],
    scheduledDeliveryDates: scheduled.slice(),
    unitPrice: 30,
    quantityPerDelivery: 2,
    deliveryCount: 3,
    amount: 180,
    status: 'confirmed',
    orderIds: [],
  };
let orderForOccurrence: any = null;
let billDeleted = false;

  replace(RecurringBill, 'findOne', async () => !billDeleted && bill.scheduledDeliveryDates.length ? bill : null);
  replace(RecurringBill, 'findOneAndUpdate', async (filter: any, update: any) => {
    const dateInFilter: Date = filter.scheduledDeliveryDates;
    if (bill.status === 'paid' || !bill.scheduledDeliveryDates.some((value: Date) => sameDate(value, dateInFilter))) return null;
    bill.scheduledDeliveryDates = bill.scheduledDeliveryDates.filter((value: Date) => !sameDate(value, update.$pull.scheduledDeliveryDates));
    bill.deliveryCount += update.$inc.deliveryCount;
    bill.amount += update.$inc.amount;
    return bill;
  });
  replace(RecurringBill, 'updateOne', async (filter: any, update: any) => {
    const occurrence: Date = update.$addToSet.scheduledDeliveryDates;
    if (bill.status === 'paid' || bill.scheduledDeliveryDates.some((value: Date) => sameDate(value, occurrence))) return { modifiedCount: 0 };
    bill.scheduledDeliveryDates.push(occurrence);
    bill.deliveryCount += update.$inc.deliveryCount;
    bill.amount += update.$inc.amount;
    if (occurrence < bill.dueDate) bill.dueDate = occurrence;
    return { modifiedCount: 1 };
  });
  replace(RecurringBill, 'deleteOne', async () => { billDeleted = true; return { deletedCount: 1 }; });
  replace(Order, 'findOne', async () => orderForOccurrence);

  const plan: any = {
    _id: 'plan-1',
    billingFrequency: 'weekly',
    paymentTerms: 'weekly',
  };

  try {
    await excludeUnfulfillableOccurrenceFromBill(plan as typeof RecurringDelivery.prototype, scheduled[1]);
    assert.equal(bill.amount, 120, 'an undeliverable future delivery is removed from the unpaid amount');
    assert.equal(bill.deliveryCount, 2, 'delivery count is reduced once');
    assert.deepEqual(bill.scheduledDeliveryDates, [scheduled[0], scheduled[2]], 'only the unfulfillable date is removed');

    await excludeUnfulfillableOccurrenceFromBill(plan as typeof RecurringDelivery.prototype, scheduled[1]);
    assert.equal(bill.amount, 120, 'repeated reconciliation does not subtract the same occurrence twice');
    assert.equal(bill.deliveryCount, 2, 'repeated reconciliation does not decrement delivery count twice');

    bill.status = 'paid';
    const paidSnapshot = { amount: bill.amount, deliveryCount: bill.deliveryCount, dates: bill.scheduledDeliveryDates.slice() };
    await excludeUnfulfillableOccurrenceFromBill(plan as typeof RecurringDelivery.prototype, scheduled[2]);
    assert.equal(bill.amount, paidSnapshot.amount, 'paid bill amount is immutable');
    assert.equal(bill.deliveryCount, paidSnapshot.deliveryCount, 'paid bill count is immutable');
    assert.deepEqual(bill.scheduledDeliveryDates, paidSnapshot.dates, 'paid bill schedule history is immutable');

    bill.status = 'confirmed';
    const retryOccurrence = scheduled[1];
    await restoreGeneratedOccurrenceToBill(plan as typeof RecurringDelivery.prototype, retryOccurrence, bill);
    assert.equal(bill.amount, 180, 'a successfully generated retry is restored to the outstanding amount');
    assert.equal(bill.deliveryCount, 3, 'a successfully generated retry restores the count');
    assert.ok(bill.scheduledDeliveryDates.some((value: Date) => sameDate(value, retryOccurrence)), 'a successfully generated retry is restored to bill dates');

    // A second worker/retry with a stale bill snapshot is fenced by the atomic $ne query.
    const staleSnapshot = { ...bill, scheduledDeliveryDates: [scheduled[0], scheduled[2]], amount: 120, deliveryCount: 2 };
    await restoreGeneratedOccurrenceToBill(plan as typeof RecurringDelivery.prototype, retryOccurrence, staleSnapshot);
    assert.equal(bill.amount, 180, 'repeated restoration remains idempotent');
    assert.equal(bill.deliveryCount, 3, 'repeated restoration cannot duplicate a delivery count');

    bill.status = 'confirmed';
    bill.scheduledDeliveryDates = [scheduled[0]];
    bill.deliveryCount = 1;
    bill.amount = 60;
    orderForOccurrence = null;
    // A one-occurrence unpaid bill is removed instead of retaining a payable amount for an undeliverable delivery.
    replace(RecurringBill, 'deleteOne', async (filter: any) => {
      if (filter.orderIds.$size === 0 && filter.scheduledDeliveryDates instanceof Date) { billDeleted = true; return { deletedCount: 1 }; }
      return { deletedCount: 0 };
    });
    await excludeUnfulfillableOccurrenceFromBill(plan as typeof RecurringDelivery.prototype, scheduled[0]);
    assert.equal(billDeleted, true, 'single-occurrence unpaid bill is deleted instead of remaining payable');

    console.log('Recurring bill reconciliation tests passed.');
  } finally {
    for (const original of originals.reverse()) original.target[original.key] = original.value;
  }
};

run().catch((error) => {
  console.error('Recurring bill reconciliation tests failed:', error);
  process.exitCode = 1;
});
