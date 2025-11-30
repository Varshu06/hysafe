// Replace 192.168.1.6 with your actual machine IP if it changes
const LOCAL_IP = '192.168.1.6';

export const API_BASE_URL = __DEV__
  ? `http://${LOCAL_IP}:5000/api`
  : 'https://your-production-api.com/api';

export const SOCKET_URL = __DEV__
  ? `http://${LOCAL_IP}:5000`
  : 'https://your-production-api.com';

export const COLORS = {
  primary: '#0284C7', // Ocean Blue (Sky 600)
  primaryDark: '#0C4A6E', // Deep Ocean (Sky 900)
  primaryLight: '#38BDF8', // Light Blue (Sky 400)
  secondary: '#FFFFFF',
  accent: '#F0F9FF', // Sky 50 - Very light water background
  surface: '#E0F2FE', // Sky 100 - Card backgrounds
  text: '#0F172A', // Slate 900 - Deep dark blue-grey for text
  textLight: '#64748B', // Slate 500
  success: '#0EA5E9', // Sky 500 - Success (keeping it blue-ish green or just blue)
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#BAE6FD', // Sky 200
};
