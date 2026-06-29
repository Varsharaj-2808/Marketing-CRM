import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/users', label: 'User Management', icon: 'group' },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: 'receipt_long' },
  { path: '/admin/security', label: 'Security Policy', icon: 'security' },
  { path: '/admin/reports', label: 'Reports', icon: 'assessment' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-mesh" />
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/10 shadow-md h-16 flex justify-between items-center px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">menu</span>
          </button>
          <span className="font-display-lg text-headline-md tracking-tight text-primary">ApexCRM</span>
          <div className="hidden md:flex items-center bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-on-surface-variant mr-1.5">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-label-md w-64 text-on-surface" placeholder="Search..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-full hover:bg-primary/5 transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error rounded-full"></span>
          </button>
          <button className="p-1.5 rounded-full bg-primary/5 text-primary border border-primary/10">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1 px-2.5 py-1.5 text-label-md text-error hover:bg-error/5 rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed left-0 top-0 h-full w-56 z-40 bg-white/80 backdrop-blur-xl border-r border-white/10 shadow-xl shadow-slate-900/5 flex flex-col p-4 pt-20 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:z-40`}>
        <div className="mb-3 px-1">
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
        <div className="mt-auto flex flex-col gap-1">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white mb-3 shadow-lg shadow-primary/20">
            <p className="text-label-sm font-bold opacity-90 uppercase tracking-wider">Storage Usage</p>
            <div className="mt-1.5 h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-3/4"></div>
            </div>
            <button className="mt-3 w-full py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-label-sm font-bold transition-colors">Upgrade Plan</button>
          </div>
          <button className="flex items-center gap-2.5 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high/50 rounded-xl transition-all">
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md">Support</span>
          </button>
        </div>
      </aside>
      <main className="lg:ml-56 pt-16 p-4 sm:p-6 min-h-screen">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
