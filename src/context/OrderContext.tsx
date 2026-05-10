import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getMyOrders } from '../services/order.service';
import { Order } from '../types/order.types';
import { useAuth } from './AuthContext';

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Get auth context - it should be available since OrderProvider is inside AuthProvider
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated || false;
  const user = auth?.user;
  const userRole = user?.role;
  const userId = user?.id || user?._id;

  const refreshOrders = async (): Promise<void> => {
    // Only fetch orders for customers - staff and admin have their own order endpoints
    if (!isAuthenticated || userRole !== 'customer') {
      setOrders([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await getMyOrders();
      setOrders(data || []);
    } catch (error: any) {
      // Only log error if it's not a 403 Forbidden (expected for non-customers)
      if (error?.response?.status !== 403) {
        console.error('Get orders error:', error?.response?.statusText || error?.message || 'Unknown error');
      }
      // Don't throw, just log
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh orders when user logs in or changes
  useEffect(() => {
    if (isAuthenticated && userRole === 'customer' && userId) {
      // Refresh orders when user is authenticated
      refreshOrders();
    } else {
      // Clear orders when user logs out or is not a customer
      setOrders([]);
    }
  }, [isAuthenticated, userRole, userId]);

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




