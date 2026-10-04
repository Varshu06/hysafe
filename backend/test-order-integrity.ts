import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { InventoryItem } from './src/models/InventoryItem.model';
import { Order } from './src/models/Order.model';
import { User } from './src/models/User.model';
import { Staff } from './src/models/Staff.model';
import {
  reserveInventoryAtomic,
  restoreInventoryAtomic,
  validateStatusTransition,
} from './src/utils/orderInventory.util';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hysafe';

let testPassCount = 0;
let testFailCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    testPassCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    testFailCount++;
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 HYSAFE ORDER & INVENTORY INTEGRITY SUITE');
  console.log('==================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to Database for Testing.\n');

    // Setup Test Products
    await InventoryItem.deleteMany({ name: { $regex: /^TestCan_/ } });
    const productA = await InventoryItem.create({
      name: 'TestCan_20L',
      volume: '20L_TEST',
      quantity: 5, // Only 5 in stock!
      minStock: 2,
      price: 80,
      deliveryCharge: 10,
      available: true,
    });

    const productB = await InventoryItem.create({
      name: 'TestCan_10L',
      volume: '10L_TEST',
      quantity: 0, // 0 in stock / unavailable
      minStock: 2,
      price: 50,
      deliveryCharge: 5,
      available: false,
    });

    console.log('--- TEST GROUP 1: Product Identity & Stock Reservation Validation ---');
    
    // 1. Invalid product ID (malformed ObjectId)
    try {
      await reserveInventoryAtomic([{ productId: 'invalid-id-123', quantity: 1 }]);
      assert(false, '1. Invalid Product ID format should throw error');
    } catch (e: any) {
      assert(e.message.includes('Invalid or missing product ID'), '1. Invalid Product ID format throws expected error');
    }

    // 2. Non-existent product ID
    try {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await reserveInventoryAtomic([{ productId: fakeId, quantity: 1 }]);
      assert(false, '2. Non-existent Product ID should throw error');
    } catch (e: any) {
      assert(e.message.includes('Product not found'), '2. Non-existent Product ID throws expected error');
    }

    // 3. Unavailable / Insufficient Stock
    try {
      await reserveInventoryAtomic([{ productId: String(productB._id), quantity: 1 }]);
      assert(false, '3. Unavailable product reservation should throw error');
    } catch (e: any) {
      assert(e.message.includes('unavailable') || e.message.includes('Insufficient'), '3. Unavailable product throws expected error');
    }

    try {
      await reserveInventoryAtomic([{ productId: String(productA._id), quantity: 10 }]);
      assert(false, '3b. Exceeding stock reservation should throw error');
    } catch (e: any) {
      assert(e.message.includes('Insufficient stock'), '3b. Exceeding stock throws expected error');
    }

    console.log('\n--- TEST GROUP 2: Atomic Inventory Deduction & Race Conditions ---');

    // 4. Concurrent stock reservation attempts (productA has 5 stock)
    // Attempt 3 parallel reservations of 2 stock each (Total requested: 6). Exactly 2 should succeed, 1 should fail!
    const results = await Promise.allSettled([
      reserveInventoryAtomic([{ productId: String(productA._id), quantity: 2 }]),
      reserveInventoryAtomic([{ productId: String(productA._id), quantity: 2 }]),
      reserveInventoryAtomic([{ productId: String(productA._id), quantity: 2 }]),
    ]);

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    assert(succeeded === 2 && failed === 1, `4. Concurrent stock reservation: 2 succeeded, 1 failed (Requested 6 for 5 stock)`);

    const refreshedProductA = await InventoryItem.findById(productA._id);
    assert(refreshedProductA?.quantity === 1, `4b. Final stock is exactly 1 (5 - 2 - 2 = 1)`);

    console.log('\n--- TEST GROUP 3: Strict State Machine Validation ---');

    // State machine transitions test
    assert(validateStatusTransition('pending', 'accepted') === true, '5. pending -> accepted is valid');
    assert(validateStatusTransition('pending', 'cancelled') === true, '5. pending -> cancelled is valid');
    assert(validateStatusTransition('accepted', 'out_for_delivery') === true, '5. accepted -> out_for_delivery is valid');
    assert(validateStatusTransition('accepted', 'cancelled') === true, '5. accepted -> cancelled is valid');
    assert(validateStatusTransition('out_for_delivery', 'delivered') === true, '5. out_for_delivery -> delivered is valid');
    assert(validateStatusTransition('out_for_delivery', 'cancelled') === true, '5. out_for_delivery -> cancelled is valid');

    // Invalid transitions
    assert(validateStatusTransition('delivered', 'accepted') === false, '5. delivered -> accepted is INVALID');
    assert(validateStatusTransition('delivered', 'cancelled') === false, '5. delivered -> cancelled is INVALID');
    assert(validateStatusTransition('cancelled', 'accepted') === false, '5. cancelled -> accepted is INVALID');
    assert(validateStatusTransition('out_for_delivery', 'accepted') === false, '5. out_for_delivery -> accepted is INVALID');
    assert(validateStatusTransition('delivered', 'out_for_delivery') === false, '5. delivered -> out_for_delivery is INVALID');
    assert(validateStatusTransition('cancelled', 'delivered') === false, '5. cancelled -> delivered is INVALID');

    console.log('\n--- TEST GROUP 4: Idempotent Stock Restoration & No Double Restoration ---');

    // Restore stock test
    const initialQty = refreshedProductA!.quantity; // 1
    await restoreInventoryAtomic([{ productId: String(productA._id), quantity: 2 }]);
    const restoredProductA = await InventoryItem.findById(productA._id);
    assert(restoredProductA?.quantity === initialQty + 2, '6. Stock restored accurately (1 + 2 = 3)');

    console.log('\n==================================================');
    console.log(`SUMMARY: ${testPassCount} PASSED, ${testFailCount} FAILED`);
    console.log('==================================================\n');

    // Cleanup
    await InventoryItem.deleteMany({ name: { $regex: /^TestCan_/ } });
    await mongoose.disconnect();
    process.exit(testFailCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
