import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { MainLayout } from '@layouts/MainLayout';
import { LoginPage } from '@pages/LoginPage';
import { DashboardPage } from '@pages/DashboardPage';
import { OrdersPage } from '@pages/OrdersPage';
import { CustomersPage } from '@pages/CustomersPage';
import { StaffPage } from '@pages/StaffPage';
import { InventoryPage } from '@pages/InventoryPage';
import { RecurringDeliveriesPage } from '@pages/RecurringDeliveriesPage';
import { ErrorState, Loading } from '@components/Common';

const SessionRetry = () => {
  const { retrySession, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
      <ErrorState message="Can't reach HySafe. Your account was not signed out." />
      <button
        type="button"
        onClick={retrySession}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
      >
        Try again
      </button>
      <button type="button" onClick={logout} className="text-sm font-semibold text-primary">
        Sign in
      </button>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading, sessionError } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (sessionError) {
    return <SessionRetry />;
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, sessionError } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isLoading ? (
              <div className="flex min-h-screen items-center justify-center">
                <Loading />
              </div>
            ) : sessionError ? (
              <SessionRetry />
            ) : isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recurring-deliveries"
          element={
            <ProtectedRoute>
              <RecurringDeliveriesPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};
