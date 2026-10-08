import axios, { AxiosInstance } from 'axios';
import { shouldInvalidateSession } from './sessionAuth';
import { storage } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token
api.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

let sessionInvalidation: Promise<void> | null = null;

const invalidateStoredSession = (): Promise<void> => {
  if (sessionInvalidation) return sessionInvalidation;
  sessionInvalidation = Promise.resolve()
    .then(() => {
      storage.removeToken();
      storage.removeUser();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    })
    .finally(() => {
      sessionInvalidation = null;
    });
  return sessionInvalidation;
};

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldInvalidateSession(error.response?.status, error.config?.url)) {
      void invalidateStoredSession();
    }
    return Promise.reject(error);
  }
);

export default api;
