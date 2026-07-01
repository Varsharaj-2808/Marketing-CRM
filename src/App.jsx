import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/user/DashboardPage';
import LeadList from './pages/leads/LeadList';
import CreateLead from './pages/leads/CreateLead';
import LeadDetails from './pages/leads/LeadDetails';
import LeadHistory from './pages/leads/LeadHistory';
import AdminLayout from './components/layout/AdminLayout';
import MarketingLayout from './components/layout/MarketingLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SecurityPage from './pages/admin/SecurityPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import ServicesPage from './pages/admin/ServicesPage';
import LeadSourcesPage from './pages/admin/LeadSourcesPage';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app/login" replace /> },

  { path: '/app/login', element: <LoginPage /> },
  { path: '/app/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/app/reset-password', element: <ResetPasswordPage /> },

  {
    path: '/marketing',
    element: <MarketingLayout />,
    children: [
      { index: true, element: <Navigate to="/marketing/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'leads', element: <LeadList /> },
      { path: 'leads/create', element: <CreateLead /> },
      { path: 'leads/:leadId', element: <LeadDetails /> },
      { path: 'leads/:leadId/lead-history', element: <LeadHistory /> },
    ],
  },

  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <UserManagementPage /> },
      { path: 'security', element: <SecurityPage /> },
      { path: 'audit-logs', element: <AuditLogPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'lead-sources', element: <LeadSourcesPage /> },
      { path: 'leads', element: <LeadList /> },
      { path: 'leads/create', element: <CreateLead /> },
      { path: 'leads/:leadId', element: <LeadDetails /> },
      { path: 'leads/:leadId/lead-history', element: <LeadHistory /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
