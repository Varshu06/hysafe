import { storage } from '../utils/storage';
import api from './api';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user?: any;
  staff?: any;
}

/**
 * Staff login
 */
export const staffLogin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/staff/login', credentials);
  
  if (response.data.token) {
    await storage.setToken(response.data.token);
    if (response.data.staff) {
      await storage.setUser(response.data.staff);
    }
  }
  
  return response.data;
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
  await storage.clearAll();
};

/**
 * Get current staff profile
 */
export const getStaffProfile = async () => {
  const response = await api.get('/staff/profile');
  return response.data;
};

