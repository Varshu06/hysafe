import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database';
import { User } from './src/models/User.model';
import { CustomerProfile } from './src/models/CustomerProfile.model';
import { InventoryItem } from './src/models/InventoryItem.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { Order } from './src/models/Order.model';
import {
  processDueRecurringDeliveries,
  calculateNextDeliveryDate,
} from './src/services/recurringDelivery.service';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
};

const runTest = async () => {
  console.log('🧪 Starting Recurring Delivery Test Suite...');
  await connectDatabase();

  const testPhone = `+9199999${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    // 1. Create a test customer
    const user = await User.create({
      phone: testPhone,
      password: 'TestPassword123!',
      name: 'Test Recurring Customer',
      role: 'customer',
      isActive: true,
      address: '123 Water Way, Chennai',
    });

    const profile = await CustomerProfile.create({
      userId: user._id,
      name: user.name,
      phone: user.phone,
      paymentTerms: 'weekly',
      creditLimit: 5000,
      currentBalance: 0,
      isActive: true,
    });

    // 2. Fetch existing product or create test product
    let product = await InventoryItem.findOne({ available: true });
    let createdProduct = false;
    if (!product) {
      const uniqueVolume = `Test-${Date.now()}`;
      product = await InventoryItem.create({
        name: 'Test Premium Water Can',
        volume: uniqueVolume,
        quantity: 100,
        minStock: 10,
        price: 90,
        deliveryCharge: 15,
        available: true,
        lastRestocked: new Date(),
      });
      createdProduct = true;
    }

    // 3. Test calculation of next delivery dates
    const now = new Date('2026-09-17T12:00:00Z');
    const nextDaily = calculateNextDeliveryDate(now, 'daily');
    assert(
      nextDaily.getDate() === now.getDate() + 1,
      'calculateNextDeliveryDate daily adds 1 day'
    );

    const nextEvery2Days = calculateNextDeliveryDate(now, 'every-2-days');
    assert(
      nextEvery2Days.getDate() === now.getDate() + 2,
      'calculateNextDeliveryDate every-2-days adds 2 days'
    );

    const nextWeekly = calculateNextDeliveryDate(now, 'weekly');
    assert(
      nextWeekly.getDate() === now.getDate() + 7,
      'calculateNextDeliveryDate weekly adds 7 days'
    );

    // 4. Create a recurring delivery that is due now
    const pastDate = new Date(Date.now() - 1000 * 60); // 1 minute in the past
    const delivery = await RecurringDelivery.create({
      customerId: user._id,
      productId: product._id.toString(),
      productName: product.name,
      quantity: 5,
      frequency: 'daily',
      startDate: pastDate,
      nextDeliveryDate: pastDate,
      isActive: true,
      paymentTerms: 'weekly',
      deliveryAddress: '123 Water Way, Chennai',
      specialInstructions: 'Leave by front gate',
    });

    assert(delivery.isActive === true, 'Recurring delivery created and active');

    // 5. Run processDueRecurringDeliveries
    console.log('🔄 Running processDueRecurringDeliveries()...');
    const result = await processDueRecurringDeliveries();

    assert(result.succeeded >= 1, `At least 1 recurring delivery processed (succeeded: ${result.succeeded})`);
    assert(result.ordersCreated.length >= 1, 'At least 1 order was generated');

    // 6. Verify the created Order
    const createdOrderId = result.ordersCreated[result.ordersCreated.length - 1];
    const generatedOrder = await Order.findById(createdOrderId);

    assert(Boolean(generatedOrder), 'Generated order exists in database');
    assert(generatedOrder?.customerId.toString() === user._id.toString(), 'Order customer matches');
    assert(generatedOrder?.quantity === 5, 'Order quantity matches recurring quantity (5)');
    assert(generatedOrder?.isRecurring === true, 'Order has isRecurring = true');
    assert(
      generatedOrder?.recurringDeliveryId?.toString() === delivery._id.toString(),
      'Order recurringDeliveryId links to RecurringDelivery record'
    );
    assert(generatedOrder?.status === 'pending', 'Order status is pending');
    const expectedPrice = product.price * 5 + (product.deliveryCharge ?? 0);
    assert(generatedOrder?.price === expectedPrice, `Order total price matches formula (expected ${expectedPrice}, got ${generatedOrder?.price})`);

    // 7. Verify nextDeliveryDate has advanced
    const updatedDelivery = await RecurringDelivery.findById(delivery._id);
    assert(
      updatedDelivery!.nextDeliveryDate! > now,
      `nextDeliveryDate has advanced into the future (new date: ${updatedDelivery?.nextDeliveryDate?.toISOString()})`
    );

    // 8. Test Pause and Resume logic
    updatedDelivery!.isActive = false;
    await updatedDelivery!.save();
    assert(updatedDelivery!.isActive === false, 'Delivery paused (isActive = false)');

    // Run processor again when paused - should not generate order for paused delivery
    const pausedResult = await processDueRecurringDeliveries();
    const orderCountAfterPause = await Order.countDocuments({ recurringDeliveryId: delivery._id });
    assert(orderCountAfterPause === 1, 'Paused delivery did not generate new orders');

    // 9. Clean up test data
    await Order.deleteMany({ customerId: user._id });
    await RecurringDelivery.deleteMany({ customerId: user._id });
    await CustomerProfile.deleteMany({ userId: user._id });
    if (createdProduct) {
      await InventoryItem.findByIdAndDelete(product._id);
    }
    await User.findByIdAndDelete(user._id);

    console.log('🧹 Cleaned up test data.');
    console.log('🎉 All Recurring Delivery backend tests passed successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Test error:', err);
    process.exit(1);
  }
};

runTest();
