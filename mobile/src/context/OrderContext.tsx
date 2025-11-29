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
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOrders();
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




