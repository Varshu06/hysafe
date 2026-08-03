import { storage } from '../utils/storage';
import api from './api';
import { API_BASE_URL } from '../utils/constants';

// SET THIS TO FALSE TO USE REAL BACKEND
const MOCK_AUTH = false;

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
  customerType?: 'home' | 'shop' | 'hotel' | 'bank' | 'event';
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
        id: 'mock-user-id-123',
        _id: 'mock-user-id-123',
        name: 'Mock User',
        email: credentials.email || 'mock@example.com',
        phone: credentials.phone || '1234567890',
        role: role,
      }
    };

    await storage.setToken(mockResponse.token);
    await storage.setUser(mockResponse.user);
    return mockResponse;
  }

  try {
    console.log('Logging in with credentials:', { ...credentials, password: '***' });
    
    // Ensure we're sending phone (not email) for login
    const loginData = {
      phone: credentials.phone,
      email: credentials.email,
      password: credentials.password,
    };
    
    if (!loginData.phone) {
      throw new Error('Phone number or email is required');
    }
    
    const response = await api.post<AuthResponse>('/auth/login', loginData);
    
    if (response.data.token) {
      await storage.setToken(response.data.token);
      if (response.data.user) {
        await storage.setUser(response.data.user);
      }
    }
    
    return response.data;
  } catch (error: any) {
    // Handle HTTP status errors first (before logging)
    if (error.response?.status === 401) {
      // Don't log wrong password errors to console
      const backendMessage = error.response?.data?.message;
      if (backendMessage === 'Account is inactive') {
        throw new Error('Account is inactive. Please contact admin.');
      }
      throw new Error(backendMessage || 'Invalid phone number or password. Please check your credentials and try again.');
    }
    
    // Only log non-401 errors for debugging
    console.error('Login error details:', {
      message: error.message,
      code: error.code,
      isTimeout: error.isTimeout,
      isNetworkError: error.isNetworkError,
      isCorsError: error.isCorsError,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // Handle timeout errors
    if (error.isTimeout || error.code === 'ECONNABORTED') {
      throw new Error('Connection timeout. The server took too long to respond. Please check if the backend is running.');
    }
    
    // Handle network errors
    if (error.isNetworkError || error.code === 'ERR_NETWORK' || !error.response) {
      throw new Error('Cannot connect to server. Please check:\n• Your internet connection\n• Backend server is running\n• IP address is correct: ' + API_BASE_URL);
    }
    
    // Handle CORS errors
    if (error.isCorsError || error.code === 'ERR_CORS') {
      throw new Error('CORS error. Please check backend CORS configuration.');
    }
    
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || 'Invalid request. Please check your input.';
      throw new Error(errorMessage);
    }
    
    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.message || 'Server error. Please try again later.';
      throw new Error(errorMessage);
    }
    
    // Generic error message
    const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please try again.';
    throw new Error(errorMessage);
  }
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
        id: 'mock-user-id-new',
        _id: 'mock-user-id-new',
        name: data.name,
        email: data.email || 'new@example.com',
        phone: data.phone,
        role: data.role || 'customer',
        customerType: data.customerType || 'home',
      }
    };

    await storage.setToken(mockResponse.token);
    await storage.setUser(mockResponse.user);
    return mockResponse;
  }

  try {
    console.log('Registering user with data:', { ...data, password: '***' });
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.token) {
      await storage.setToken(response.data.token);
      if (response.data.user) {
        await storage.setUser(response.data.user);
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error response:', error.response?.data);
    
    // Extract error message from various possible locations
    const errorMessage = 
      error.response?.data?.message || 
      error.response?.data?.error?.message ||
      error.message || 
      'Registration failed. Please try again.';
    
    throw new Error(errorMessage);
  }
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

/**
 * Change password
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  try {
    const response = await api.put<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error: any) {
    console.error('Change password error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to change password');
  }
};

/**
 * Initiate forgot password flow
 */
export const forgotPassword = async (phone: string): Promise<{ message: string, otp?: string }> => {
  if (MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: 'OTP sent successfully (MOCK)', otp: '123456' };
  }
  try {
    const response = await api.post<{ message: string, otp?: string }>('/auth/forgot-password', { phone });
    return response.data;
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to request OTP');
  }
};

/**
 * Reset password
 */
export const resetPassword = async (phone: string, otp: string, newPassword: string): Promise<{ message: string }> => {
  if (MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: 'Password reset successful (MOCK)' };
  }
  try {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      phone,
      otp,
      newPassword,
    });
    return response.data;
  } catch (error: any) {
    console.error('Reset password API error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to reset password');
  }
};




