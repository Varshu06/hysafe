import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    const maskedURI = mongoURI.replace(/:[^:@]+@/, ':****@');
    console.log('📍 Connection string:', maskedURI);
    
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Atlas connected successfully!');
    
    // Test: List databases
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    console.log('📦 Available databases:', databases.map((db: any) => db.name));
    
    // Test: Create a test collection
    const db = mongoose.connection.db;
    const testCollection = db.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Test document inserted successfully');
    
    // Clean up
    await testCollection.deleteOne({ test: true });
    console.log('✅ Test document deleted');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB Atlas');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('💡 Check your username and password in the connection string');
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('💡 Check your network access settings in MongoDB Atlas');
    }
    process.exit(1);
  }
};

testConnection();




