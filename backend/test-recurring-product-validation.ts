import assert from 'assert';
import {
  assertRecurringDeliveryStock,
  getTrustedInventoryPrice,
} from './src/services/recurringDelivery.service';
import { getProductAvailabilityState } from './src/services/productAvailability.service';
import { calculateRecurringBill } from './src/services/recurringBilling.service';

const availableProduct = { _id: 'inventory-1', name: '20L Water', available: true, quantity: 10, price: 30, deliveryCharge: 0 };

assert.equal(getTrustedInventoryPrice(availableProduct), 30);
assertRecurringDeliveryStock(availableProduct, 2);
assert.equal(getProductAvailabilityState(availableProduct, 2), 'available');
assert.equal(getProductAvailabilityState({ ...availableProduct, quantity: 0 }), 'unavailable');
assert.equal(getProductAvailabilityState({ ...availableProduct, quantity: 1 }, 2), 'unavailable');
assert.equal(getProductAvailabilityState({ ...availableProduct, available: false }), 'unavailable');
assert.equal(getProductAvailabilityState({ ...availableProduct, comingSoon: true }), 'coming_soon');
assert.equal(getProductAvailabilityState({ ...availableProduct, comingSoon: true, quantity: 0 }), 'coming_soon');
assert.equal(getProductAvailabilityState({ ...availableProduct, comingSoon: true, available: false }), 'coming_soon');
const depletedProduct = { ...availableProduct, quantity: 0 };
assert.equal(getProductAvailabilityState(depletedProduct), 'unavailable');
assert.equal(getProductAvailabilityState({ ...depletedProduct, quantity: 10 }), 'available');
const bill = calculateRecurringBill({
  unitPrice: getTrustedInventoryPrice(availableProduct),
  quantityPerDelivery: 2,
  frequency: 'daily',
  billingFrequency: 'weekly',
  startDate: new Date('2026-09-28T00:00:00'),
  occurrence: new Date('2026-09-28T00:00:00'),
});
assert.equal(bill.amount, 420);

for (const invalidPrice of [undefined, null, '', NaN, Infinity, -1]) {
  assert.throws(
    () => getTrustedInventoryPrice({ ...availableProduct, price: invalidPrice }),
    /valid inventory price/,
  );
}
assert.throws(() => getTrustedInventoryPrice(null), /not found/);
assert.throws(() => getTrustedInventoryPrice({ ...availableProduct, available: false }), /unavailable/);
assert.throws(() => getTrustedInventoryPrice({ ...availableProduct, available: undefined }), /unavailable/);
assert.throws(() => getTrustedInventoryPrice({ ...availableProduct, comingSoon: true }), /coming soon/);
assert.throws(() => assertRecurringDeliveryStock({ ...availableProduct, quantity: 1 }, 2), /Insufficient inventory stock/);
assert.throws(() => assertRecurringDeliveryStock({ quantity: 10 }, 0), /quantity or inventory is invalid/);
assert.throws(() => assertRecurringDeliveryStock({ ...availableProduct, comingSoon: true }, 2), /coming soon/);
assert.throws(() => assertRecurringDeliveryStock({ ...availableProduct, available: false }, 2), /unavailable/);

console.log('Recurring product validation tests passed.');
