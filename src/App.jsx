import { createBrowserRouter, Navigate, RouterProvider, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/user/DashboardPage';
import LeadList from './pages/leads/LeadList';
import CreateLead from './pages/leads/CreateLead';
import LeadDetails from './pages/leads/LeadDetails';
import LeadHistory from './pages/leads/LeadHistory';
import FollowUpsPage from './pages/marketing/FollowUpsPage';
import MarketingDashboardPage from './pages/marketing/MarketingDashboardPage';
import AdminLayout from './components/layout/AdminLayout';
import MarketingLayout from './components/layout/MarketingLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SecurityPage from './pages/admin/SecurityPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import ServicesPage from './pages/admin/ServicesPage';
import LeadSourcesPage from './pages/admin/LeadSourcesPage';
import ExportHistoryPage from './pages/admin/ExportHistoryPage';

function LeadRedirect() {
  const { leadId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const target = isAdmin ? `/admin/leads/${leadId}` : `/marketing/leads/${leadId}`;
  return <Navigate to={target} replace />;
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app/login" replace /> },

  { path: '/app/login', element: <LoginPage /> },
  { path: '/app/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/app/reset-password', element: <ResetPasswordPage /> },

  { path: '/leads/:leadId', element: <LeadRedirect /> },

  {
    path: '/marketing',
    element: <MarketingLayout />,
    children: [
      { index: true, element: <Navigate to="/marketing/dashboard" replace /> },
      { path: 'dashboard', element: <MarketingDashboardPage /> },
      { path: 'followups', element: <FollowUpsPage /> },
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
      { path: 'audit-log', element: <AuditLogPage /> },
      { path: 'audit-logs', element: <Navigate to="/admin/audit-log" replace /> },
      { path: 'system-settings/audit-retention', element: <SystemSettingsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'lead-sources', element: <LeadSourcesPage /> },
      { path: 'leads', element: <LeadList /> },
      { path: 'leads/create', element: <CreateLead /> },
      { path: 'leads/:leadId', element: <LeadDetails /> },
      { path: 'leads/:leadId/lead-history', element: <LeadHistory /> },
      { path: 'leads/export/history', element: <ExportHistoryPage /> },
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
