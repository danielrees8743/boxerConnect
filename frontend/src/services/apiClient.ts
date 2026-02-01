import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiError, ApiResponse } from '@/types';

/**
 * Base API URL - uses Vite proxy in development
 */
const API_BASE_URL = '/api/v1';

/**
 * Flag to prevent multiple refresh attempts
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: AxiosResponse) => void;
  reject: (error: Error) => void;
  config: InternalAxiosRequestConfig;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      // Retry the request with new token
      const token = localStorage.getItem('accessToken');
      if (token && promise.config.headers) {
        promise.config.headers.Authorization = `Bearer ${token}`;
      }
      apiClient.request(promise.config).then(promise.resolve).catch(promise.reject);
    }
  });
  failedQueue = [];
};

/**
 * Clear auth tokens and redirect to login
 */
const clearAuthAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

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
    const token = localStorage.getItem('accessToken');
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
 * Response interceptor for error handling with token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle specific error codes
    if (error.response) {
      const { status, data } = error.response;

      // Handle 401 with token refresh
      if (status === 401 && !originalRequest._retry) {
        // Don't try to refresh if this is already the refresh request
        if (originalRequest.url?.includes('/auth/refresh')) {
          clearAuthAndRedirect();
          return Promise.reject(new Error('Session expired. Please log in again.'));
        }

        // If already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          isRefreshing = false;
          clearAuthAndRedirect();
          return Promise.reject(new Error('No refresh token available'));
        }

        try {
          // Attempt to refresh the token
          const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const newTokens = response.data.data;
          if (newTokens) {
            localStorage.setItem('accessToken', newTokens.accessToken);
            localStorage.setItem('refreshToken', newTokens.refreshToken);

            // Retry the original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            }

            processQueue(null);
            return apiClient.request(originalRequest);
          }
        } catch (refreshError) {
          processQueue(new Error('Token refresh failed'));
          clearAuthAndRedirect();
          return Promise.reject(new Error('Session expired. Please log in again.'));
        } finally {
          isRefreshing = false;
        }
      }

      switch (status) {
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

/**
 * Helper function for file uploads using multipart/form-data.
 * Handles authentication and proper content-type headers.
 *
 * @param url - The API endpoint URL (relative to base URL)
 * @param file - The File object to upload
 * @param fieldName - The form field name for the file (default: 'file')
 * @returns Promise resolving to the response data
 *
 * @example
 * const result = await uploadFile<{ profilePhotoUrl: string }>(
 *   '/boxers/me/photo',
 *   selectedFile,
 *   'photo'
 * );
 */
export async function uploadFile<T>(
  url: string,
  file: File,
  fieldName: string = 'file'
): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  // Use apiClient to leverage existing interceptors for auth and error handling
  const response = await apiClient.post<T>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export default apiClient;
