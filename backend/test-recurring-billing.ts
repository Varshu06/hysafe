import assert from 'assert';
import {
  calculateRecurringBill,
  calculateRecurringBillAmount,
  dateKey,
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
const weekStart = date('2026-09-14');
const weekEnd = date('2026-09-20');
const dailyWeek = getScheduledDatesInPeriod(plan('daily') as any, weekStart, weekEnd);
assert.equal(calculateRecurringBillAmount(30, 1, dailyWeek.length), 210);
const twoDayWeek = getScheduledDatesInPeriod(plan('2_per_week', [1, 4]) as any, weekStart, weekEnd);
assert.equal(twoDayWeek.length, 2);
assert.equal(calculateRecurringBillAmount(30, 1, twoDayWeek.length), 60);
const threeDayWeek = getScheduledDatesInPeriod(plan('3_per_week', [1, 3, 5]) as any, weekStart, weekEnd);
assert.equal(calculateRecurringBillAmount(30, 1, threeDayWeek.length), 90);
const monthStart = date('2026-09-01');
const monthEnd = date('2026-09-30');
const dailyMonth = getScheduledDatesInPeriod(plan('daily') as any, monthStart, monthEnd);
assert.equal(dailyMonth.length, 30);
assert.equal(calculateRecurringBillAmount(30, 1, dailyMonth.length), 900);
const twoDayMonth = getScheduledDatesInPeriod(plan('2_per_week', [1, 4]) as any, monthStart, monthEnd);
assert.equal(twoDayMonth.length, 8);
assert.equal(calculateRecurringBillAmount(30, 1, twoDayMonth.length), 240);
const threeDayMonth = getScheduledDatesInPeriod(plan('3_per_week', [1, 3, 5]) as any, monthStart, monthEnd);
assert.equal(threeDayMonth.length, 13);
assert.equal(calculateRecurringBillAmount(30, 1, threeDayMonth.length), 390);

// The initial bill includes only scheduled dates on or after the plan start.
const sundayFirstBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: '2_per_week',
  deliveryDays: [0, 2], // Sunday and Tuesday
  billingFrequency: 'weekly',
  startDate: date('2026-09-19'), // Saturday
  endDate: date('2026-09-30'),
  occurrence: date('2026-09-20'), // Sunday
});
assert.deepEqual(sundayFirstBill.scheduledDeliveryDates.map(dateKey), ['2026-09-20']);
assert.equal(sundayFirstBill.amount, 30);

// Plan end dates clip an otherwise normal weekly or calendar-month period.
const wednesdayEndBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'weekly',
  startDate: date('2026-09-14'),
  endDate: date('2026-09-16'),
  occurrence: date('2026-09-14'),
});
assert.deepEqual(wednesdayEndBill.scheduledDeliveryDates.map(dateKey), ['2026-09-14', '2026-09-15', '2026-09-16']);
assert.equal(wednesdayEndBill.amount, 90);

const monthlyEarlyEndBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'monthly',
  startDate: date('2026-09-01'),
  endDate: date('2026-09-10'),
  occurrence: date('2026-09-01'),
});
assert.equal(monthlyEarlyEndBill.scheduledDeliveryDates.length, 10);
assert.deepEqual(monthlyEarlyEndBill.scheduledDeliveryDates.map(dateKey).slice(-1), ['2026-09-10']);
assert.equal(monthlyEarlyEndBill.amount, 300);

const septemberPartialMonthBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'monthly',
  startDate: date('2026-09-20'),
  endDate: date('2026-09-30'),
  occurrence: date('2026-09-20'),
});
assert.equal(septemberPartialMonthBill.scheduledDeliveryDates.length, 11);
assert.deepEqual(septemberPartialMonthBill.scheduledDeliveryDates.map(dateKey).slice(0, 1), ['2026-09-20']);
assert.equal(septemberPartialMonthBill.amount, 330);

// Selected weekdays outside the active plan range are excluded.
const selectedWeekdayBoundaryBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: '2_per_week',
  deliveryDays: [1, 4], // Monday and Thursday
  billingFrequency: 'weekly',
  startDate: date('2026-09-19'), // Saturday
  endDate: date('2026-09-24'), // Thursday
  occurrence: date('2026-09-21'),
});
assert.deepEqual(selectedWeekdayBoundaryBill.scheduledDeliveryDates.map(dateKey), ['2026-09-21', '2026-09-24']);
assert.equal(selectedWeekdayBoundaryBill.amount, 60);

// Empty schedules and per-order occurrences outside the plan are rejected;
// neither path fabricates an out-of-range delivery date.
assert.throws(() => calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: '2_per_week',
  deliveryDays: [1, 4],
  billingFrequency: 'weekly',
  startDate: date('2026-09-19'),
  endDate: date('2026-09-20'),
  occurrence: date('2026-09-24'),
}), /No scheduled deliveries within the recurring plan billing period/);
assert.throws(() => calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'per_order',
  startDate: date('2026-09-19'),
  endDate: date('2026-09-20'),
  occurrence: date('2026-09-21'),
}), /No scheduled deliveries within the recurring plan billing period/);
assert.throws(() => calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'weekly',
  startDate: date('2026-09-14'),
  endDate: new Date(Number.NaN),
  occurrence: date('2026-09-14'),
}), /No scheduled deliveries within the recurring plan billing period/);

// Preview and persisted bill creation both consume this single calculation.
const weeklyPreview = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'weekly',
  startDate: weekStart,
  occurrence: weekStart,
});
assert.equal(weeklyPreview.amount, 210);
assert.equal(weeklyPreview.deliveryCount, 7);
assert.equal(dateKey(weeklyPreview.dueDate), dateKey(weekStart));
const monthlySelectedDaysPreview = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 2,
  frequency: '2_per_week',
  deliveryDays: [1, 4],
  billingFrequency: 'monthly',
  startDate: monthStart,
  occurrence: date('2026-09-03'),
});
assert.equal(monthlySelectedDaysPreview.deliveryCount, 8);
assert.equal(monthlySelectedDaysPreview.amount, 480);
// Rollover recalculates each real billing period independently. The final
// weekly period is clipped by the plan end date; monthly periods use calendar
// month boundaries and selected weekdays only.
const weekOneBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'weekly',
  startDate: date('2026-09-28'),
  endDate: date('2026-10-09'),
  occurrence: date('2026-09-28'),
});
const weekTwoBill = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: 'daily',
  billingFrequency: 'weekly',
  startDate: date('2026-09-28'),
  endDate: date('2026-10-09'),
  occurrence: date('2026-10-05'),
});
assert.equal(weekOneBill.amount, 210);
assert.equal(weekTwoBill.deliveryCount, 5);
assert.equal(weekTwoBill.amount, 150);
const octoberSelectedWeekdays = calculateRecurringBill({
  unitPrice: 30,
  quantityPerDelivery: 1,
  frequency: '2_per_week',
  deliveryDays: [1, 4],
  billingFrequency: 'monthly',
  startDate: date('2026-09-01'),
  endDate: date('2026-10-31'),
  occurrence: date('2026-10-01'),
});
assert.equal(dateKey(octoberSelectedWeekdays.periodStart), '2026-10-01');
assert.equal(octoberSelectedWeekdays.deliveryCount, 9);
assert.equal(octoberSelectedWeekdays.amount, 270);
const perOrderPreview = calculateRecurringBill({
  unitPrice: 45,
  quantityPerDelivery: 2,
  frequency: 'daily',
  billingFrequency: 'per_order',
  startDate: weekStart,
  occurrence: weekStart,
});
assert.equal(perOrderPreview.deliveryCount, 1);
assert.equal(perOrderPreview.amount, 90);

// Amount uses trusted unit price x per-delivery quantity x scheduled count.
assert.equal(calculateRecurringBillAmount(50, 1, 3), 150);
assert.equal(calculateRecurringBillAmount(50, 2, 3), 300);
assert.equal(calculateRecurringBillAmount(30, 2, 7), 420);
assert.equal(calculateRecurringBillAmount(45, 1, 2), 90);

// Confirmation and collection are distinct state transitions; payment is full and offline only.
assert.equal(canCustomerConfirmBill('pending'), true);
assert.equal(canCustomerConfirmBill('paid'), false);
// Legacy pending bills remain payable without the retired customer confirm step.
assert.equal(canRecordRecurringBillPayment('pending'), true);
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
