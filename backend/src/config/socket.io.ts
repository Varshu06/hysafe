import { Server as HTTPServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('✅ Client connected:', socket.id);

    // Handle staff going online
    socket.on('staff-online', (data) => {
      console.log('Staff online:', data);
      socket.broadcast.emit('staff-online', data);
    });

    // Handle staff going offline
    socket.on('staff-offline', (data) => {
      console.log('Staff offline:', data);
      socket.broadcast.emit('staff-offline', data);
    });

    // Handle order acceptance
    socket.on('accept-order', (data) => {
      console.log('Order accepted:', data);
      socket.broadcast.emit('order-accepted', data);
    });

    // Handle order rejection
    socket.on('reject-order', (data) => {
      console.log('Order rejected:', data);
      socket.broadcast.emit('order-rejected', data);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

