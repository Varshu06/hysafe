import api from "@utils/api";
import { InventoryItem } from "@types";

export const inventoryService = {
  getAllInventory: async (params?: { skip?: number; limit?: number }) => {
    const response = await api.get("/inventory", { params });
    return response.data.data;
  },

  getInventoryById: async (id: string): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/${id}`);
    return response.data.data;
  },

  createInventoryItem: async (
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> => {
    // If there's a file in data.image, send as multipart/form-data
    if (
      data &&
      (data as any).image &&
      typeof (data as any).image !== "string"
    ) {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) form.append(k, v as any);
      });
      const response = await api.post("/inventory", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    }

    const response = await api.post("/inventory", data);
    return response.data.data;
  },

  updateInventoryItem: async (
    id: string,
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> => {
    if (
      data &&
      (data as any).image &&
      typeof (data as any).image !== "string"
    ) {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) form.append(k, v as any);
      });
      const response = await api.put(`/inventory/${id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    }

    const response = await api.put(`/inventory/${id}`, data);
    return response.data.data;
  },

  deleteInventoryItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },
};
