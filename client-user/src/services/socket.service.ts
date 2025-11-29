import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

class SocketService {
  private socket: Socket | null = null;

  /**
   * Initialize socket connection
   */
  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const config: any = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    };

    if (token) {
      config.auth = { token };
    }

    this.socket = io(SOCKET_URL, config);

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
   * Listen for order status updates
   */
  onOrderStatusUpdate(callback: (data: { orderId: string; status: string }) => void): void {
    if (this.socket) {
      this.socket.on('order-status-updated', callback);
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

