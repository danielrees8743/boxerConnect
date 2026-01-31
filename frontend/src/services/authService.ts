import { apiClient } from './apiClient';
import type { LoginCredentials, RegisterData, AuthResponse, User, ApiResponse } from '@/types';

/**
 * Authentication service for handling login, registration, and user operations.
 */
export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }
    return response.data.data;
  },

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Registration failed');
    }
    return response.data.data;
  },

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to get user');
    }
    return response.data.data.user;
  },

  /**
   * Logout user (invalidate token on server if applicable)
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Logout should succeed even if server request fails
      // Token will be removed client-side regardless
    }
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Token refresh failed');
    }
    return response.data.data;
  },

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  },
};
