import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toDisplayText } from '../../utils/leadDisplay';
import Skeleton from '../../components/common/Skeleton';
import SkeletonCard from '../../components/common/SkeletonCard';

const STATS = [
  {
    icon: 'groups',
    label: 'Total Users',
    value: '14,284',
    change: '+12.5%',
    barWidth: '75%',
    iconBg: 'bg-primary-container text-on-primary-container',
    border: '',
  },
  {
    icon: 'person_check',
    label: 'Active Users',
    value: '12,102',
    change: 'Active Now',
    barWidth: '',
    iconBg: 'bg-emerald-100 text-emerald-600',
    border: 'border-l-4 border-l-emerald-500',
    extra: '85% retention rate',
  },
  {
    icon: 'person_off',
    label: 'Inactive Users',
    value: '2,182',
    change: 'Stable',
    barWidth: '15%',
    iconBg: 'bg-secondary-container text-on-secondary-container',
    border: '',
  },
];

const SHORTCUTS = [
  {
    icon: 'category',
    title: 'Categories',
    desc: 'Manage business categories',
    path: '/admin/categories',
    hoverBg: 'hover:bg-primary',
  },
  {
    icon: 'handyman',
    title: 'Services',
    desc: 'Manage service offerings',
    path: '/admin/services',
    hoverBg: 'hover:bg-secondary',
  },
  {
    icon: 'source',
    title: 'Lead Sources',
    desc: 'Manage lead source channels',
    path: '/admin/lead-sources',
    hoverBg: 'hover:bg-on-tertiary-fixed-variant',
  },
  {
    icon: 'manage_accounts',
    title: 'User Management',
    desc: 'Configure permissions',
    path: '/admin/users',
    hoverBg: 'hover:bg-primary',
  },
  {
    icon: 'history_edu',
    title: 'Audit Logs',
    desc: 'Track core changes',
    path: '/admin/audit-logs',
    hoverBg: 'hover:bg-secondary',
  },
  {
    icon: 'settings_applications',
    title: 'System Settings',
    desc: 'Global configurations',
    path: '/admin/security',
    hoverBg: 'hover:bg-on-tertiary-fixed-variant',
  },
];

const NOTIFICATIONS = [
  {
    icon: 'warning',
    iconBg: 'bg-error-container text-error',
    title: 'Permission Elevation',
    time: '2m ago',
    desc: 'User j.doe_dev requested Admin privileges for project \'Zenith\'.',
    actions: true,
  },
  {
    icon: 'sync_lock',
    iconBg: 'bg-primary-container text-on-primary-container',
    title: 'Policy Updated',
    time: '45m ago',
    desc: 'System-wide 2FA requirement was successfully enforced for Tier 3 employees.',
    actions: false,
  },
  {
    icon: 'visibility',
    iconBg: 'bg-tertiary-container text-on-tertiary-container',
    title: 'New Audit Log',
    time: '2h ago',
    desc: 'Bulk data export detected from IP: 192.168.1.104. Source: Marketing Team.',
    actions: false,
  },
];

const CHART_BARS = [45, 60, 40, 80, 55, 70, 90, 65, 50, 30, 75, 55];

function AdminDashboardSkeleton() {
  return (
    <div className="mt-4">
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <Skeleton width="240px" height="26px" rounded className="mb-2" />
          <Skeleton width="360px" height="16px" rounded />
        </div>
        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl">
          <Skeleton circle width="36px" height="36px" />
          <div>
            <Skeleton width="80px" height="10px" rounded className="mb-1" />
            <Skeleton width="100px" height="14px" rounded />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} lines={i === 1 ? 3 : 2} hasBar={i !== 2} />
        ))}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <Skeleton width="160px" height="20px" rounded />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 rounded-[1.5rem] flex flex-col items-center">
                <Skeleton circle width="48px" height="48px" className="mb-3" />
                <Skeleton width="80px" height="14px" rounded className="mb-1" />
                <Skeleton width="60px" height="10px" rounded />
              </div>
            ))}
          </div>
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-5">
              <Skeleton width="140px" height="20px" rounded />
              <div className="flex gap-2">
                <Skeleton width="60px" height="20px" rounded />
                <Skeleton width="50px" height="20px" rounded />
              </div>
            </div>
            <div className="flex items-end gap-2 h-28 w-full">
              {CHART_BARS.map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-lg" height={`${CHART_BARS[i]}%`} />
              ))}
            </div>
          </div>
        </section>
        <section className="space-y-6">
          <Skeleton width="110px" height="20px" rounded />
          <div className="glass-card flex flex-col lg:h-[400px]">
            <div className="p-5 border-b border-outline-variant/10 flex justify-between">
              <Skeleton width="80px" height="14px" rounded />
              <Skeleton width="16px" height="16px" />
            </div>
            <div className="flex-1 p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-2xl" style={{ background: 'var(--surface-container-low, #f2f4f6)' }}>
                  <Skeleton circle width="32px" height="32px" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <Skeleton width="100px" height="12px" rounded />
                      <Skeleton width="30px" height="8px" rounded />
                    </div>
                    <Skeleton width="100%" height="10px" rounded />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 text-center border-t border-outline-variant/10">
              <Skeleton width="90px" height="14px" rounded className="mx-auto" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;
  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="mt-4">
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">Welcome back, {toDisplayText(user.name, 'Admin')}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Here is an overview of the security state and user activities across the enterprise.</p>
        </div>
        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">System Status</p>
            <p className="font-label-md text-label-md text-on-surface">All protocols active</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={`glass-card p-5 relative overflow-hidden group ${stat.border}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2.5 rounded-xl shadow-sm ${stat.iconBg}`}>
                <span className="material-symbols-outlined text-xl">{stat.icon}</span>
              </div>
              <span className="text-primary font-label-md">{stat.change}</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md uppercase tracking-wider mb-1">{stat.label}</h3>
            <p className="text-display-lg font-display-lg text-on-surface">{stat.value}</p>
            {stat.barWidth && (
              <div className="mt-3 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: stat.barWidth }}></div>
              </div>
            )}
            {stat.extra && (
              <p className="mt-2 text-label-sm font-label-sm text-on-surface-variant">{stat.extra}</p>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <h2 className="font-headline-md text-headline-md text-primary">Navigation Shortcuts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SHORTCUTS.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.path)}
                className={`glass-card p-6 rounded-[1.5rem] flex flex-col items-center text-center group ${item.hoverBg} hover:text-white transition-all duration-300 active:scale-95`}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed-dim text-primary flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <span className="font-label-md text-label-md block">{item.title}</span>
                <span className="text-xs opacity-60 mt-1 block">{item.desc}</span>
              </button>
            ))}
          </div>

          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #3525cd 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-headline-md text-headline-md text-on-surface">Security Traffic Analyser</h3>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-label-sm font-label-sm rounded-full">Real-time</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-label-sm font-label-sm rounded-full">Secure</span>
                </div>
              </div>
              <div className="flex items-end gap-2 h-28 w-full">
                {CHART_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="bg-primary/20 hover:bg-primary transition-colors flex-1 rounded-t-lg"
                    style={{ height: `${h}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-headline-md text-headline-md text-primary">Recent Activity</h2>
          <div className="glass-card flex flex-col lg:h-[400px]">
            <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface">Notifications</span>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">filter_list</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} className="p-3 rounded-2xl border border-white/50 hover:border-primary/20 transition-all flex gap-3" style={{ background: 'var(--surface-container-low, #f2f4f6)' }}>
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${n.iconBg}`}>
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="font-label-md text-label-md text-on-surface">{n.title}</p>
                      <span className="text-[10px] text-on-surface-variant opacity-60 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{n.desc}</p>
                    {n.actions && (
                      <div className="mt-2 flex gap-2">
                        <button className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all">Approve</button>
                        <button className="px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-bold rounded-lg hover:bg-surface-variant transition-all">Deny</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 text-center border-t border-outline-variant/10">
              <button className="text-primary font-label-md hover:underline transition-all">View all history</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
