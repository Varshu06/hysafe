import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getMyOrders } from '../services/order.service';
import { Order } from '../types/order.types';
import { useAuth } from './AuthContext';
import { socketService } from '../services/socket.service';

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fetchInProgressRef = useRef(false);

  // Get auth context - it should be available since OrderProvider is inside AuthProvider
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated || false;
  const user = auth?.user;
  const userRole = user?.role;
  const userId = user?.id || user?._id;

  const refreshOrders = useCallback(async (): Promise<void> => {
    // Only fetch orders for customers - staff and admin have their own order endpoints
    if (!isAuthenticated || userRole !== 'customer') {
      setOrders([]);
      return;
    }
    if (fetchInProgressRef.current) return;
    
    fetchInProgressRef.current = true;
    try {
      setIsLoading(true);
      const data = await getMyOrders();
      setOrders(data || []);
    } catch (error: any) {
      // Only log error if it's not a 403 Forbidden (expected for non-customers)
      if (error?.response?.status !== 403) {
        console.error('Get orders error:', error?.response?.statusText || error?.message || 'Unknown error');
      }
      // Keep the last known order state if a refresh fails temporarily.
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [isAuthenticated, userRole]);

  // Refresh orders when user logs in or changes
  useEffect(() => {
    if (isAuthenticated && userRole === 'customer' && userId) {
      // Refresh orders when user is authenticated
      refreshOrders();
    } else {
      // Clear orders when user logs out or is not a customer
      setOrders([]);
    }
  }, [isAuthenticated, userRole, userId, refreshOrders]);

  // Keep the existing API-backed order store current when staff updates an order.
  useEffect(() => {
    if (!isAuthenticated || userRole !== 'customer') return;

    const handleOrderStatusUpdate = (event: { orderId: string; status: string }) => {
      const knownStatuses = ['pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled'];
      if (knownStatuses.includes(event.status)) {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order._id === event.orderId
              ? { ...order, status: event.status as Order['status'] }
              : order,
          ),
        );
      }
      void refreshOrders();
    };

    socketService.onOrderStatusUpdate(handleOrderStatusUpdate);
    void socketService.connect();

    return () => {
      socketService.off('order-status-updated', handleOrderStatusUpdate);
      socketService.disconnect();
    };
  }, [isAuthenticated, userRole, refreshOrders]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        isLoading,
        refreshOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within OrderProvider');
  }
  return context;
};


