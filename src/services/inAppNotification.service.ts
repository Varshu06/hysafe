import api from './api';

export type InAppNotification = {
  _id: string; type: string; title?: string; message?: string; productName?: string;
  orderId?: string; billId?: string; recurringDeliveryId?: string; isRead: boolean; createdAt: string;
};

export const getInAppNotifications = async () => {
  const { data } = await api.get<{ notifications: InAppNotification[]; unreadCount: number }>('/notifications');
  return data;
};
export const markInAppNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`);
export const markAllInAppNotificationsRead = () => api.patch('/notifications/read-all');
