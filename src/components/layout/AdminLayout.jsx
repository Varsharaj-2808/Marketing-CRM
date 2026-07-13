import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
import NotificationBell from '../leads/NotificationBell';
import GlobalSearch from '../common/GlobalSearch';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/leads', label: 'Leads', icon: 'leaderboard' },
  { path: '/admin/users', label: 'User Management', icon: 'group' },
  { path: '/admin/categories', label: 'Categories', icon: 'category' },
  { path: '/admin/services', label: 'Services', icon: 'handyman' },
  { path: '/admin/lead-sources', label: 'Lead Sources', icon: 'source' },
  { path: '/admin/audit-log', label: 'Audit Log', icon: 'receipt_long' },
  { path: '/admin/system-settings/audit-retention', label: 'System Settings', icon: 'settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated || !user) return <Navigate to="/app/login" replace />;
  if (user.role !== 'Admin') return <Navigate to="/marketing/dashboard" replace />;

  const handleLogout = () => {
    logout();
    navigate('/app/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-mesh" />
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/10 shadow-md h-16 flex justify-between items-center px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" aria-label="Open menu">
            <span className="material-symbols-outlined text-on-surface-variant">menu</span>
          </button>
          <span className="font-display-lg text-headline-md tracking-tight text-primary">ApexCRM</span>
          <div className="hidden md:block">
            <GlobalSearch variant="admin" />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          <button className="p-1.5 rounded-full bg-primary/5 text-primary border border-primary/10" aria-label="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-label-md text-error hover:bg-error/5 rounded-xl transition-colors" aria-label="Sign out">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed left-0 top-0 h-full w-64 sm:w-56 z-40 bg-white/80 backdrop-blur-xl border-r border-white/10 shadow-xl shadow-slate-900/5 flex flex-col p-4 pt-20 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:z-40`}>
        {/* Mobile close button */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <span className="font-headline-md text-primary">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="mb-3 px-1 hidden lg:block">
          <h2 className="font-headline-md text-primary">Admin Portal</h2>
          <p className="font-label-sm text-on-surface-variant opacity-70">Enterprise Tier</p>
        </div>
        <nav className="flex flex-col gap-0.5 flex-grow">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
                isActive(item.path)
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:translate-x-1'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="lg:ml-56 pt-20 pb-4 px-4 sm:pt-20 sm:pb-6 sm:px-6 h-screen overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
