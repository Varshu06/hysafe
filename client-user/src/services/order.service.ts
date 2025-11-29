import { Order } from '../types/order.types';
import api from './api';

export interface CreateOrderData {
  quantity: number;
  deliveryAddress: string;
  deliverySlot?: string;
  paymentMethod: 'online' | 'offline';
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Create new order
 */
export const createOrder = async (data: CreateOrderData) => {
  const response = await api.post('/orders', data);
  return response.data;
};

/**
 * Get customer's orders
 */
export const getMyOrders = async (): Promise<Order[]> => {
  const response = await api.get('/orders');
  return response.data.orders || [];
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data.order;
};

/**
 * Cancel order
 */
export const cancelOrder = async (orderId: string) => {
  const response = await api.delete(`/orders/${orderId}`);
  return response.data;
};

