import assert from 'assert';
import mongoose from 'mongoose';
import { createRecurringDelivery } from './src/controllers/recurringDelivery.controller';
import { InventoryItem } from './src/models/InventoryItem.model';
import { Notification } from './src/models/Notification.model';
import { RecurringBill } from './src/models/RecurringBill.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { User } from './src/models/User.model';

const mongoUri = process.env.MONGODB_URI_TEST;
if (!mongoUri) {
  console.log('SKIPPED: set MONGODB_URI_TEST to an isolated database whose name ends in _test.');
  process.exit(0);
}

const databaseName = decodeURIComponent(new URL(mongoUri).pathname.replace(/^\//, ''));
if (!/_test$/i.test(databaseName)) {
  throw new Error('Refusing to run recurring idempotency integration tests unless the database name ends in _test.');
}

const invokeCreate = async (customerId: mongoose.Types.ObjectId, body: Record<string, unknown>, key: string) => {
  let status = 200;
  let responseBody: any;
  const response = {
    status(code: number) { status = code; return this; },
    json(value: unknown) { responseBody = value; return this; },
  };
  const request = {
    user: { _id: customerId },
    body,
    get: (header: string) => header.toLowerCase() === 'idempotency-key' ? key : undefined,
  };
  await createRecurringDelivery(request as any, response as any);
  return { status, body: responseBody };
};

const run = async () => {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), InventoryItem.init(), Notification.init(), RecurringDelivery.init(), RecurringBill.init()]);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const user = await User.create({
    phone: `+919${suffix.replace(/\D/g, '').slice(-9).padStart(9, '0')}`,
    password: 'test-only-password',
    name: 'Recurring Idempotency Test',
    role: 'customer',
    isActive: true,
  });
  const product = await InventoryItem.create({
    name: 'Idempotency Test Water',
    volume: `IDEM-${suffix}`,
    quantity: 100,
    minStock: 1,
    price: 30,
    deliveryCharge: 0,
    available: true,
    comingSoon: false,
  });
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const baseBody = {
    productId: product._id.toString(),
    productName: product.name,
    quantity: 1,
    frequency: 'daily',
    billingFrequency: 'weekly',
    paymentMethod: 'cash',
    deliveryAddress: 'Test-only address',
    startDate: startDate.toISOString(),
  };
  const keys = [`first-${suffix}`, `concurrent-${suffix}`, `separate-a-${suffix}`, `separate-b-${suffix}`, `retry-${suffix}`];

  try {
    const first = await invokeCreate(user._id, baseBody, keys[0]);
    assert.equal(first.status, 201, 'the initial create request should create a plan');
    const firstPlanId = first.body.recurringDelivery._id.toString();
    assert.equal(first.body.recurringDelivery.initialBillStatus, 'ready');
    assert.equal(await RecurringDelivery.countDocuments({ customerId: user._id, creationIdempotencyKey: keys[0] }), 1);
    assert.equal(await RecurringBill.countDocuments({ recurringDeliveryId: firstPlanId }), 1);

    const retry = await invokeCreate(user._id, baseBody, keys[0]);
    assert.equal(retry.status, 200, 'same-key retry should return the existing result');
    assert.equal(retry.body.recurringDelivery._id.toString(), firstPlanId);
    assert.equal(await RecurringDelivery.countDocuments({ customerId: user._id, creationIdempotencyKey: keys[0] }), 1);
    assert.equal(await RecurringBill.countDocuments({ recurringDeliveryId: firstPlanId }), 1, 'retry must not duplicate the initial bill');

    const concurrent = await Promise.all([
      invokeCreate(user._id, baseBody, keys[1]),
      invokeCreate(user._id, baseBody, keys[1]),
    ]);
    assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 201]);
    const concurrentPlan = await RecurringDelivery.findOne({ customerId: user._id, creationIdempotencyKey: keys[1] });
    assert.ok(concurrentPlan, 'concurrent requests should leave one plan');
    assert.equal(await RecurringDelivery.countDocuments({ customerId: user._id, creationIdempotencyKey: keys[1] }), 1);
    assert.equal(await RecurringBill.countDocuments({ recurringDeliveryId: concurrentPlan!._id }), 1);

    // Simulate a transient bill-store failure after the plan has been saved.
    const originalFindOneAndUpdate = (RecurringBill as any).findOneAndUpdate;
    let failInitialBillOnce = true;
    (RecurringBill as any).findOneAndUpdate = (...args: any[]) => {
      if (failInitialBillOnce) {
        failInitialBillOnce = false;
        const error: any = new Error('simulated transient bill persistence failure');
        error.name = 'MongoServerError';
        error.code = 91;
        throw error;
      }
      return originalFindOneAndUpdate.apply(RecurringBill, args);
    };
    let initialBillFailure;
    try {
      initialBillFailure = await invokeCreate(user._id, baseBody, keys[4]);
    } finally {
      (RecurringBill as any).findOneAndUpdate = originalFindOneAndUpdate;
    }
    assert.equal(initialBillFailure!.status, 503, 'a plan without its first bill must not be reported as successful');
    assert.equal(initialBillFailure!.body.code, 'INITIAL_RECURRING_BILL_PENDING');
    assert.equal(initialBillFailure!.body.recurringBill, undefined);
    const pendingPlan = await RecurringDelivery.findOne({ customerId: user._id, creationIdempotencyKey: keys[4] });
    assert.ok(pendingPlan, 'failed initial bill generation should retain the plan for same-key recovery');
    assert.equal(pendingPlan!.initialBillStatus, 'pending');
    assert.equal(await RecurringDelivery.countDocuments({ customerId: user._id, creationIdempotencyKey: keys[4] }), 1);
    assert.equal(await RecurringBill.countDocuments({ recurringDeliveryId: pendingPlan!._id }), 0);

    const recovered = await invokeCreate(user._id, baseBody, keys[4]);
    assert.equal(recovered.status, 200, 'same-key retry should recover a pending initial bill');
    assert.ok(recovered.body.recurringBill, 'recovery must return the persisted initial bill');
    assert.equal(recovered.body.recurringDelivery._id.toString(), pendingPlan!._id.toString());
    assert.equal(recovered.body.recurringDelivery.initialBillStatus, 'ready');
    assert.equal(await RecurringDelivery.countDocuments({ customerId: user._id, creationIdempotencyKey: keys[4] }), 1);
    assert.equal(await RecurringBill.countDocuments({ recurringDeliveryId: pendingPlan!._id }), 1);

    const separateA = await invokeCreate(user._id, baseBody, keys[2]);
    const separateB = await invokeCreate(user._id, baseBody, keys[3]);
    assert.equal(separateA.status, 201);
    assert.equal(separateB.status, 201);
    assert.notEqual(separateA.body.recurringDelivery._id.toString(), separateB.body.recurringDelivery._id.toString());

    const validationRetryKey = `validation-${suffix}`;
    const failedBody = { ...baseBody, productId: new mongoose.Types.ObjectId().toString() };
    const failed = await invokeCreate(user._id, failedBody, validationRetryKey);
    assert.equal(failed.status, 404, 'invalid product should fail before a plan/key is persisted');
    assert.equal(await RecurringDelivery.countDocuments({ customerId: user._id, creationIdempotencyKey: validationRetryKey }), 0);
    const retried = await invokeCreate(user._id, baseBody, validationRetryKey);
    assert.equal(retried.status, 201, 'the failed key should be reusable after correcting the failed request');

    const conflictingReuse = await invokeCreate(user._id, { ...baseBody, quantity: 2 }, keys[0]);
    assert.equal(conflictingReuse.status, 409, 'same key with a different payload should conflict');
    console.log('Recurring plan idempotency integration tests passed.');
  } finally {
    const plans = await RecurringDelivery.find({ customerId: user._id }).select('_id');
    const planIds = plans.map((plan) => plan._id);
    await RecurringBill.deleteMany({ recurringDeliveryId: { $in: planIds } });
    await RecurringDelivery.deleteMany({ _id: { $in: planIds } });
    await Notification.deleteMany({ recipientId: user._id });
    await InventoryItem.deleteOne({ _id: product._id });
    await User.deleteOne({ _id: user._id });
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error('Recurring plan idempotency integration tests failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
