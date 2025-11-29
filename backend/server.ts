import http from 'http';
import { createApp } from './src/app';
import { connectDatabase } from './src/config/database';
import config, { validateEnv } from './src/config/env';
import { initializeSocket } from './src/config/socket.io';
import { initializeFirebase } from './src/services/notification.service';

/**
 * Start server
 */
const startServer = async (): Promise<void> => {
  try {
    // Validate environment variables
    validateEnv();

    // Connect to database
    await connectDatabase();

    // Initialize Firebase (for push notifications)
    initializeFirebase();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(httpServer);

    // Start server
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io server initialized`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

