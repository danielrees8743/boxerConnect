import { apiClient } from './apiClient';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types';

/**
 * Authentication service for handling login, registration, and user operations.
 */
export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Logout user (invalidate token on server if applicable)
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Logout should succeed even if server request fails
      // Token will be removed client-side regardless
    }
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
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
