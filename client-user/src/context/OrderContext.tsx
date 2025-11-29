import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getMyOrders } from '../services/order.service';
import { socketService } from '../services/socket.service';
import { Order } from '../types/order.types';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Connect socket and listen for updates
      const connectSocket = async () => {
        const token = await storage.getToken();
        socketService.connect(token || undefined);
      };
      connectSocket();
      
      socketService.onOrderStatusUpdate((data) => {
        // Update order status in real-time
        setOrders((prev) =>
          prev.map((order) =>
            order._id === data.orderId ? { ...order, status: data.status as any } : order
          )
        );
      });

      refreshOrders();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  const refreshOrders = async () => {
    try {
      setIsLoading(true);
      const ordersData = await getMyOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

