import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import boxerReducer from '@/features/boxer/boxerSlice';
import matchingReducer from '@/features/matching/matchingSlice';
import requestsReducer from '@/features/requests/requestsSlice';

/**
 * Redux store configuration for BoxerConnect.
 * Combines all feature reducers and configures middleware.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    boxer: boxerReducer,
    matching: matchingReducer,
    requests: requestsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: import.meta.env.DEV,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
