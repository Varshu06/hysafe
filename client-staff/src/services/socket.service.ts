import { io, Socket } from 'socket.io-client';
import { Order } from '../types/order.types';
import { SOCKET_URL } from '../utils/constants';

class SocketService {
  private socket: Socket | null = null;

  /**
   * Initialize socket connection
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Listen for new orders
   */
  onNewOrder(callback: (order: Order) => void): void {
    if (this.socket) {
      this.socket.on('new-order', callback);
    }
  }

  /**
   * Listen for order accepted by another staff
   */
  onOrderAccepted(callback: (data: { orderId: string; staffId: string }) => void): void {
    if (this.socket) {
      this.socket.on('order-accepted', callback);
    }
  }

  /**
   * Listen for order rejected
   */
  onOrderRejected(callback: (data: { orderId: string }) => void): void {
    if (this.socket) {
      this.socket.on('order-rejected', callback);
    }
  }

  /**
   * Emit staff online status
   */
  emitStaffOnline(data: { staffId: string }): void {
    if (this.socket) {
      this.socket.emit('staff-online', data);
    }
  }

  /**
   * Emit staff offline status
   */
  emitStaffOffline(data: { staffId: string }): void {
    if (this.socket) {
      this.socket.emit('staff-offline', data);
    }
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

