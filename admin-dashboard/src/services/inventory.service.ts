import api from '@utils/api';
import { InventoryItem } from '@types';

export const inventoryService = {
  getAllInventory: async (params?: {
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get('/inventory', { params });
    return response.data.data;
  },

  getInventoryById: async (id: string): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/${id}`);
    return response.data.data;
  },

  createInventoryItem: async (
    data: Partial<InventoryItem>
  ): Promise<InventoryItem> => {
    const response = await api.post('/inventory', data);
    return response.data.data;
  },

  updateInventoryItem: async (
    id: string,
    data: Partial<InventoryItem>
  ): Promise<InventoryItem> => {
    const response = await api.put(`/inventory/${id}`, data);
    return response.data.data;
  },

  deleteInventoryItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },
  getLowStockItems: async () => {
    const response = await api.get('/inventory/low-stock');
    return response.data.data;
  },
};
