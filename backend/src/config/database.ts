import mongoose from 'mongoose';
import { User } from '../models/User.model';

export const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // MongoDB connection options to handle SSL/TLS properly
    // For MongoDB Atlas, SSL is usually handled automatically via the connection string
    // But we can specify options if needed
    const options: mongoose.ConnectOptions = {
      // Retry connection settings
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      // Connection pool settings
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      // Retry settings
      retryWrites: true,
      retryReads: true,
      // Don't explicitly set SSL - let MongoDB connection string handle it
      // This avoids SSL/TLS version conflicts
    };

    console.log("Mongo URI:", mongoURI);
    console.log("Node version:", process.version);

    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB Atlas connected successfully');

    // Keep critical indexes aligned with schema to avoid stale index definitions.
    await User.syncIndexes();
    console.log('✅ User indexes synchronized');
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('💡 SSL/TLS Error - Check your MongoDB Atlas connection string and network access settings');
      console.error('💡 Make sure your IP is whitelisted in MongoDB Atlas Network Access');
    }
    // Don't exit immediately - let nodemon restart
    throw error;
  }
};

