import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { deleteStaffById } from './src/controllers/admin.controller';
import { Order, OrderStatus } from './src/models/Order.model';
import { Staff } from './src/models/Staff.model';
import { User } from './src/models/User.model';

dotenv.config();

// Keep this integration test isolated from the application's default database.
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hysafe_staff_deletion_test';

const invokeDeleteStaff = async (staffId: string) => {
  const result: { statusCode: number; body?: any } = { statusCode: 200 };
  const res: any = {
    status(code: number) { result.statusCode = code; return this; },
    json(body: any) { result.body = body; return this; },
  };
  await deleteStaffById({ params: { id: staffId } } as any, res);
  return result;
};

const createOrder = (assignedStaffId: mongoose.Types.ObjectId | undefined, status: OrderStatus) => Order.create({
  customerId: new mongoose.Types.ObjectId(),
  quantity: 1,
  items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Deletion test product', quantity: 1, price: 1 }],
  totalPrice: 1,
  price: 1,
  status,
  paymentMethod: 'offline',
  paymentStatus: 'pending',
  deliveryAddress: 'Deletion test address',
  ...(assignedStaffId ? { assignedStaffId } : {}),
});

const run = async () => {
  await mongoose.connect(MONGODB_TEST_URI);
  let staffUserId: mongoose.Types.ObjectId | undefined;
  let otherStaffUserId: mongoose.Types.ObjectId | undefined;
  const orderIds: mongoose.Types.ObjectId[] = [];

  try {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const staffUser = await User.create({
      phone: `91${Date.now().toString().slice(-8)}`,
      email: `staff-delete-${suffix}@test.invalid`,
      password: 'test-password-hash',
      role: 'staff',
      name: 'Deletion Test Staff',
    });
    staffUserId = staffUser._id;
    await Staff.create({ userId: staffUser._id, name: staffUser.name, phone: staffUser.phone });

    const otherStaff = await User.create({
      phone: `92${Date.now().toString().slice(-8)}`,
      email: `other-staff-delete-${suffix}@test.invalid`,
      password: 'test-password-hash',
      role: 'staff',
      name: 'Other Deletion Test Staff',
    });
    otherStaffUserId = otherStaff._id;

    const delivered = await createOrder(staffUser._id, 'delivered');
    const cancelled = await createOrder(staffUser._id, 'cancelled');
    const accepted = await createOrder(staffUser._id, 'accepted');
    const outForDelivery = await createOrder(staffUser._id, 'out_for_delivery');
    const otherStaffOrder = await createOrder(otherStaff._id, 'accepted');
    const unrelatedOrder = await createOrder(undefined, 'pending');
    orderIds.push(delivered._id, cancelled._id, accepted._id, outForDelivery._id, otherStaffOrder._id, unrelatedOrder._id);

    const response = await invokeDeleteStaff(staffUser._id.toString());
    assert.equal(response.statusCode, 200, 'staff deletion keeps its successful API response');
    assert.equal(response.body?.success, true, 'staff deletion reports success');
    assert.equal(await User.findById(staffUser._id), null, 'staff user is deleted');
    assert.equal(await Staff.findOne({ userId: staffUser._id }), null, 'staff profile is deleted');

    for (const historicalOrder of [delivered, cancelled]) {
      const persisted = await Order.findById(historicalOrder._id);
      assert.equal(persisted?.status, historicalOrder.status, `${historicalOrder.status} order status is unchanged`);
      assert.equal(persisted?.assignedStaffId?.toString(), staffUser._id.toString(), `${historicalOrder.status} historical assignment is unchanged`);
    }

    for (const activeOrder of [accepted, outForDelivery]) {
      const persisted = await Order.findById(activeOrder._id);
      assert.equal(persisted?.status, 'pending', `${activeOrder.status} active order returns to pending`);
      assert.equal(persisted?.assignedStaffId, undefined, `${activeOrder.status} active order is unassigned for reassignment`);
    }

    const persistedOtherStaffOrder = await Order.findById(otherStaffOrder._id);
    assert.equal(persistedOtherStaffOrder?.status, 'accepted', 'another staff member’s order status is unchanged');
    assert.equal(persistedOtherStaffOrder?.assignedStaffId?.toString(), otherStaffUserId?.toString(), 'another staff member’s assignment is unchanged');

    const persistedUnrelatedOrder = await Order.findById(unrelatedOrder._id);
    assert.equal(persistedUnrelatedOrder?.status, 'pending', 'unrelated order status is unchanged');
    assert.equal(persistedUnrelatedOrder?.assignedStaffId, undefined, 'unrelated order remains unassigned');

    console.log('Staff deletion order regression tests passed.');
  } finally {
    if (orderIds.length) await Order.deleteMany({ _id: { $in: orderIds } });
    if (staffUserId) {
      await Staff.deleteOne({ userId: staffUserId });
      await User.deleteOne({ _id: staffUserId });
    }
    if (otherStaffUserId) await User.deleteOne({ _id: otherStaffUserId });
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error('Staff deletion order regression tests failed:', error);
  process.exitCode = 1;
});
