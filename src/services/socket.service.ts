import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { storage } from '../utils/storage';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private pendingListeners: Map<string, Array<(data: any) => void>> = new Map();

  async connect(token?: string): Promise<void> {
    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    // Get token from storage if not provided
    if (!token) {
      token = await storage.getToken();
    }

    if (!token) {
      console.warn('SocketService: No token available, cannot connect');
      return;
    }

    try {
      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        // Try polling first, then upgrade to websocket if available
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.io connected');
        this.isConnected = true;
        // Re-attach any pending listeners
        this.attachPendingListeners();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket.io disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        // Only log connection errors, not websocket upgrade failures
        // WebSocket errors are expected if the server doesn't support it
        if (error.message && !error.message.includes('websocket')) {
          console.warn('Socket.io connection error:', error.message);
        }
        this.isConnected = false;
      });

      // Handle transport errors silently (they're expected during fallback)
      this.socket.io.on('error', (error: any) => {
        // Only log if it's not a websocket error (which is expected during fallback)
        if (error.message && !error.message.includes('websocket')) {
          console.warn('Socket.io transport error:', error.message);
        }
      });
    } catch (error) {
      console.error('SocketService: Failed to initialize', error);
      this.isConnected = false;
    }
  }

  private attachPendingListeners(): void {
    if (!this.socket) return;
    
    this.pendingListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket!.on(event, callback);
      });
    });
    this.pendingListeners.clear();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('SocketService: Disconnected');
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket && this.isConnected) {
      this.socket.on(event, callback);
    } else {
      // Store listener to attach when socket connects
      if (!this.pendingListeners.has(event)) {
        this.pendingListeners.set(event, []);
      }
      this.pendingListeners.get(event)!.push(callback);
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`SocketService: Cannot emit ${event}, socket not connected`);
    }
  }

  // Convenience methods for specific events
  onOrderStatusUpdate(callback: (data: { orderId: string; status: string; order?: any }) => void): void {
    this.on('order-status-updated', callback);
  }

  onNewOrder(callback: (order: any) => void): void {
    this.on('new-order', callback);
  }

  onOrderAccepted(callback: (data: { orderId: string }) => void): void {
    this.on('order-accepted', callback);
  }

  onOrderRejected(callback: (data: { orderId: string }) => void): void {
    this.on('order-rejected', callback);
  }

  // Staff-specific events
  emitStaffOnline(): void {
    this.emit('staff-online', {});
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();



