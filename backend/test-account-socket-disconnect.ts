import assert from 'assert';
import http from 'http';
import mongoose from 'mongoose';
import { io as createClient, Socket } from 'socket.io-client';
import { deleteStaffById, updateStaffById } from './src/controllers/admin.controller';
import { deleteAccount } from './src/controllers/customer.controller';
import { CustomerProfile } from './src/models/CustomerProfile.model';
import { LoginActivity } from './src/models/LoginActivity.model';
import { Order } from './src/models/Order.model';
import { Otp } from './src/models/Otp.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { Staff } from './src/models/Staff.model';
import { User } from './src/models/User.model';
import { initializeSocket } from './src/services/socket.service';
import { generateToken } from './src/utils/jwt.util';

process.env.JWT_SECRET = 'account-socket-disconnect-test-secret';

const activeById: Record<string, { role: string; isActive: boolean }> = {};
const staffUsers = new Map<string, any>();
const originals: Array<{ target: any; key: string; value: any }> = [];
let failStaffDeletion = false;
let failCustomerDeletion = false;

const replace = (target: any, key: string, value: any) => {
  originals.push({ target, key, value: target[key] });
  target[key] = value;
};

const dbUserQuery = (id: string) => {
  const record = activeById[id];
  const user = record ? { _id: id, role: record.role, isActive: record.isActive } : null;
  return {
    select: () => ({
      lean: async () => user,
      then: (resolve: (value: typeof user) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(user).then(resolve, reject),
    }),
  };
};

const makeResponse = () => {
  const response: { statusCode: number; body?: any } = { statusCode: 200 };
  return {
    response,
    res: {
      status(code: number) { response.statusCode = code; return this; },
      json(body: any) { response.body = body; return this; },
    },
  };
};

const connectClient = (url: string, userId: string, role: string): Promise<Socket> => new Promise((resolve, reject) => {
  const client = createClient(url, {
    auth: { token: generateToken({ userId, role }) },
    reconnection: false,
    timeout: 3000,
  });
  client.once('connect', () => resolve(client));
  client.once('connect_error', (error) => { client.close(); reject(error); });
});

const waitForDisconnect = (socket: Socket): Promise<void> => new Promise((resolve) => {
  if (!socket.connected) return resolve();
  socket.once('disconnect', () => resolve());
});

const main = async () => {
  const ids = {
    staff: new mongoose.Types.ObjectId().toString(),
    failedStaff: new mongoose.Types.ObjectId().toString(),
    customer: new mongoose.Types.ObjectId().toString(),
    failedCustomer: new mongoose.Types.ObjectId().toString(),
    peer: new mongoose.Types.ObjectId().toString(),
    deactivatedStaff: new mongoose.Types.ObjectId().toString(),
  };
  for (const id of [ids.staff, ids.failedStaff]) {
    const user = { _id: new mongoose.Types.ObjectId(id), role: 'staff', isActive: true, phone: '9000000000', email: undefined, async save() {} };
    activeById[id] = { role: 'staff', isActive: true };
    staffUsers.set(id, user);
  }
  for (const id of [ids.customer, ids.failedCustomer]) activeById[id] = { role: 'customer', isActive: true };
  activeById[ids.peer] = { role: 'staff', isActive: true };
  activeById[ids.deactivatedStaff] = { role: 'staff', isActive: true };
  staffUsers.set(ids.deactivatedStaff, {
    _id: new mongoose.Types.ObjectId(ids.deactivatedStaff), role: 'staff', isActive: true,
    phone: '9000000003', email: undefined, async save() {},
  });

  // Stub persistence boundaries while using the real controller flows and Socket.IO rooms.
  replace(User, 'findById', dbUserQuery);
  replace(User, 'findOne', async (query: any) => staffUsers.get(String(query._id)) || null);
  replace(User, 'deleteOne', async (query: any) => {
    if (failStaffDeletion && String(query._id) === ids.failedStaff) throw new Error('simulated deletion failure');
    return { acknowledged: true };
  });
  replace(User, 'findByIdAndDelete', async () => ({ acknowledged: true }));
  replace(Staff, 'deleteOne', async () => ({ acknowledged: true }));
  replace(Staff, 'deleteMany', async () => ({ acknowledged: true }));
  replace(Staff, 'findOneAndUpdate', async () => ({ _id: new mongoose.Types.ObjectId(ids.deactivatedStaff) }));
  replace(Order, 'updateMany', async () => ({ acknowledged: true }));
  replace(Order, 'countDocuments', async () => 0);
  replace(CustomerProfile, 'deleteMany', async () => {
    if (failCustomerDeletion) throw new Error('simulated deletion failure');
    return { acknowledged: true };
  });
  replace(RecurringDelivery, 'deleteMany', async () => ({ acknowledged: true }));
  replace(LoginActivity, 'deleteMany', async () => ({ acknowledged: true }));
  replace(Otp, 'deleteMany', async () => ({ acknowledged: true }));
  replace(mongoose, 'startSession', async () => ({
    startTransaction() {},
    inTransaction: () => true,
    async commitTransaction() {},
    async abortTransaction() {},
    endSession() {},
  }));

  const server = http.createServer();
  const socketServer = initializeSocket(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const clients: Socket[] = [];

  try {
    const staffSocket = await connectClient(url, ids.staff, 'staff');
    const failedStaffSocket = await connectClient(url, ids.failedStaff, 'staff');
    const customerSocket = await connectClient(url, ids.customer, 'customer');
    const failedCustomerSocket = await connectClient(url, ids.failedCustomer, 'customer');
    const peerSocket = await connectClient(url, ids.peer, 'staff');
    const deactivatedStaffSocket = await connectClient(url, ids.deactivatedStaff, 'staff');
    clients.push(staffSocket, failedStaffSocket, customerSocket, failedCustomerSocket, peerSocket, deactivatedStaffSocket);

    const deactivationDisconnect = waitForDisconnect(deactivatedStaffSocket);
    const deactivationResponse = makeResponse();
    await updateStaffById({ params: { id: ids.deactivatedStaff }, body: { isActive: false } } as any, deactivationResponse.res as any);
    await deactivationDisconnect;
    assert.equal(deactivationResponse.response.statusCode, 200, 'existing staff deactivation response remains successful');
    assert.equal(deactivatedStaffSocket.connected, false, 'existing staff deactivation still disconnects sockets');
    assert.equal(peerSocket.connected, true, 'deactivation leaves other user sockets connected');

    const staffDisconnect = waitForDisconnect(staffSocket);
    const staffResponse = makeResponse();
    await deleteStaffById({ params: { id: ids.staff } } as any, staffResponse.res as any);
    await staffDisconnect;
    assert.equal(staffResponse.response.statusCode, 200, 'successful staff deletion response remains 200');
    assert.equal(staffSocket.connected, false, 'successful staff deletion disconnects that staff member');
    assert.equal(peerSocket.connected, true, 'deleting staff leaves another user socket connected');

    failStaffDeletion = true;
    const failedStaffResponse = makeResponse();
    await deleteStaffById({ params: { id: ids.failedStaff } } as any, failedStaffResponse.res as any);
    assert.equal(failedStaffResponse.response.statusCode, 500, 'failed staff deletion retains existing error response');
    assert.equal(failedStaffSocket.connected, true, 'failed staff deletion does not disconnect sockets');
    failStaffDeletion = false;

    const customerDisconnect = waitForDisconnect(customerSocket);
    const customerResponse = makeResponse();
    await deleteAccount({ user: { _id: new mongoose.Types.ObjectId(ids.customer), role: 'customer', phone: '9000000001' } } as any, customerResponse.res as any);
    await customerDisconnect;
    assert.equal(customerResponse.response.statusCode, 200, 'successful customer deletion response remains 200');
    assert.equal(customerSocket.connected, false, 'successful customer deletion disconnects that customer');
    assert.equal(peerSocket.connected, true, 'deleting customer leaves another user socket connected');

    failCustomerDeletion = true;
    const failedCustomerResponse = makeResponse();
    await deleteAccount({ user: { _id: new mongoose.Types.ObjectId(ids.failedCustomer), role: 'customer', phone: '9000000002' } } as any, failedCustomerResponse.res as any);
    assert.equal(failedCustomerResponse.response.statusCode, 500, 'failed customer deletion retains existing error response');
    assert.equal(failedCustomerSocket.connected, true, 'failed customer deletion does not disconnect sockets');

    console.log('Account deletion socket-disconnect tests passed.');
  } finally {
    clients.forEach((client) => client.close());
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
    for (const original of originals.reverse()) original.target[original.key] = original.value;
  }
};

main().catch((error) => {
  console.error('Account deletion socket-disconnect tests failed:', error);
  process.exitCode = 1;
});
