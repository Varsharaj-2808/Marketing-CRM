import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import Dashboard from '../pages/Dashboard';
import AdminLayout from '../layouts/AdminLayout';
import AppLayout from '../layouts/AppLayout';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import SecurityPage from '../pages/admin/SecurityPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import DashboardPage from '../pages/user/DashboardPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'security', element: <SecurityPage /> },
      { path: 'users', element: <UserManagementPage /> },
    ],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
    ],
  },
]);

export default router;
