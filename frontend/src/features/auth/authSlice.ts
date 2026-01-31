import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User, LoginCredentials, RegisterData, AuthResponse } from '@/types';
import { authService } from '@/services/authService';

// Initial state for auth slice
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * Async thunk for user login
 */
export const loginUser = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authService.login(credentials);
    localStorage.setItem('token', response.token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return rejectWithValue(message);
  }
});

/**
 * Async thunk for user registration
 */
export const registerUser = createAsyncThunk<
  AuthResponse,
  RegisterData,
  { rejectValue: string }
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    const response = await authService.register(data);
    localStorage.setItem('token', response.token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return rejectWithValue(message);
  }
});

/**
 * Async thunk for fetching current user profile
 */
export const fetchCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const user = await authService.getCurrentUser();
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return rejectWithValue(message);
  }
});

/**
 * Auth slice managing authentication state
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Logout user and clear all auth state
     */
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
    },
    /**
     * Clear any auth errors
     */
    clearError: (state) => {
      state.error = null;
    },
    /**
     * Set user directly (useful for hydrating from token)
     */
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    /**
     * Set token directly
     */
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Login failed';
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Registration failed';
        state.isAuthenticated = false;
      });

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch user';
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      });
  },
});

export const { logout, clearError, setUser, setToken } = authSlice.actions;
export default authSlice.reducer;
