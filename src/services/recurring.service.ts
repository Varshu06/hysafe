import api from './api';
import { RecurringFrequency, RecurringDeliveryItem } from '../types/recurring.types';

export interface CreateRecurringDeliveryData {
  productId?: string;
  productName?: string;
  quantity?: number;
  items?: RecurringDeliveryItem[];
  frequency: RecurringFrequency;
  deliveryAddress: string;
  deliveryAddressId?: string;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  specialInstructions?: string;
  startDate?: string;
  endDate?: string;
  deliveryCount?: number;
  billAmount?: number;
  paymentMethod?: 'offline' | 'online';
  paymentStatus?: 'pending' | 'paid';
  confirmationStatus?: 'confirmed' | 'pending';
}

export interface UpdateRecurringDeliveryData {
  productId?: string;
  productName?: string;
  quantity?: number;
  items?: RecurringDeliveryItem[];
  frequency?: RecurringFrequency;
  deliveryAddress?: string;
  deliveryAddressId?: string;
  paymentTerms?: 'one-time' | 'weekly' | 'monthly';
  specialInstructions?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  nextDeliveryDate?: string;
  deliveryCount?: number;
  billAmount?: number;
  paymentMethod?: 'offline' | 'online';
  paymentStatus?: 'pending' | 'paid';
  confirmationStatus?: 'confirmed' | 'pending';
}

export interface RecurringDelivery {
  _id: string;
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  items?: RecurringDeliveryItem[];
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  deliveryAddress: string;
  deliveryAddressId?: string;
  specialInstructions?: string;
  nextDeliveryDate?: string;
  deliveryCount?: number;
  billAmount?: number;
  paymentMethod?: 'offline' | 'online';
  paymentStatus?: 'pending' | 'paid';
  confirmationStatus?: 'confirmed' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface RecurringDeliveryResponse {
  message: string;
  recurringDelivery: RecurringDelivery;
}

export interface RecurringDeliveriesResponse {
  recurringDeliveries: RecurringDelivery[];
}

/**
 * Create a new recurring delivery
 */
export const createRecurringDelivery = async (
  data: CreateRecurringDeliveryData
): Promise<RecurringDeliveryResponse> => {
  try {
    const response = await api.post<RecurringDeliveryResponse>('/customers/recurring-deliveries', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating recurring delivery:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to create recurring delivery');
  }
};

/**
 * Get all recurring deliveries for the current user
 */
export const getRecurringDeliveries = async (): Promise<RecurringDeliveriesResponse> => {
  try {
    const response = await api.get<RecurringDeliveriesResponse>('/customers/recurring-deliveries');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching recurring deliveries:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch recurring deliveries');
  }
};

/**
 * Update a recurring delivery
 */
export const updateRecurringDelivery = async (
  id: string,
  data: UpdateRecurringDeliveryData
): Promise<RecurringDeliveryResponse> => {
  try {
    const response = await api.put<RecurringDeliveryResponse>(`/customers/recurring-deliveries/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating recurring delivery:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to update recurring delivery');
  }
};

/**
 * Pause an active recurring delivery
 */
export const pauseRecurringDelivery = async (id: string): Promise<RecurringDeliveryResponse> => {
  return updateRecurringDelivery(id, { isActive: false });
};

/**
 * Resume a paused recurring delivery
 */
export const resumeRecurringDelivery = async (id: string): Promise<RecurringDeliveryResponse> => {
  return updateRecurringDelivery(id, { isActive: true });
};

/**
 * Delete/deactivate a recurring delivery
 */
export const deleteRecurringDelivery = async (
  id: string,
  permanent: boolean = false
): Promise<{ message: string }> => {
  try {
    const url = permanent
      ? `/customers/recurring-deliveries/${id}?permanent=true`
      : `/customers/recurring-deliveries/${id}`;
    const response = await api.delete<{ message: string }>(url);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting recurring delivery:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete recurring delivery');
  }
};
