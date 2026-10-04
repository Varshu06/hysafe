import api from '@utils/api';
import { RecurringBill, RecurringDelivery } from '@types';

export const recurringService = {
  async getPlans(): Promise<RecurringDelivery[]> {
    const response = await api.get('/recurring-deliveries');
    return response.data.recurringDeliveries;
  },
  async getBills(): Promise<RecurringBill[]> {
    const response = await api.get('/recurring-bills');
    return response.data.recurringBills;
  },
  async updatePlanStatus(id: string, status: 'active' | 'paused' | 'cancelled'): Promise<RecurringDelivery> {
    const response = await api.put(`/recurring-deliveries/${id}/status`, { status });
    return response.data.recurringDelivery;
  },
  async recordPayment(id: string, paymentMethod: 'cash' | 'shop', amount: number): Promise<RecurringBill> {
    const response = await api.put(`/recurring-bills/${id}/payment`, { paymentMethod, amount });
    return response.data.recurringBill;
  },
};
