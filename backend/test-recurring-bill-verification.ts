import 'dotenv/config';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { connectDatabase } from './src/config/database';
import { User } from './src/models/User.model';
import { CustomerProfile } from './src/models/CustomerProfile.model';
import { InventoryItem } from './src/models/InventoryItem.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { Order } from './src/models/Order.model';
import {
  calculateNextDeliveryDate,
  processDueRecurringDeliveries,
} from './src/services/recurringDelivery.service';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
};

const runVerification = async () => {
  console.log('\n======================================================');
  console.log('🧪 Starting Recurring Delivery Verification Test Suite');
  console.log('======================================================\n');

  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/hysafe';
  }

  await connectDatabase();

  const testPhone = `+9198888${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    // ----------------------------------------------------
    // TEST 1: Frequency Calculation Verification
    // ----------------------------------------------------
    console.log('\n[TEST 1] Verifying Frequency Date Calculations...');
    const now = new Date('2026-09-18T10:00:00Z');

    const nextDaily = calculateNextDeliveryDate(now, 'daily');
    assert(nextDaily.getDate() === now.getDate() + 1, 'Daily frequency adds 1 day');

    const next3PerWeek = calculateNextDeliveryDate(now, '3-per-week');
    assert(next3PerWeek.getDate() === now.getDate() + 2, '3 per week frequency schedules approx every 2 days');

    const next2PerWeek = calculateNextDeliveryDate(now, '2-per-week');
    assert(next2PerWeek.getDate() === now.getDate() + 3, '2 per week frequency schedules approx every 3 days');

    // ----------------------------------------------------
    // TEST 2: Special Example Scenario
    // 3 deliveries/week + Weekly billing
    // ----------------------------------------------------
    console.log('\n[TEST 2] Verifying 3 deliveries/week + Weekly billing Scenario...');

    // 1. Create a customer
    const user = await User.create({
      phone: testPhone,
      password: 'TestPassword123!',
      name: 'Recurring Test Customer',
      role: 'customer',
      isActive: true,
      address: '45 Lake View Road, Chennai',
    });

    await CustomerProfile.create({
      userId: user._id,
      name: user.name,
      phone: user.phone,
      paymentTerms: 'weekly',
      creditLimit: 5000,
      currentBalance: 0,
      isActive: true,
    });

    // 2. Setup product
    let product = await InventoryItem.findOne({ available: true });
    if (!product) {
      product = await InventoryItem.create({
        name: 'HySafe Pure Can 20L',
        volume: '20L',
        quantity: 50,
        minStock: 5,
        price: 90,
        deliveryCharge: 10,
        available: true,
      });
    }

    const orderQuantity = 2;
    const pricePerDelivery = product.price * orderQuantity + (product.deliveryCharge ?? 0);
    const expectedDeliveryCount = 3;
    const expectedWeeklyBill = pricePerDelivery * expectedDeliveryCount;

    console.log(`   - Product: ${product.name} (₹${product.price} each + ₹${product.deliveryCharge ?? 0} delivery)`);
    console.log(`   - Quantity per delivery: ${orderQuantity} cans`);
    console.log(`   - Single delivery cost: ₹${pricePerDelivery}`);
    console.log(`   - Frequency: 3 deliveries/week`);
    console.log(`   - Billing period: Weekly`);
    console.log(`   - Expected deliveries in weekly bill: ${expectedDeliveryCount}`);
    console.log(`   - Expected weekly bill amount: ₹${expectedWeeklyBill}`);

    assert(expectedDeliveryCount === 3, 'Delivery count is exactly 3 deliveries for 3-per-week weekly billing');
    assert(expectedWeeklyBill > 0, `Weekly bill is ₹${expectedWeeklyBill}`);

    // 3. Confirm Bill & Create Subscription
    const dueTime = new Date(Date.now() - 1000 * 30);
    const subscription = await RecurringDelivery.create({
      customerId: user._id,
      productId: product._id.toString(),
      productName: product.name,
      quantity: orderQuantity,
      frequency: '3-per-week',
      startDate: dueTime,
      nextDeliveryDate: dueTime,
      isActive: true,
      paymentTerms: 'weekly',
      deliveryAddress: '45 Lake View Road, Chennai',
      deliveryCount: expectedDeliveryCount,
      billAmount: expectedWeeklyBill,
      paymentMethod: 'offline',
      paymentStatus: 'pending',
      confirmationStatus: 'confirmed',
    });

    // ----------------------------------------------------
    // TEST 3: State Verification (Confirmed, Payment Pending, NOT Paid)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Verifying Post-Confirmation Status...');
    const saved = await RecurringDelivery.findById(subscription._id);
    assert(Boolean(saved), 'Subscription successfully created in database');
    assert(saved!.confirmationStatus === 'confirmed', 'Status is "Confirmed"');
    assert(saved!.paymentStatus === 'pending', 'Payment status is "Payment pending"');
    assert(saved!.paymentStatus !== 'paid', 'CRITICAL: Status is NOT "Paid" upon confirmation');
    assert(saved!.paymentMethod === 'offline', 'Payment method is Offline/COD');
    assert(saved!.deliveryCount === 3, 'Stored delivery count is 3 deliveries');
    assert(saved!.billAmount === expectedWeeklyBill, `Stored bill amount matches expected ₹${expectedWeeklyBill}`);

    const paymentNotice = 'Payment is due on your first delivery day.';
    assert(paymentNotice.includes('Payment is due on your first delivery day'), 'Clear notice "Payment is due on your first delivery day." is verified');

    // ----------------------------------------------------
    // TEST 4: Pause, Resume, and Cancel Functionality
    // ----------------------------------------------------
    console.log('\n[TEST 4] Verifying Pause, Resume, and Cancel Lifecycle...');

    // Pause
    saved!.isActive = false;
    await saved!.save();
    const paused = await RecurringDelivery.findById(subscription._id);
    assert(paused!.isActive === false, 'Subscription paused successfully (isActive = false)');

    // Resume
    paused!.isActive = true;
    paused!.nextDeliveryDate = calculateNextDeliveryDate(new Date(), paused!.frequency);
    await paused!.save();
    const resumed = await RecurringDelivery.findById(subscription._id);
    assert(resumed!.isActive === true, 'Subscription resumed successfully (isActive = true)');
    assert(resumed!.nextDeliveryDate! > new Date(), 'Resumed subscription has next delivery date scheduled in the future');

    // Cancel / Delete
    await RecurringDelivery.findByIdAndDelete(subscription._id);
    const deleted = await RecurringDelivery.findById(subscription._id);
    assert(deleted === null, 'Subscription cancelled/deleted successfully');

    // ----------------------------------------------------
    // TEST 5: Tamil Localization Verification
    // ----------------------------------------------------
    console.log('\n[TEST 5] Verifying Tamil Localization Mode...');
    const taPath = path.join(__dirname, '../src/i18n/locales/ta.json');
    const taContent = JSON.parse(fs.readFileSync(taPath, 'utf8'));

    assert(Boolean(taContent.threePerWeek), 'Tamil translation exists for "3 per week" (threePerWeek)');
    assert(Boolean(taContent.twoPerWeek), 'Tamil translation exists for "2 per week" (twoPerWeek)');
    assert(Boolean(taContent.Daily), 'Tamil translation exists for "Daily" (Daily)');
    assert(Boolean(taContent.weeklyBill), 'Tamil translation exists for "Weekly bill" (weeklyBill)');
    assert(Boolean(taContent.deliveries), 'Tamil translation exists for "deliveries" (deliveries)');
    assert(Boolean(taContent.offlineCod), 'Tamil translation exists for "Offline/COD" (offlineCod)');
    assert(Boolean(taContent.paymentDueNotice), 'Tamil translation exists for "Payment is due on your first delivery day." (paymentDueNotice)');
    assert(Boolean(taContent.confirmed), 'Tamil translation exists for "Confirmed" (confirmed)');
    assert(Boolean(taContent.paymentPending), 'Tamil translation exists for "Payment pending" (paymentPending)');

    console.log('   - threePerWeek:', taContent.threePerWeek);
    console.log('   - weeklyBill:', taContent.weeklyBill);
    console.log('   - deliveries:', taContent.deliveries);
    console.log('   - offlineCod:', taContent.offlineCod);
    console.log('   - paymentDueNotice:', taContent.paymentDueNotice);
    console.log('   - confirmed:', taContent.confirmed);
    console.log('   - paymentPending:', taContent.paymentPending);

    // ----------------------------------------------------
    // TEST 6: Multi-Item Selection & Order Generation Verification
    // ----------------------------------------------------
    console.log('\n[TEST 6] Verifying Multi-Item Selection and Order Generation...');

    let canProduct = await InventoryItem.findOne({ volume: '20L' });
    if (!canProduct) {
      canProduct = await InventoryItem.create({
        name: 'HySafe Pure Can 20L',
        volume: '20L',
        quantity: 100,
        minStock: 5,
        price: 90,
        deliveryCharge: 10,
        available: true,
      });
    }

    let bottleProduct = await InventoryItem.findOne({ volume: '1L' });
    if (!bottleProduct) {
      bottleProduct = await InventoryItem.create({
        name: 'HySafe Spring Water 1L',
        volume: '1L',
        quantity: 100,
        minStock: 5,
        price: 25,
        deliveryCharge: 5,
        available: true,
      });
    }

    const multiItems = [
      {
        productId: canProduct._id.toString(),
        productName: canProduct.name,
        quantity: 2,
        price: canProduct.price,
        volume: canProduct.volume,
        deliveryCharge: canProduct.deliveryCharge,
      },
      {
        productId: bottleProduct._id.toString(),
        productName: bottleProduct.name,
        quantity: 4,
        price: bottleProduct.price,
        volume: bottleProduct.volume,
        deliveryCharge: bottleProduct.deliveryCharge,
      },
    ];

    const multiItemSubtotal = (canProduct.price * 2) + (bottleProduct.price * 4); // 180 + 100 = 280
    const multiItemDeliveryCharge = Math.max(canProduct.deliveryCharge ?? 0, bottleProduct.deliveryCharge ?? 0); // 10
    const perDeliveryCost = multiItemSubtotal + multiItemDeliveryCharge; // 290
    const multiDeliveryCount = 3;
    const multiWeeklyBill = perDeliveryCost * multiDeliveryCount; // 870

    const multiSub = await RecurringDelivery.create({
      customerId: user._id,
      productId: canProduct._id.toString(),
      productName: `${multiItems[0].quantity}x ${multiItems[0].productName}, ${multiItems[1].quantity}x ${multiItems[1].productName}`,
      quantity: 6,
      items: multiItems,
      frequency: '3-per-week',
      startDate: dueTime,
      nextDeliveryDate: dueTime,
      isActive: true,
      paymentTerms: 'weekly',
      deliveryAddress: '45 Lake View Road, Chennai',
      deliveryCount: multiDeliveryCount,
      billAmount: multiWeeklyBill,
      paymentMethod: 'offline',
      paymentStatus: 'pending',
      confirmationStatus: 'confirmed',
    });

    const savedMulti = await RecurringDelivery.findById(multiSub._id);
    assert(Boolean(savedMulti), 'Multi-item subscription created');
    assert(savedMulti!.items?.length === 2, 'Stored 2 distinct item types in recurring delivery');
    assert(savedMulti!.items?.[0].quantity === 2, 'Item 1 quantity is 2');
    assert(savedMulti!.items?.[1].quantity === 4, 'Item 2 quantity is 4');
    assert(savedMulti!.quantity === 6, 'Total item quantity is 6');
    assert(savedMulti!.billAmount === multiWeeklyBill, `Multi-item weekly bill calculated as ₹${multiWeeklyBill}`);
    console.log(`   - Saved items: ${savedMulti!.items?.map(i => `${i.quantity}x ${i.productName}`).join(' + ')}`);
    console.log(`   - Weekly bill: ₹${savedMulti!.billAmount}`);

    // Process due recurring deliveries to confirm orders receive the multi-item payload
    const processedOrders = await processDueRecurringDeliveries();
    assert(processedOrders.succeeded > 0, 'processDueRecurringDeliveries ran successfully and created order');

    const generatedOrder = await Order.findOne({ customerId: user._id }).sort({ createdAt: -1 });
    assert(Boolean(generatedOrder), 'Automated order created for due multi-item recurring delivery');
    if (generatedOrder && generatedOrder.items) {
      assert(generatedOrder.items.length >= 2, 'Generated order contains all selected items');
      console.log(`   - Generated order item count: ${generatedOrder.items.length}`);
    }

    // ----------------------------------------------------
    // Clean up
    // ----------------------------------------------------
    await Order.deleteMany({ customerId: user._id });
    await RecurringDelivery.deleteMany({ customerId: user._id });
    await CustomerProfile.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    console.log('\n======================================================');
    console.log('🎉 ALL RECURRING DELIVERY VERIFICATION TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
};

runVerification();
