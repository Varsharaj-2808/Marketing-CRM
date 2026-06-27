import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/app/leads', label: 'My Leads', icon: 'group' },
  { path: '/app/follow-ups', label: 'Follow-ups', icon: 'event_note' },
  { path: '/app/reports', label: 'Reports', icon: 'assessment' },
];

export default function SideNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  return (
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
              location.pathname === item.path
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
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="flex items-center gap-x-3 px-4 py-2 text-error hover:bg-error-container/20 rounded-xl transition-all"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-md text-label-md">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
