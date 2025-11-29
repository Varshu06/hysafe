import { Order } from '../types/order.types';
import api from './api';

/**
 * Toggle online/offline status
 */
export const toggleStatus = async (isOnline: boolean, location?: { lat: number; lng: number }, fcmToken?: string) => {
  const response = await api.put('/staff/status', {
    isOnline,
    location,
    fcmToken,
  });
  return response.data;
};

/**
 * Get available orders (pending, not assigned)
 */
export const getAvailableOrders = async (): Promise<Order[]> => {
  const response = await api.get('/staff/available-orders');
  return response.data.orders || [];
};

/**
 * Accept an order
 */
export const acceptOrder = async (orderId: string) => {
  const response = await api.post(`/staff/accept-order/${orderId}`);
  return response.data;
};

/**
 * Reject an order
 */
export const rejectOrder = async (orderId: string) => {
  const response = await api.post(`/staff/reject-order/${orderId}`);
  return response.data;
};

/**
 * Get ongoing orders (accepted by staff)
 */
export const getOngoingOrders = async (): Promise<Order[]> => {
  const response = await api.get('/staff/ongoing-orders');
  return response.data.orders || [];
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId: string, status: string, price?: number) => {
  const response = await api.put(`/staff/update-status/${orderId}`, {
    status,
    price,
  });
  return response.data;
};

