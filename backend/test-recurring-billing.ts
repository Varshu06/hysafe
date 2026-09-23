import assert from 'assert';
import {
  calculateRecurringBillAmount,
  canCustomerConfirmBill,
  canRecordRecurringBillPayment,
  getBillingPeriod,
  getFirstScheduledDeliveryOnOrAfter,
  getNextScheduledDelivery,
  getScheduledDatesInPeriod,
  isBillOverdue,
  isFullBillPayment,
  isOfflinePaymentMethod,
  recurringBillIdentity,
  shouldAutoMarkOrderPaidOnDelivery,
  validateDeliveryDays,
} from './src/services/recurringBilling.service';

const date = (value: string) => new Date(`${value}T12:00:00`);
const plan = (frequency: any, deliveryDays: number[] = []) => ({
  frequency,
  deliveryDays,
  startDate: date('2026-09-01'),
  endDate: undefined,
});

// Scheduling: weekday selection is calendar based, not an interval approximation.
assert.equal(validateDeliveryDays('daily', undefined), null);
assert.equal(validateDeliveryDays('2_per_week', [1, 4]), null);
assert.equal(validateDeliveryDays('3_per_week', [1, 3, 5]), null);
assert.ok(validateDeliveryDays('2_per_week', [1]));
assert.ok(validateDeliveryDays('3_per_week', [1, 1, 5]));
assert.equal(getFirstScheduledDeliveryOnOrAfter(date('2026-09-01'), '2_per_week', [1, 4]).getDay(), 4);
assert.equal(getNextScheduledDelivery(date('2026-09-03'), '2_per_week', [1, 4]).getDay(), 1);

// Weekly periods are Monday-Sunday; monthly periods use real calendar boundaries.
const weekly = getBillingPeriod(date('2026-09-16'), 'weekly');
assert.equal(weekly.periodStart.getDay(), 1);
assert.equal(weekly.periodEnd.getDay(), 0);
const monthly = getBillingPeriod(date('2026-02-12'), 'monthly');
assert.equal(monthly.periodStart.getDate(), 1);
assert.equal(monthly.periodEnd.getDate(), 28);
const weeklyDates = getScheduledDatesInPeriod(plan('3_per_week', [1, 3, 5]) as any, weekly.periodStart, weekly.periodEnd);
assert.deepEqual(weeklyDates.map((value) => value.getDay()), [1, 3, 5]);

// Amount uses trusted unit price x per-delivery quantity x scheduled count.
assert.equal(calculateRecurringBillAmount(50, 1, 3), 150);
assert.equal(calculateRecurringBillAmount(50, 2, 3), 300);

// Confirmation and collection are distinct state transitions; payment is full and offline only.
assert.equal(canCustomerConfirmBill('pending'), true);
assert.equal(canCustomerConfirmBill('paid'), false);
assert.equal(canRecordRecurringBillPayment('confirmed'), true);
assert.equal(canRecordRecurringBillPayment('overdue'), true);
assert.equal(canRecordRecurringBillPayment('paid'), false);
assert.equal(isOfflinePaymentMethod('cash'), true);
assert.equal(isOfflinePaymentMethod('shop'), true);
assert.equal(isOfflinePaymentMethod('other_offline'), false);
assert.equal(isFullBillPayment(150, 150), true);
assert.equal(isFullBillPayment(149, 150), false);
assert.equal(isBillOverdue(date('2026-09-15'), date('2026-09-16')), true);
assert.equal(isBillOverdue(date('2026-09-16'), date('2026-09-16')), false);

// Idempotency key and delivery/payment separation guard duplicate billing and
// ensure delivering a recurring order cannot mark its bill as paid.
assert.equal(
  recurringBillIdentity('plan-1', 'weekly', weekly.periodStart, ''),
  recurringBillIdentity('plan-1', 'weekly', weekly.periodStart, ''),
);
assert.equal(shouldAutoMarkOrderPaidOnDelivery(true), false);
assert.equal(shouldAutoMarkOrderPaidOnDelivery(false), true);

console.log('Recurring billing business-rule tests passed.');
