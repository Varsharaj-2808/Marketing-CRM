import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { path: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/app/leads', label: 'My Leads', icon: 'group' },
  { path: '/app/follow-ups', label: 'Follow-ups', icon: 'event_note' },
  { path: '/app/reports', label: 'Reports', icon: 'assessment' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

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
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/10 shadow-sm flex justify-between items-center px-10 h-20">
        <div className="flex items-center gap-x-8">
          <span className="font-display-lg text-headline-md tracking-tight text-primary">ApexCRM</span>
          <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-outline mr-2">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-label-md w-64 placeholder:text-outline-variant" placeholder="Search insights..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-x-4">
          <button className="p-2 rounded-full hover:bg-primary/5 transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button className="p-2 rounded-full hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-label-md text-label-md text-on-surface">{user.name}</p>
              <p className="text-label-sm font-label-sm text-on-surface-variant">{user.role}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold ml-2">
              {user.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </nav>
      <aside className="fixed left-0 top-0 h-full w-64 z-40 bg-white/80 backdrop-blur-xl border-r border-white/10 shadow-xl shadow-slate-900/5 flex flex-col p-6 pt-24">
        <div className="mb-4">
          <h2 className="font-headline-md text-headline-md text-primary">User Portal</h2>
          <p className="text-label-sm text-on-surface-variant opacity-70">Marketing Team</p>
        </div>
        <nav className="flex-grow flex flex-col gap-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-x-3 px-4 py-3 rounded-xl transition-all text-left ${
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
        <div className="mt-auto flex flex-col gap-y-2">
          <div className="h-px bg-outline-variant/20 my-2"></div>
          <button className="flex items-center gap-x-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high/50 rounded-xl transition-all">
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md text-label-md">Support</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-x-3 px-4 py-2 text-error hover:bg-error-container/20 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="pl-64 pt-20">
        <div className="p-10 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
