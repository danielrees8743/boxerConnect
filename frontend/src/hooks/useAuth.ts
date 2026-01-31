import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  loginUser,
  registerUser,
  logout,
  clearError,
} from '@/features/auth/authSlice';
import type { LoginCredentials, RegisterData } from '@/types';

/**
 * Custom hook for authentication operations.
 * Provides convenient methods for login, register, logout, and auth state.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * const handleLogin = async (credentials) => {
 *   const success = await login(credentials);
 *   if (success) navigate('/dashboard');
 * };
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error, token } = useAppSelector(
    (state) => state.auth
  );

  /**
   * Login with credentials
   * @returns true if login successful, false otherwise
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      const result = await dispatch(loginUser(credentials));
      return loginUser.fulfilled.match(result);
    },
    [dispatch]
  );

  /**
   * Register new user
   * @returns true if registration successful, false otherwise
   */
  const register = useCallback(
    async (data: RegisterData): Promise<boolean> => {
      const result = await dispatch(registerUser(data));
      return registerUser.fulfilled.match(result);
    },
    [dispatch]
  );

  /**
   * Logout current user and redirect to login
   */
  const logoutUser = useCallback(() => {
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  /**
   * Clear any authentication errors
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout: logoutUser,
    clearError: clearAuthError,
  };
}

export default useAuth;
