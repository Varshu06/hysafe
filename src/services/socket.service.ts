import { io, Socket } from 'socket.io-client';
import { notifyUnauthorized } from './api';
import { SOCKET_URL } from '../utils/constants';
import { storage } from '../utils/storage';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private connectionToken: string | null = null;
  private connectionRequestId = 0;
  private connectionGeneration = 0;
  private staffOnlineRequested = false;
  private staffOnlineEmittedGeneration = 0;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  async connect(token?: string): Promise<void> {
    const requestId = ++this.connectionRequestId;

    let connectionToken = token;
    // Get token from storage if not provided
    if (!connectionToken) {
      connectionToken = (await storage.getToken()) || undefined;
    }

    if (!connectionToken) {
      console.warn('SocketService: No token available, cannot connect');
      return;
    }

    // Reuse the socket for this session, and restart it after iOS suspends the page.
    if (this.socket && this.connectionToken === connectionToken) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    if (requestId !== this.connectionRequestId) return;

    if (!SOCKET_URL) {
      console.warn('SocketService: SOCKET_URL is not configured, cannot connect');
      return;
    }

    try {
      this.closeSocket();
      const socket = io(SOCKET_URL, {
        auth: {
          token: connectionToken,
        },
        // Try polling first, then upgrade to websocket if available
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        forceNew: true,
      });
      this.socket = socket;
      this.connectionToken = connectionToken;
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => socket.on(event, callback));
      });

      socket.on('connect', () => {
        if (this.socket !== socket) return;
        console.log('✅ Socket.io connected');
        this.isConnected = true;
        this.connectionGeneration += 1;
        this.emitStaffOnlineIfConnected();
      });

      socket.on('disconnect', (reason) => {
        if (this.socket !== socket) return;
        console.log('❌ Socket.io disconnected:', reason);
        this.isConnected = false;
      });

      socket.on('connect_error', (error) => {
        if (this.socket !== socket) return;
        this.isConnected = false;
        if (error.message?.includes('Authentication error')) {
          this.disconnect();
          void storage.clearAll().then(() => notifyUnauthorized());
          return;
        }
        if (error.message && !error.message.includes('websocket')) {
          console.warn('Socket.io connection error:', error.message);
        }
      });

      // Handle transport errors silently (they're expected during fallback)
      socket.io.on('error', (error: any) => {
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

  private closeSocket(): void {
    if (this.socket) this.socket.disconnect();
    this.socket = null;
    this.connectionToken = null;
    this.isConnected = false;
  }

  disconnect(): void {
    this.connectionRequestId += 1;
    this.staffOnlineRequested = false;
    this.closeSocket();
    console.log('SocketService: Disconnected');
  }

  on(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event) || [];
    if (callbacks.includes(callback)) return;
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    const registered = this.listeners.get(event);
    if (registered) {
      if (callback) {
        const remaining = registered.filter(listener => listener !== callback);
        if (remaining.length) this.listeners.set(event, remaining);
        else this.listeners.delete(event);
      } else this.listeners.delete(event);
    }
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
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
    this.staffOnlineRequested = true;
    this.emitStaffOnlineIfConnected();
  }

  private emitStaffOnlineIfConnected(): void {
    if (
      !this.staffOnlineRequested ||
      !this.socket?.connected ||
      this.staffOnlineEmittedGeneration === this.connectionGeneration
    ) return;

    this.socket.emit('staff-online', {});
    this.staffOnlineEmittedGeneration = this.connectionGeneration;
  }

  clearStaffOnlineAnnouncement(): void {
    this.staffOnlineRequested = false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();

