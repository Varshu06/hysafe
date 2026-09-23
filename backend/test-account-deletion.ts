import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express, { Response } from 'express';
import { User } from './src/models/User.model';
import { CustomerProfile } from './src/models/CustomerProfile.model';
import { Order } from './src/models/Order.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { LoginActivity } from './src/models/LoginActivity.model';
import { Otp } from './src/models/Otp.model';
import { generateToken } from './src/utils/jwt.util';
import { authenticate, AuthRequest } from './src/middleware/auth.middleware';
import { deleteAccount } from './src/controllers/customer.controller';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hysafe';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failCount++;
  }
}

// Helper to simulate an Express HTTP invocation for unit/integration testing
async function invokeDeleteAccount(authHeader?: string, body: any = {}, query: any = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      headers: {
        authorization: authHeader,
      },
      body,
      query,
    };

    let responseStatus = 200;
    const res: any = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        resolve({ status: responseStatus, body: data });
      },
    };

    // Run through authenticate middleware first
    authenticate(req, res, () => {
      deleteAccount(req, res);
    });
  });
}

async function runAccountDeletionTests() {
  console.log('\n========================================================');
  console.log('🧪 HYSAFE ACCOUNT DELETION SECURITY & INTEGRITY SUITE');
  console.log('========================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.\n');

    const testPrefix = `del_test_${Date.now()}`;

    // Clean up any old test leftovers
    await User.deleteMany({ phone: { $regex: /^999900/ } });

    // --- TEST 1: Unauthenticated user cannot delete an account ---
    console.log('--- TEST GROUP 1: Authentication & Authorization Guards ---');
    const unauthResult = await invokeDeleteAccount(undefined);
    assert(unauthResult.status === 401, '1. Unauthenticated request rejected with 401');

    const invalidTokenResult = await invokeDeleteAccount('Bearer invalid.jwt.token');
    assert(invalidTokenResult.status === 401, '1b. Invalid token rejected with 401');

    // Setup Test User A & User B
    const userA = await User.create({
      phone: `9999001111`,
      email: `${testPrefix}_a@test.com`,
      password: 'hashedpassword123',
      role: 'customer',
      name: 'Test Customer A',
    });
    const tokenA = generateToken({ userId: String(userA._id), role: 'customer' });

    const userB = await User.create({
      phone: `9999002222`,
      email: `${testPrefix}_b@test.com`,
      password: 'hashedpassword123',
      role: 'customer',
      name: 'Test Customer B',
    });
    const tokenB = generateToken({ userId: String(userB._id), role: 'customer' });

    // --- TEST 2: User A cannot delete User B ---
    console.log('\n--- TEST GROUP 2: ID Manipulation Prevention (User A cannot delete User B) ---');
    // User A tries to pass User B's ID in body / query
    const spoofResult = await invokeDeleteAccount(
      `Bearer ${tokenA}`,
      { userId: String(userB._id), customerId: String(userB._id) },
      { userId: String(userB._id) }
    );
    // User B must NOT be deleted
    const userBStillExists = await User.findById(userB._id);
    assert(!!userBStillExists, '2. User B was NOT deleted when User A attempted spoofing');

    // Setup associated records for User B to test active orders guard and complete deletion
    const profileB = await CustomerProfile.create({
      userId: userB._id,
      name: 'Test Customer B',
      address: '123 Safe Water Street',
    });

    const recurringB = await RecurringDelivery.create({
      customerId: userB._id,
      productId: new mongoose.Types.ObjectId().toString(),
      productName: '20L Can',
      quantity: 2,
      frequency: 'daily',
      deliveryAddress: '123 Safe Water Street',
      paymentTerms: 'one-time',
      startDate: new Date(),
    });

    const loginActB = await LoginActivity.create({
      userId: userB._id,
      deviceInfo: 'Test Device B',
      ipAddress: '127.0.0.1',
    });

    const otpB = await Otp.create({
      identifier: userB.phone,
      otpHash: 'hashed1234',
      expiresAt: new Date(Date.now() + 60000),
    });

    // --- TEST 3: Active Order Guard ---
    console.log('\n--- TEST GROUP 3: Active In-Flight Order Guard ---');
    const activeOrderB = await Order.create({
      customerId: userB._id,
      quantity: 2,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: '20L Mineral Water',
          quantity: 2,
          price: 80,
        },
      ],
      totalPrice: 160,
      price: 160,
      status: 'pending', // Active in-flight order!
      paymentMethod: 'offline',
      paymentStatus: 'pending',
      deliveryAddress: '123 Safe Water Street',
    });

    const activeOrderDeleteAttempt = await invokeDeleteAccount(`Bearer ${tokenB}`);
    assert(activeOrderDeleteAttempt.status === 400, '3. Deletion rejected with 400 when active order is pending');
    assert(
      activeOrderDeleteAttempt.body.message?.includes('active orders in progress'),
      '3b. Helpful error message returned explaining active orders'
    );

    const userBStillActive = await User.findById(userB._id);
    assert(!!userBStillActive, '3c. User B is preserved when deletion is blocked by active order');

    // Transition active order to delivered (completed)
    activeOrderB.status = 'delivered';
    await activeOrderB.save();

    // --- TEST 4: Full Account Deletion & Cascading Cleanups ---
    console.log('\n--- TEST GROUP 4: Successful Self-Deletion & Cascading Cleanup ---');
    const successDeleteResult = await invokeDeleteAccount(`Bearer ${tokenB}`);
    assert(successDeleteResult.status === 200, '4. Authenticated user can delete own account (200 OK)');
    assert(successDeleteResult.body.success === true, '4b. Response returns success: true');

    // Verify User B is deleted
    const checkUserB = await User.findById(userB._id);
    assert(checkUserB === null, '4c. User document permanently deleted');

    // Verify CustomerProfile is deleted
    const checkProfileB = await CustomerProfile.findOne({ userId: userB._id });
    assert(checkProfileB === null, '4d. CustomerProfile document permanently deleted');

    // Verify RecurringDelivery is deleted
    const checkRecurringB = await RecurringDelivery.find({ customerId: userB._id });
    assert(checkRecurringB.length === 0, '4e. RecurringDelivery records permanently deleted');

    // Verify LoginActivity is deleted
    const checkLoginActB = await LoginActivity.find({ userId: userB._id });
    assert(checkLoginActB.length === 0, '4f. LoginActivity records permanently deleted');

    // Verify Otp is deleted
    const checkOtpB = await Otp.find({ identifier: userB.phone });
    assert(checkOtpB.length === 0, '4g. Otp records cleaned up');

    // Verify completed historical Order is NOT deleted (system financial/inventory audit preserved)
    const checkOrderB = await Order.findById(activeOrderB._id);
    assert(checkOrderB !== null, '4h. Historical completed Order PRESERVED for financial/inventory integrity');

    // --- TEST 5: Repeated Deletion Safety ---
    console.log('\n--- TEST GROUP 5: Repeated Deletion & Invalidation Safety ---');
    const repeatedDeleteResult = await invokeDeleteAccount(`Bearer ${tokenB}`);
    assert(
      repeatedDeleteResult.status === 401,
      '5. Repeated deletion with expired/deleted token rejected with 401 (session invalidated)'
    );

    // --- TEST 6: Admin Protection ---
    console.log('\n--- TEST GROUP 6: Admin Self-Deletion Protection ---');
    const adminUser = await User.create({
      phone: `9999003333`,
      email: `${testPrefix}_admin@test.com`,
      password: 'adminpassword123',
      role: 'admin',
      name: 'Super Admin',
    });
    const adminToken = generateToken({ userId: String(adminUser._id), role: 'admin' });

    const adminDeleteAttempt = await invokeDeleteAccount(`Bearer ${adminToken}`);
    assert(adminDeleteAttempt.status === 403, '6. Admin self-deletion rejected with 403');
    assert(
      adminDeleteAttempt.body.message?.includes('Admin accounts cannot be deleted'),
      '6b. Helpful security message for admin account'
    );

    const adminStillExists = await User.findById(adminUser._id);
    assert(!!adminStillExists, '6c. Admin user remains intact');

    // Cleanup test artifacts
    await User.deleteMany({ phone: { $in: ['9999001111', '9999002222', '9999003333'] } });
    await Order.deleteMany({ _id: activeOrderB._id });

    console.log('\n========================================================');
    console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('========================================================\n');

    await mongoose.disconnect();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test suite exception:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAccountDeletionTests();
