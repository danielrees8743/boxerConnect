import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { GymOwnerSidebar } from './GymOwnerSidebar';

/**
 * Gym Owner layout component that wraps all gym owner pages.
 * Includes the gym owner sidebar navigation and renders child routes.
 * Redirects non-gym-owner users to the dashboard.
 */
export const GymOwnerLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect non-gym-owner users to dashboard
  if (user?.role !== 'GYM_OWNER') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <GymOwnerSidebar />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};
