import api from '@utils/api';
import { Order, OrderStatus } from '@types';

export const orderService = {
  getAllOrders: async (params?: {
    status?: OrderStatus;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get('/orders', { params });
    return response.data.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data.data;
  },

  assignStaff: async (
    orderId: string,
    staffId: string
  ): Promise<Order> => {
    const response = await api.put(`/orders/${orderId}/assign-staff`, {
      staffId,
    });
    return response.data.data;
  },

  getOrderStats: async () => {
    const response = await api.get('/orders/stats');
    return response.data.data;
  },

  getOrdersChart: async () => {
    const response = await api.get('/orders/chart');
    return response.data.data;
  },
  getRecentOrders: async () => {
    const response = await api.get("/orders/recent");
    return response.data.data;
  },
};

