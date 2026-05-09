import api from '@utils/api';
import { Staff } from '@types';

export const staffService = {
  getAllStaff: async (params?: {
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get('/staff', { params });
    return response.data.data;
  },

  getStaffById: async (id: string): Promise<Staff> => {
    const response = await api.get(`/staff/${id}`);
    return response.data.data;
  },

  createStaff: async (data: Partial<Staff>): Promise<Staff> => {
    const response = await api.post('/staff', data);
    return response.data.data;
  },

  updateStaff: async (id: string, data: Partial<Staff>): Promise<Staff> => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data.data;
  },

  deleteStaff: async (id: string): Promise<void> => {
    await api.delete(`/staff/${id}`);
  },

  getStaffAssignedOrders: async (id: string) => {
    const response = await api.get(`/staff/${id}/orders`);
    return response.data.data;
  },
};
