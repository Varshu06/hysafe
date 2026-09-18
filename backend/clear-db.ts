import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.model';
import { CustomerProfile } from './src/models/CustomerProfile.model';
import { Staff } from './src/models/Staff.model';
import { Order } from './src/models/Order.model';
import { RecurringDelivery } from './src/models/RecurringDelivery.model';
import { LoginActivity } from './src/models/LoginActivity.model';

// Load environment variables
dotenv.config();

const clearDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB successfully');

    console.log('\n🗑️  Starting database cleanup...\n');

    // Delete all data in order (respecting foreign key relationships)
    const results = {
      orders: 0,
      recurringDeliveries: 0,
      loginActivities: 0,
      customerProfiles: 0,
      staff: 0,
      users: 0,
    };

    // 1. Delete Orders (references users)
    const orderResult = await Order.deleteMany({});
    results.orders = orderResult.deletedCount;
    console.log(`✅ Deleted ${results.orders} orders`);

    // 2. Delete Recurring Deliveries (references customers)
    const recurringResult = await RecurringDelivery.deleteMany({});
    results.recurringDeliveries = recurringResult.deletedCount;
    console.log(`✅ Deleted ${results.recurringDeliveries} recurring deliveries`);

    // 3. Delete Login Activities (references users)
    const loginResult = await LoginActivity.deleteMany({});
    results.loginActivities = loginResult.deletedCount;
    console.log(`✅ Deleted ${results.loginActivities} login activities`);

    // 4. Delete Customer Profiles (references users)
    const customerProfileResult = await CustomerProfile.deleteMany({});
    results.customerProfiles = customerProfileResult.deletedCount;
    console.log(`✅ Deleted ${results.customerProfiles} customer profiles`);

    // 5. Delete Staff (references users)
    const staffResult = await Staff.deleteMany({});
    results.staff = staffResult.deletedCount;
    console.log(`✅ Deleted ${results.staff} staff records`);

    // 6. Delete Users (last, as other collections reference it)
    const userResult = await User.deleteMany({});
    results.users = userResult.deletedCount;
    console.log(`✅ Deleted ${results.users} users`);

    console.log('\n📊 Summary:');
    console.log('─'.repeat(40));
    console.log(`Orders:              ${results.orders}`);
    console.log(`Recurring Deliveries: ${results.recurringDeliveries}`);
    console.log(`Login Activities:     ${results.loginActivities}`);
    console.log(`Customer Profiles:   ${results.customerProfiles}`);
    console.log(`Staff Records:        ${results.staff}`);
    console.log(`Users:                ${results.users}`);
    console.log('─'.repeat(40));
    console.log(`Total records deleted: ${Object.values(results).reduce((a, b) => a + b, 0)}`);

    console.log('\n✅ Database cleared successfully!');
    console.log('💡 You can now create new test profiles.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error clearing database:', error.message);
    if (error.message.includes('authentication')) {
      console.error('💡 Check your username and password in the connection string');
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('💡 Check your network access settings in MongoDB Atlas');
    }
    process.exit(1);
  }
};

// Run the script
clearDatabase();


