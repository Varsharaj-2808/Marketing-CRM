import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-primary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            ApexCRM
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-label-md text-label-md text-on-surface">{user.name}</p>
            <p className="text-label-sm font-label-sm text-on-surface-variant">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-label-md font-label-md text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="glass-card rounded-3xl p-8 md:p-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Welcome, {user.name}
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Employee ID: {user.id} | Role: {user.role}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
              <h3 className="font-label-md text-label-md text-primary mb-2">Account Status</h3>
              <p className="text-body-md font-body-md text-on-surface">Active</p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="font-label-md text-label-md text-emerald-700 mb-2">Session</h3>
              <p className="text-body-md font-body-md text-on-surface">Token valid for 8 hours</p>
            </div>
          </div>

          {user.role === 'Admin' && (
            <div className="mt-6 p-6 bg-secondary/5 rounded-xl border border-secondary/10">
              <h3 className="font-label-md text-label-md text-secondary mb-2">Admin Access</h3>
              <p className="text-body-md font-body-md text-on-surface-variant">
                You have full access to User Management and System Settings.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
