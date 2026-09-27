import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { acceptOrder } from './src/controllers/staff.controller';
import { InventoryItem } from './src/models/InventoryItem.model';
import { Notification } from './src/models/Notification.model';
import { Order } from './src/models/Order.model';

dotenv.config();

// Use a dedicated test database; never fall back to the app's MONGODB_URI.
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hysafe_staff_acceptance_test';

const invokeAccept = async (orderId: string, staffId: mongoose.Types.ObjectId) => {
  const response: { statusCode: number; body?: any } = { statusCode: 200 };
  const res: any = {
    status(code: number) { response.statusCode = code; return this; },
    json(body: any) { response.body = body; return this; },
  };
  await acceptOrder({ params: { id: orderId }, user: { _id: staffId } } as any, res);
  return response;
};

const createOrder = async (
  productId: mongoose.Types.ObjectId,
  status: 'pending' | 'delivered' | 'cancelled' = 'pending',
  assignedStaffId?: mongoose.Types.ObjectId,
) => Order.create({
  customerId: new mongoose.Types.ObjectId(),
  quantity: 1,
  items: [{ productId, productName: 'Acceptance test can', quantity: 1, price: 1 }],
  totalPrice: 1,
  price: 1,
  status,
  paymentMethod: 'offline',
  paymentStatus: 'pending',
  deliveryAddress: 'Acceptance test address',
  ...(assignedStaffId ? { assignedStaffId } : {}),
});

const runTests = async () => {
  await mongoose.connect(MONGODB_TEST_URI);
  const createdOrderIds: mongoose.Types.ObjectId[] = [];
  let productId: mongoose.Types.ObjectId | undefined;

  try {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const product = await InventoryItem.create({
      name: `AcceptanceTest_${suffix}`,
      volume: `AcceptanceTest_${suffix}`,
      quantity: 50,
      minStock: 0,
      price: 1,
      deliveryCharge: 0,
      available: true,
    });
    productId = product._id;
    const staffA = new mongoose.Types.ObjectId();
    const staffB = new mongoose.Types.ObjectId();

    const normalOrder = await createOrder(product._id);
    createdOrderIds.push(normalOrder._id);
    const normalResult = await invokeAccept(normalOrder._id.toString(), staffA);
    assert.equal(normalResult.statusCode, 200, 'an eligible unassigned order is accepted');
    const normallyAssigned = await Order.findById(normalOrder._id);
    assert.equal(normallyAssigned?.assignedStaffId?.toString(), staffA.toString(), 'the successful staff member is assigned');

    const secondResult = await invokeAccept(normalOrder._id.toString(), staffB);
    assert.equal(secondResult.statusCode, 409, 'a second acceptance receives conflict');
    assert.equal(secondResult.body?.code, 'ORDER_ALREADY_ACCEPTED', 'the conflict has the machine-readable code');
    assert.equal((await Order.findById(normalOrder._id))?.assignedStaffId?.toString(), staffA.toString(), 'the original assignment is preserved');

    const concurrentOrder = await createOrder(product._id);
    createdOrderIds.push(concurrentOrder._id);
    const concurrentResults = await Promise.all([
      invokeAccept(concurrentOrder._id.toString(), staffA),
      invokeAccept(concurrentOrder._id.toString(), staffB),
    ]);
    assert.equal(concurrentResults.filter((result) => result.statusCode === 200).length, 1, 'exactly one concurrent acceptance succeeds');
    assert.equal(concurrentResults.filter((result) => result.statusCode === 409 && result.body?.code === 'ORDER_ALREADY_ACCEPTED').length, 1, 'the losing concurrent acceptance receives conflict');
    const concurrentlyAssigned = await Order.findById(concurrentOrder._id);
    assert.ok([staffA.toString(), staffB.toString()].includes(concurrentlyAssigned?.assignedStaffId?.toString() || ''), 'the concurrent order has exactly one staff assignment');

    for (const terminalStatus of ['delivered', 'cancelled'] as const) {
      const terminalOrder = await createOrder(product._id, terminalStatus);
      createdOrderIds.push(terminalOrder._id);
      const terminalResult = await invokeAccept(terminalOrder._id.toString(), staffA);
      assert.equal(terminalResult.statusCode, 400, `${terminalStatus} orders retain the existing unavailable response`);
      assert.equal((await Order.findById(terminalOrder._id))?.assignedStaffId, undefined, `${terminalStatus} order remains unassigned`);
    }

    const preassignedOrder = await createOrder(product._id, 'pending', staffA);
    createdOrderIds.push(preassignedOrder._id);
    const preassignedResult = await invokeAccept(preassignedOrder._id.toString(), staffB);
    assert.equal(preassignedResult.statusCode, 409, 'an already assigned order is rejected as a conflict');
    assert.equal(preassignedResult.body?.code, 'ORDER_ALREADY_ACCEPTED', 'an already assigned order returns the conflict code');
    assert.equal((await Order.findById(preassignedOrder._id))?.assignedStaffId?.toString(), staffA.toString(), 'an existing assignment is unchanged');

    console.log('Staff order acceptance tests passed.');
  } finally {
    if (createdOrderIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await Notification.deleteMany({ orderId: { $in: createdOrderIds } });
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    if (productId) await InventoryItem.deleteOne({ _id: productId });
    await mongoose.disconnect();
  }
};

runTests().catch((error) => {
  console.error('Staff order acceptance tests failed:', error);
  process.exitCode = 1;
});
