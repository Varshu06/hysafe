import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { storage } from '../utils/storage';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details for debugging
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data ? (config.method === 'post' || config.method === 'put' ? { ...config.data, password: '***' } : config.data) : undefined,
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

let onUnauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('Axios error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      },
    });

    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await storage.clearAll();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('Request timeout:', error.message);
      const timeoutError: any = new Error('Connection timeout. The server took too long to respond. Please check if the backend is running at ' + API_BASE_URL);
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    
    // Handle network errors (no internet, server unreachable, etc.)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
      console.error('Network error:', error.message, error.code);
      const networkError: any = new Error('Cannot connect to server. Please check:\n1. Your internet connection\n2. Backend server is running at ' + API_BASE_URL + '\n3. Firewall settings');
      networkError.isNetworkError = true;
      throw networkError;
    }
    
    // Handle CORS errors
    if (error.message?.includes('CORS') || error.code === 'ERR_CORS') {
      console.error('CORS error:', error.message);
      const corsError: any = new Error('CORS error. Please check backend CORS configuration.');
      corsError.isCorsError = true;
      throw corsError;
    }
    
    // Handle other axios errors
    if (error.code) {
      console.error('Axios error code:', error.code);
    }
    
    return Promise.reject(error);
  }
);

export default api;




