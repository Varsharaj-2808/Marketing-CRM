import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/users', label: 'User Management', icon: 'group' },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: 'receipt_long' },
  { path: '/admin/security', label: 'Security Policy', icon: 'security' },
  { path: '/admin/reports', label: 'Reports', icon: 'assessment' },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-white/80 backdrop-blur-xl border-r border-white/10 shadow-xl shadow-slate-900/5 flex flex-col p-6">
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
              location.pathname === item.path
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
  );
}
