import api from './api';

export type CustomerNotification = {
  _id: string;
  type: 'recurring_delivery_paused' | 'recurring_delivery_resumed' | 'recurring_delivery_cancelled';
  productName: string;
  createdAt: string;
};

export const getCustomerNotifications = async (): Promise<CustomerNotification[]> => {
  const response = await api.get<{ notifications: CustomerNotification[] }>('/customers/notifications');
  return response.data.notifications;
};
