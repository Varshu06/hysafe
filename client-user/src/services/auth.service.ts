import { storage } from '../utils/storage';
import api from './api';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterData {
  email?: string;
  phone: string;
  password: string;
  name: string;
  address: string;
  role?: 'customer';
}

export interface AuthResponse {
  message: string;
  token: string;
  user?: any;
}

/**
 * Customer login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  
  if (response.data.token) {
    await storage.setToken(response.data.token);
    if (response.data.user) {
      await storage.setUser(response.data.user);
    }
  }
  
  return response.data;
};

/**
 * Customer registration
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', {
    ...data,
    role: 'customer',
  });
  
  if (response.data.token) {
    await storage.setToken(response.data.token);
    if (response.data.user) {
      await storage.setUser(response.data.user);
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
 * Get current user profile
 */
export const getProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

