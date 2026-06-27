import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

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
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/10 shadow-md h-20 flex justify-between items-center px-10">
        <div className="flex items-center gap-6">
          <span className="font-display-lg text-headline-md tracking-tight text-primary">ApexCRM</span>
          <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-label-md w-64 text-on-surface" placeholder="Search..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-primary/5 transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button className="p-2 rounded-full bg-primary/5 text-primary border border-primary/10">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 text-label-md text-error hover:bg-error/5 rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </header>
      <aside className="fixed left-0 top-0 h-full w-64 z-40 bg-white/80 backdrop-blur-xl border-r border-white/10 shadow-xl shadow-slate-900/5 flex flex-col p-6 pt-24">
        <div className="mb-4 px-2">
          <h2 className="font-headline-md text-primary">Admin Portal</h2>
          <p className="font-label-sm text-on-surface-variant opacity-70">Enterprise Tier</p>
        </div>
        <nav className="flex flex-col gap-1 flex-grow">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white mb-4 shadow-lg shadow-primary/20">
            <p className="text-label-sm font-bold opacity-90 uppercase tracking-wider">Storage Usage</p>
            <div className="mt-2 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-3/4"></div>
            </div>
            <button className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-label-sm font-bold transition-colors">Upgrade Plan</button>
          </div>
          <button className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high/50 rounded-xl transition-all">
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md">Support</span>
          </button>
        </div>
      </aside>
      <main className="ml-64 pt-20 p-10 min-h-screen">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
