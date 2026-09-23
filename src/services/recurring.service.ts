import api from './api';
import { RecurringFrequency } from '../types/recurring.types';

export type RecurringBillStatus = 'pending' | 'confirmed' | 'paid' | 'overdue';
export interface RecurringBill {
  _id: string;
  recurringDeliveryId: string | { _id: string; frequency?: RecurringFrequency; deliveryDays?: number[]; offlinePaymentMethod?: 'cash' | 'shop' };
  productName: string;
  quantityPerDelivery: number;
  billingFrequency: 'per_order' | 'weekly' | 'monthly';
  paymentTerms?: 'one-time' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  scheduledDeliveryDates: string[];
  amount: number;
  status: RecurringBillStatus;
  paymentMethod?: 'cash' | 'shop';
  preferredPaymentMethod?: 'cash' | 'shop';
  paymentAmount?: number;
  paidAt?: string;
  paidBy?: { _id: string; name?: string; phone?: string };
}

export interface CreateRecurringDeliveryData {
  productId: string;
  productName: string;
  quantity: number;
  frequency: RecurringFrequency;
  deliveryDays?: number[];
  deliveryAddress: string;
  deliveryAddressId?: string;
  billingFrequency: 'per_order' | 'weekly' | 'monthly';
  paymentMethod: 'cash' | 'shop';
  specialInstructions?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateRecurringDeliveryData {
  productId?: string;
  productName?: string;
  quantity?: number;
  frequency?: RecurringFrequency;
  deliveryDays?: number[];
  deliveryAddress?: string;
  deliveryAddressId?: string;
  billingFrequency?: 'per_order' | 'weekly' | 'monthly';
  specialInstructions?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  nextDeliveryDate?: string;
}

export interface RecurringDelivery {
  _id: string;
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  frequency: RecurringFrequency;
  deliveryDays?: number[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  billingFrequency: 'per_order' | 'weekly' | 'monthly';
  offlinePaymentMethod?: 'cash' | 'shop';
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
  recurringBill?: RecurringBill;
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

export const getRecurringBills = async (): Promise<{ recurringBills: RecurringBill[] }> => {
  const response = await api.get<{ recurringBills: RecurringBill[] }>('/customers/recurring-bills');
  return response.data;
};

export const getRecurringBill = async (id: string): Promise<{ recurringBill: RecurringBill }> => {
  const response = await api.get<{ recurringBill: RecurringBill }>(`/customers/recurring-bills/${id}`);
  return response.data;
};

export const confirmRecurringBill = async (id: string): Promise<{ message: string; recurringBill: RecurringBill }> => {
  const response = await api.put<{ message: string; recurringBill: RecurringBill }>(`/customers/recurring-bills/${id}/confirm`);
  return response.data;
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
