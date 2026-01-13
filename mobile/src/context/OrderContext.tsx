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
  
  // Safely get auth context - it should be available since OrderProvider is inside AuthProvider
  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth?.isAuthenticated || false;
  } catch (error) {
    // This shouldn't happen, but handle gracefully
    console.warn('Could not access auth context:', error);
  }

  const refreshOrders = async (): Promise<void> => {
    if (!isAuthenticated) {
      setOrders([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      // Don't throw, just log
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
    refreshOrders();
    } else {
      setOrders([]);
    }
  }, [isAuthenticated]);

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




