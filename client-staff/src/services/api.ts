import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { storage } from '../utils/storage';

/**
 * Create axios instance with default config
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add auth token
 */
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await storage.clearAll();
      // Navigate to login (handled in app)
    }
    return Promise.reject(error);
  }
);

export default api;

