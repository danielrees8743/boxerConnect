import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/app/store';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { fetchCurrentUser } from '@/features/auth/authSlice';
import { ThemeProvider } from '@/components/theme';
import { MainLayout } from '@/components/layout/MainLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { BoxersPage } from '@/pages/BoxersPage';
import { BoxerDetailPage } from '@/pages/BoxerDetailPage';
import { MatchesPage } from '@/pages/MatchesPage';
import { RequestsPage } from '@/pages/RequestsPage';
import { ClubsPage } from '@/pages/ClubsPage';
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminUserFormPage,
  AdminBoxersPage,
  AdminBoxerFormPage,
  AdminClubsPage,
  AdminClubFormPage,
} from '@/pages/admin';

/**
 * Protected route component that redirects to login if not authenticated.
 * Optionally redirects admin users to admin dashboard.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectAdminTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectAdminTo }) => {
  const { isAuthenticated, isLoading, token, user } = useAppSelector((state) => state.auth);

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

  // Redirect admin users to admin area if specified
  if (redirectAdminTo && user?.role === 'ADMIN') {
    return <Navigate to={redirectAdminTo} replace />;
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
        <Route path="/clubs" element={<ClubsPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute redirectAdminTo="/admin">
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
 * Admin routes component - separated from main layout.
 */
const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/new" element={<AdminUserFormPage />} />
        <Route path="users/:id/edit" element={<AdminUserFormPage />} />
        <Route path="boxers" element={<AdminBoxersPage />} />
        <Route path="boxers/new" element={<AdminBoxerFormPage />} />
        <Route path="boxers/:id/edit" element={<AdminBoxerFormPage />} />
        <Route path="clubs" element={<AdminClubsPage />} />
        <Route path="clubs/new" element={<AdminClubFormPage />} />
        <Route path="clubs/:id/edit" element={<AdminClubFormPage />} />
      </Route>
    </Routes>
  );
};

/**
 * Root App component with providers.
 */
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="system">
        <BrowserRouter>
          <AuthInitializer>
            <Routes>
              {/* Admin routes have their own layout */}
              <Route path="/admin/*" element={<AdminRoutes />} />
              {/* All other routes use main layout */}
              <Route path="/*" element={<AppRoutes />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
