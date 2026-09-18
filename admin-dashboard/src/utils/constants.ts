export const COLORS = {
  primary: '#0284C7',
  primaryDark: '#0C4A6E',
  primaryLight: '#38BDF8',
  secondary: '#FFFFFF',
  accent: '#F0F9FF',
  surface: '#E0F2FE',
  text: '#0F172A',
  textLight: '#64748B',
  success: '#0EA5E9',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#BAE6FD',
};

export const STORAGE_KEYS = {
  TOKEN: 'admin_auth_token',
  USER: 'admin_user',
  SIDEBAR_OPEN: 'admin_sidebar_open',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
