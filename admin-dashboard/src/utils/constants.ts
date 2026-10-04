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
  pending: 'bg-warning/10 text-warning',
  accepted: 'bg-accent text-primary',
  out_for_delivery: 'bg-accent text-primary',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
