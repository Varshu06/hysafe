import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket.service';
import { getAvailableOrders, getOngoingOrders } from '../services/staff.service';
import { Order } from '../types/order.types';

interface OrderContextType {
  availableOrders: Order[];
  ongoingOrders: Order[];
  isLoading: boolean;
  refreshAvailableOrders: () => Promise<void>;
  refreshOngoingOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [ongoingOrders, setOngoingOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Setup socket listeners
    const socket = socketService.connect();
    
    socketService.onNewOrder((newOrder: any) => {
      // Add new order to available orders
      setAvailableOrders((prev) => [newOrder, ...prev]);
    });

    socketService.onOrderAccepted((data) => {
      // Remove accepted order from available orders
      setAvailableOrders((prev) => prev.filter((order) => order._id !== data.orderId));
      // Refresh ongoing orders
      refreshOngoingOrders();
    });

    socketService.onOrderRejected((data) => {
      // Order rejected, remains in available orders
      console.log('Order rejected:', data.orderId);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const refreshAvailableOrders = async () => {
    try {
      setIsLoading(true);
      const orders = await getAvailableOrders();
      setAvailableOrders(orders);
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOngoingOrders = async () => {
    try {
      const orders = await getOngoingOrders();
      setOngoingOrders(orders);
    } catch (error) {
      console.error('Failed to fetch ongoing orders:', error);
    }
  };

  return (
    <OrderContext.Provider
      value={{
        availableOrders,
        ongoingOrders,
        isLoading,
        refreshAvailableOrders,
        refreshOngoingOrders,
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

