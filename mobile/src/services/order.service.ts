import { Order } from '../types/order.types';

// Placeholder Order Service
// This service will interact with the backend Order API

export const createOrder = async (orderData: Partial<Order>): Promise<{ success: boolean; order: Order }> => {
  return new Promise((resolve) => {
    console.log('createOrder called with:', orderData);
    setTimeout(() => {
      const newOrder: Order = {
        _id: Math.random().toString(36).substr(2, 9),
        quantity: orderData.quantity || 1,
        totalPrice: (orderData.quantity || 1) * 40,
        price: (orderData.quantity || 1) * 40,
        status: 'pending',
        paymentMethod: orderData.paymentMethod || 'offline',
        paymentStatus: 'pending',
        deliveryAddress: orderData.deliveryAddress || '123 Main St, City',
        notes: orderData.notes,
        createdAt: new Date().toISOString(),
        ...orderData,
      } as Order;
      
      resolve({ success: true, order: newOrder });
    }, 1000);
  });
};

export const getMyOrders = async (): Promise<Order[]> => {
  return new Promise((resolve) => {
    console.log('getMyOrders called');
    setTimeout(() => {
      resolve([
        {
          _id: '1',
          quantity: 2,
          price: 80,
          totalPrice: 80,
          status: 'pending',
          paymentMethod: 'offline',
          paymentStatus: 'pending',
          deliveryAddress: 'Flat 302, Green Apts, MG Road',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          driverName: undefined, // Not assigned yet
        },
        {
          _id: '2',
          quantity: 5,
          price: 200,
          totalPrice: 200,
          status: 'delivered',
          paymentMethod: 'online',
          paymentStatus: 'paid',
          deliveryAddress: 'Office 4B, Tech Park',
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          deliveredAt: new Date(Date.now() - 86400000).toISOString(),
          driverName: 'Baskar',
        },
        {
          _id: '3',
          quantity: 1,
          price: 40,
          totalPrice: 40,
          status: 'cancelled',
          paymentMethod: 'offline',
          paymentStatus: 'pending',
          deliveryAddress: 'Home 12, Street 5',
          createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          driverName: 'Shanmugam',
        },
      ]);
    }, 1000);
  });
};

export const getOrderById = async (id: string): Promise<Order> => {
  return new Promise((resolve) => {
    console.log('getOrderById called with:', id);
    setTimeout(() => {
      // Return a mock order based on ID or default to a generic one
      resolve({
        _id: id,
        quantity: 3,
        price: 120,
        totalPrice: 120,
        status: 'out_for_delivery',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        deliveryAddress: 'Villa 45, Golden Palms',
        pickupAddress: 'Warehouse A, Industrial Area',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        acceptedAt: new Date(Date.now() - 1800000).toISOString(),
        outForDeliveryAt: new Date(Date.now() - 900000).toISOString(),
        notes: 'Please call before reaching.',
        driverName: 'Baskar',
      });
    }, 800);
  });
};

export const updateOrderStatus = async (id: string, status: string): Promise<any> => {
  return new Promise((resolve) => {
    console.log('updateOrderStatus called with:', id, status);
    setTimeout(() => {
      resolve({ id, status });
    }, 500);
  });
};
