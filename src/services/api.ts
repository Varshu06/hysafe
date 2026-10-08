import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { requestHadBearerToken, shouldClearStoredSession } from '../utils/sessionAuth';
import { storage } from '../utils/storage';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

const isAuthenticationRequest = (url?: string): boolean =>
  typeof url === 'string' && /(?:^|\/)auth(?:\/|$)/i.test(url.split('?')[0]);

// Request interceptor - Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = (await storage.getToken())?.trim();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request details for debugging
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: isAuthenticationRequest(config.url)
        ? '[REDACTED]'
        : config.data ? (config.method === 'post' || config.method === 'put' ? { ...config.data, password: '***' } : config.data) : undefined,
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

export const notifyUnauthorized = () => {
  if (onUnauthorizedCallback) onUnauthorizedCallback();
};

let sessionInvalidation: Promise<void> | null = null;

const invalidateStoredSession = (): Promise<void> => {
  if (sessionInvalidation) return sessionInvalidation;
  sessionInvalidation = (async () => {
    await storage.clearAll();
    notifyUnauthorized();
  })().finally(() => {
    sessionInvalidation = null;
  });
  return sessionInvalidation;
};

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status as number | undefined;
    const hadBearerToken = requestHadBearerToken(error.config?.headers);
    const missingToken = status === 401 && !hadBearerToken;

    if (!missingToken) {
      console.error('API request failed', {
        message: error.message,
        code: error.code,
        status,
        method: error.config?.method,
        url: error.config?.url,
      });
    }

    if (shouldClearStoredSession(status, error.config?.url, hadBearerToken)) {
      await invalidateStoredSession();
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const timeoutError: any = new Error('Connection timeout. The server took too long to respond. Please check if the backend is running at ' + API_BASE_URL);
      timeoutError.isTimeout = true;
      throw timeoutError;
    }

    // Handle network errors (no internet, server unreachable, etc.)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
      const networkError: any = new Error('Cannot connect to server. Please check:\n1. Your internet connection\n2. Backend server is running at ' + API_BASE_URL + '\n3. Firewall settings');
      networkError.isNetworkError = true;
      throw networkError;
    }

    // Handle CORS errors
    if (error.message?.includes('CORS') || error.code === 'ERR_CORS') {
      const corsError: any = new Error('CORS error. Please check backend CORS configuration.');
      corsError.isCorsError = true;
      throw corsError;
    }

    return Promise.reject(error);
  }
);

export default api;



