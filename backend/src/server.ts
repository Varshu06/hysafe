import http from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { initializeSocket } from './services/socket.service';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase();
    
    // Start server - listen on all interfaces (0.0.0.0) to allow network access
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${port}`);
      console.log(`📡 Socket.io initialized`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💡 Access from network: http://YOUR_IP:${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Don't exit - let nodemon handle restart
  }
};

startServer();

