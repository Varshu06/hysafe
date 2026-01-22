import api from './api';
import { RecurringFrequency } from '../types/recurring.types';

export interface CreateRecurringDeliveryData {
  productId: string;
  productName: string;
  quantity: number;
  frequency: RecurringFrequency;
  deliveryAddress: string;
  deliveryAddressId?: string;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  specialInstructions?: string;
}

export interface RecurringDelivery {
  _id: string;
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  deliveryAddress: string;
  deliveryAddressId?: string;
  specialInstructions?: string;
  nextDeliveryDate?: string;
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
  data: Partial<CreateRecurringDeliveryData>
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
 * Delete/deactivate a recurring delivery
 */
export const deleteRecurringDelivery = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(`/customers/recurring-deliveries/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting recurring delivery:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete recurring delivery');
  }
};


