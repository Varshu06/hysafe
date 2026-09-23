import { IRecurringDelivery } from '../models/RecurringDelivery.model';

export type BillingFrequency = 'per_order' | 'weekly' | 'monthly';
export type SupportedFrequency = 'daily' | '2_per_week' | '3_per_week';

const DAY_MS = 24 * 60 * 60 * 1000;

export const normalizeFrequency = (frequency: string): SupportedFrequency | null => {
  if (frequency === 'daily') return 'daily';
  if (frequency === '2_per_week' || frequency === '2-per-week') return '2_per_week';
  if (frequency === '3_per_week' || frequency === '3-per-week') return '3_per_week';
  return null;
};

export const normalizeBillingFrequency = (value?: string): BillingFrequency | null => {
  if (value === 'per_order' || value === 'one-time') return 'per_order';
  if (value === 'weekly') return 'weekly';
  if (value === 'monthly') return 'monthly';
  return null;
};

const atStartOfDay = (value: Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const atEndOfDay = (value: Date): Date => {
  const date = atStartOfDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const dateKey = (value: Date): string => {
  const date = atStartOfDay(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const validateDeliveryDays = (frequency: SupportedFrequency, deliveryDays?: number[]): string | null => {
  if (frequency === 'daily') {
    return deliveryDays && deliveryDays.length > 0 ? 'Daily plans must not specify delivery days' : null;
  }
  const expected = frequency === '2_per_week' ? 2 : 3;
  if (!Array.isArray(deliveryDays) || deliveryDays.length !== expected) {
    return `${frequency} plans require exactly ${expected} selected weekdays`;
  }
  const uniqueDays = new Set(deliveryDays);
  if (uniqueDays.size !== expected || deliveryDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    return 'Delivery days must be unique weekday numbers from 0 (Sunday) through 6 (Saturday)';
  }
  return null;
};

export const getFirstScheduledDeliveryOnOrAfter = (
  value: Date,
  frequency: string,
  deliveryDays?: number[],
): Date => {
  const start = atStartOfDay(value);
  const normalized = normalizeFrequency(frequency);
  if (normalized === 'daily') return start;
  if ((normalized === '2_per_week' || normalized === '3_per_week') && deliveryDays?.length) {
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = new Date(start.getTime() + offset * DAY_MS);
      if (deliveryDays.includes(candidate.getDay())) return candidate;
    }
  }
  // Preserve legacy plans safely. New or updated plans cannot use these values.
  const legacyIntervals: Record<string, number> = { 'every-2-days': 2, '2-per-week': 3, '3-per-week': 2, weekly: 7 };
  return new Date(start.getTime() + (legacyIntervals[frequency] || 1) * DAY_MS);
};

export const getNextScheduledDelivery = (
  previous: Date,
  frequency: string,
  deliveryDays?: number[],
): Date => getFirstScheduledDeliveryOnOrAfter(new Date(atStartOfDay(previous).getTime() + DAY_MS), frequency, deliveryDays);

export const getBillingPeriod = (occurrence: Date, billingFrequency: BillingFrequency) => {
  const date = atStartOfDay(occurrence);
  if (billingFrequency === 'monthly') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { periodStart: start, periodEnd: atEndOfDay(end) };
  }
  if (billingFrequency === 'weekly') {
    const mondayOffset = (date.getDay() + 6) % 7;
    const start = new Date(date.getTime() - mondayOffset * DAY_MS);
    const end = new Date(start.getTime() + 6 * DAY_MS);
    return { periodStart: start, periodEnd: atEndOfDay(end) };
  }
  return { periodStart: date, periodEnd: atEndOfDay(date) };
};

export const getScheduledDatesInPeriod = (
  plan: Pick<IRecurringDelivery, 'frequency' | 'deliveryDays' | 'startDate' | 'endDate'>,
  periodStart: Date,
  periodEnd: Date,
): Date[] => {
  const dates: Date[] = [];
  const normalized = normalizeFrequency(plan.frequency);
  const planStart = atStartOfDay(plan.startDate);
  const planEnd = plan.endDate ? atEndOfDay(plan.endDate) : undefined;
  for (let candidate = atStartOfDay(periodStart); candidate <= periodEnd; candidate = new Date(candidate.getTime() + DAY_MS)) {
    if (candidate < planStart || (planEnd && candidate > planEnd)) continue;
    if (normalized === 'daily' || ((normalized === '2_per_week' || normalized === '3_per_week') && plan.deliveryDays?.includes(candidate.getDay()))) {
      dates.push(new Date(candidate));
    }
  }
  return dates;
};

export const isBillOverdue = (dueDate: Date, now: Date = new Date()): boolean => atStartOfDay(now) > atStartOfDay(dueDate);

export const calculateRecurringBillAmount = (unitPrice: number, quantityPerDelivery: number, deliveryCount: number): number =>
  unitPrice * quantityPerDelivery * deliveryCount;

export const isOfflinePaymentMethod = (value: unknown): value is 'cash' | 'shop' => value === 'cash' || value === 'shop';

export const canCustomerConfirmBill = (status: string): boolean => status === 'pending' || status === 'confirmed';

export const canRecordRecurringBillPayment = (status: string): boolean => status === 'confirmed' || status === 'overdue';

export const isFullBillPayment = (amount: unknown, billAmount: number): boolean =>
  Number.isFinite(Number(amount)) && Number(amount) === billAmount;

export const recurringBillIdentity = (
  recurringDeliveryId: string,
  billingFrequency: BillingFrequency,
  periodStart: Date,
  occurrenceDateKey: string,
): string => `${recurringDeliveryId}:${billingFrequency}:${dateKey(periodStart)}:${occurrenceDateKey}`;

export const shouldAutoMarkOrderPaidOnDelivery = (isRecurring?: boolean): boolean => !isRecurring;
