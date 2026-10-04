import assert from 'assert';
import { canStaffHandleRecurringBill } from './src/services/recurringBilling.service';

const staffA = 'staff-a';
const staffB = 'staff-b';
const staffC = 'staff-c';
const planId = 'plan-1';
const billId = 'bill-1';
const monday = new Date('2026-09-28T00:00:00.000Z');
const wednesday = new Date('2026-09-30T00:00:00.000Z');
const friday = new Date('2026-10-02T00:00:00.000Z');

const bill = (billingFrequency: 'per_order' | 'weekly' | 'monthly', dates: Date[]) => ({
  _id: billId,
  recurringDeliveryId: planId,
  billingFrequency,
  scheduledDeliveryDates: dates,
  orderIds: ['order-1', 'order-2', 'order-3'],
});
const order = (id: string, assignedStaffId: string, deliverySlot: Date) => ({
  _id: id,
  recurringBillId: billId,
  recurringDeliveryId: planId,
  assignedStaffId,
  deliverySlot,
  isRecurring: true,
});

const perOrderBill = bill('per_order', [monday]);
assert.equal(canStaffHandleRecurringBill(perOrderBill, order('order-1', staffA, monday), staffA), true);
assert.equal(canStaffHandleRecurringBill(perOrderBill, order('order-1', staffA, monday), staffB), false);

const weeklyBill = bill('weekly', [monday, wednesday, friday]);
assert.equal(canStaffHandleRecurringBill(weeklyBill, order('order-1', staffA, monday), staffA), true);
assert.equal(canStaffHandleRecurringBill(weeklyBill, order('order-2', staffB, wednesday), staffB), false);
assert.equal(canStaffHandleRecurringBill(weeklyBill, order('order-3', staffC, friday), staffC), false);

const monthlyBill = bill('monthly', [monday, wednesday, friday]);
assert.equal(canStaffHandleRecurringBill(monthlyBill, order('order-1', staffA, monday), staffA), true);
assert.equal(canStaffHandleRecurringBill(monthlyBill, order('order-2', staffB, wednesday), staffB), false);
assert.equal(canStaffHandleRecurringBill(monthlyBill, order('order-3', staffC, friday), staffC), false);

// Knowing a bill ID alone is insufficient: the order must be assigned, linked,
// recurring, and scheduled on the bill's first delivery date.
assert.equal(canStaffHandleRecurringBill(weeklyBill, order('order-1', staffA, monday), staffB), false);
assert.equal(canStaffHandleRecurringBill(weeklyBill, { ...order('order-1', staffA, monday), recurringBillId: 'other-bill', _id: 'other-order' }, staffA), false);
assert.equal(canStaffHandleRecurringBill(weeklyBill, { ...order('order-1', staffA, monday), recurringDeliveryId: 'other-plan' }, staffA), false);
assert.equal(canStaffHandleRecurringBill(weeklyBill, { ...order('order-1', staffA, monday), isRecurring: false }, staffA), false);

console.log('Recurring bill staff authorization tests passed.');
