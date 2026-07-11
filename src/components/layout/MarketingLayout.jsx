import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
import { toDisplayText } from '../../utils/leadDisplay';
import NotificationBell from '../leads/NotificationBell';

const NAV_ITEMS = [
  { path: '/marketing/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/marketing/leads', label: 'My Leads', icon: 'group' },
  { path: '/marketing/followups', label: 'Follow-ups', icon: 'event_note' },
];

export default function MarketingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated || !user) return <Navigate to="/app/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;

  const handleLogout = () => {
    logout();
    navigate('/app/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/10 shadow-sm flex justify-between items-center px-4 sm:px-6 h-16">
        <div className="flex items-center gap-x-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" aria-label="Open menu">
            <span className="material-symbols-outlined text-on-surface-variant">menu</span>
          </button>
          <span className="font-display-lg text-headline-md tracking-tight text-primary">ApexCRM</span>
          <div className="hidden md:flex items-center bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-outline mr-1.5">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-label-md w-64 placeholder:text-outline-variant" placeholder="Search insights..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-x-2 sm:gap-x-3">
          <NotificationBell />
          <button className="p-1.5 rounded-full hover:bg-primary/5 transition-colors" aria-label="Settings">
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
          <div className="flex items-center gap-1.5">
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-label-md text-on-surface">{toDisplayText(user.name, '-')}</p>
              <p className="text-label-sm font-label-sm text-on-surface-variant">{toDisplayText(user.role, '-')}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold ml-1">
              {user.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </nav>

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
        <div className="mb-3 hidden lg:block">
          <h2 className="font-headline-md text-headline-md text-primary">Marketing Portal</h2>
          <p className="text-label-sm text-on-surface-variant opacity-70">Marketing Team</p>
        </div>
        <nav className="flex-grow flex flex-col gap-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`flex items-center gap-x-2.5 px-3 py-2 rounded-xl transition-all text-left ${
                isActive(item.path)
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:translate-x-1'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-y-1.5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-x-2.5 px-3 py-1.5 text-error hover:bg-error-container/20 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="lg:ml-56 pt-20 pb-4 px-4 sm:pt-20 sm:pb-6 sm:px-6 h-screen overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
