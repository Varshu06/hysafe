import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt.util';
import { User } from '../models/User.model';

let io: SocketIOServer;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'], // Support both transports
    allowEIO3: true, // Allow Engine.IO v3 clients
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`✅ User connected: ${user._id} (${user.role})`);

    // Join role-specific room
    socket.join(user.role);

    // Staff joins their own room for personal updates
    if (user.role === 'staff') {
      socket.join(`staff:${user._id}`);
    }

    // Customer joins their own room for order updates
    if (user.role === 'customer') {
      socket.join(`customer:${user._id}`);
    }

    // Handle staff going online/offline
    socket.on('staff-online', () => {
      socket.broadcast.to('staff').emit('staff-online', {
        staffId: user._id,
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user._id}`);
    });
  });

  return io;
};

// Helper function to emit new order to all online staff
export const emitNewOrder = (order: any) => {
  if (io) {
    io.to('staff').emit('new-order', order);
    io.to("admin").emit("new-order", order);

    console.log(`📦 New order emitted to staff: ${order._id}`);
  }
};

// Helper function to emit order accepted to customer
export const emitOrderAccepted = (order: any) => {
  if (io) {
    io.to(`customer:${order.customerId}`).emit('order-status-updated', {
      orderId: order._id,
      status: 'accepted',
      order,
    });
    console.log(`✅ Order accepted notification sent to customer: ${order.customerId}`);
  }
};

// Helper function to emit order status update to customer
export const emitOrderStatusUpdate = (order: any) => {
  if (io) {
    const payload = {
      orderId: order._id,
      status: order.status,
      order,
    };

    // Notify the customer
    io.to(`customer:${order.customerId}`).emit(
      "order-status-updated",
      payload
    );

    // Notify all admins
    io.to("admin").emit(
      "order-status-updated",
      payload
    );

    console.log(
      `📢 Order status updated: ${order._id} -> ${order.status}`
    );
  }
};

// Helper function to notify other staff that order was accepted
export const emitOrderAcceptedToStaff = (order: any) => {
  if (io) {
    io.to('staff').emit('order-accepted', {
      orderId: order._id,
    });
    console.log(`🔔 Order accepted notification sent to staff: ${order._id}`);
  }
};




