import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/app/store';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { fetchCurrentUser } from '@/features/auth/authSlice';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { BoxersPage } from '@/pages/BoxersPage';
import { BoxerDetailPage } from '@/pages/BoxerDetailPage';
import { MatchesPage } from '@/pages/MatchesPage';
import { RequestsPage } from '@/pages/RequestsPage';

/**
 * Protected route component that redirects to login if not authenticated.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, token } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Auth initializer component that fetches current user on app load.
 */
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { token, user, isLoading } = useAppSelector((state) => state.auth);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    const initAuth = async () => {
      if (token && !user) {
        await dispatch(fetchCurrentUser());
      }
      setInitialized(true);
    };

    initAuth();
  }, [dispatch, token, user]);

  if (!initialized && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Main application routes component.
 */
const AppRoutes: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/boxers"
          element={
            <ProtectedRoute>
              <BoxersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/boxers/:id"
          element={
            <ProtectedRoute>
              <BoxerDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <MatchesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="text-center py-12">
              <h1 className="text-4xl font-bold">404</h1>
              <p className="text-muted-foreground mt-2">Page not found</p>
            </div>
          }
        />
      </Routes>
    </MainLayout>
  );
};

/**
 * Root App component with providers.
 */
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthInitializer>
          <AppRoutes />
        </AuthInitializer>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
