import { storage } from '../utils/storage';
import api from './api';

// SET THIS TO FALSE TO USE REAL BACKEND
const MOCK_AUTH = true;

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
  address?: string;
  role?: 'admin' | 'staff' | 'customer';
}

export interface AuthResponse {
  message: string;
  token: string;
  user?: any;
}

/**
 * Unified login for all roles
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  if (MOCK_AUTH) {
    console.log('Using MOCK LOGIN', credentials);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    let role = 'customer';
    if (credentials.email?.includes('admin')) role = 'admin';
    if (credentials.email?.includes('staff')) role = 'staff';

    const mockResponse: AuthResponse = {
      message: 'Login successful (MOCK)',
      token: 'mock-jwt-token-12345',
      user: {
        _id: 'mock-user-id-123',
        name: 'Mock User',
        email: credentials.email || 'mock@example.com',
        phone: credentials.phone || '1234567890',
        role: role,
        address: '123 Mock St, Demo City'
      }
    };

    await storage.setToken(mockResponse.token);
    await storage.setUser(mockResponse.user);
    return mockResponse;
  }

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
 * Unified registration for all roles
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  if (MOCK_AUTH) {
    console.log('Using MOCK REGISTER', data);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    const mockResponse: AuthResponse = {
      message: 'Registration successful (MOCK)',
      token: 'mock-jwt-token-12345',
      user: {
        _id: 'mock-user-id-new',
        name: data.name,
        email: data.email || 'new@example.com',
        phone: data.phone,
        role: data.role || 'customer',
        address: data.address || ''
      }
    };

    await storage.setToken(mockResponse.token);
    await storage.setUser(mockResponse.user);
    return mockResponse;
  }

  const response = await api.post<AuthResponse>('/auth/register', data);
  
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
  if (MOCK_AUTH) {
    const user = await storage.getUser();
    if (user) return { user };
    return { user: { name: 'Mock User', role: 'customer' } };
  }
  const response = await api.get('/auth/me');
  return response.data;
};




