import api from '@utils/api';

export type AdminNotification = { _id: string; type: string; title?: string; message?: string; productName?: string; orderId?: string; isRead: boolean; createdAt: string };
export const getNotifications = async () => (await api.get<{ notifications: AdminNotification[]; unreadCount: number }>('/notifications')).data;
export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');
export const createAnnouncement = async (title: string, message: string) => (await api.post('/notifications/announcements', { title, message, audience: 'all_customers' })).data;
