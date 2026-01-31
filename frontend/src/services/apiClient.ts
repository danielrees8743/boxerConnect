import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

/**
 * Base API URL - uses Vite proxy in development
 */
const API_BASE_URL = '/api/v1';

/**
 * Axios instance configured for the BoxerConnect API.
 * Includes interceptors for auth token and error handling.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Request interceptor to add auth token to requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle specific error codes
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', data?.message);
          break;
        case 404:
          // Not found
          console.error('Resource not found:', data?.message);
          break;
        case 422:
          // Validation error
          console.error('Validation error:', data?.errors);
          break;
        case 500:
          // Server error
          console.error('Server error:', data?.message);
          break;
        default:
          console.error('API error:', data?.message);
      }

      // Create a more descriptive error message
      const message = data?.message || 'An unexpected error occurred';
      return Promise.reject(new Error(message));
    }

    // Network error or request cancelled
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    return Promise.reject(new Error('Network error. Please check your connection.'));
  }
);

export default apiClient;
