import api from '@utils/api';
import { CustomerProfile } from '@types';

export const customerService = {
  getAllCustomers: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await api.get('/customers', { params });
    return response.data.data;
  },

  getCustomerById: async (id: string): Promise<CustomerProfile> => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  getCustomerOrders: async (customerId: string) => {
    const response = await api.get(`/customers/${customerId}/orders`);
    return response.data.data;
  },

  updateCustomer: async (
    id: string,
    data: Partial<CustomerProfile>
  ): Promise<CustomerProfile> => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data.data;
  },

  getCustomerStats: async () => {
    const response = await api.get('/customers/stats');
    return response.data.data;
  },
  deleteCustomer: async (id: string) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data.data;
  },
};
