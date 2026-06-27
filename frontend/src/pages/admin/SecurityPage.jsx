import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const EVENTS = [
  { event: 'Failed Login Attempt', ip: '192.168.1.105', timestamp: 'Oct 24, 2023 \u2022 14:22:01', status: 'Rejected', statusStyle: 'bg-error-container text-on-error-container' },
  { event: 'MFA Verification Success', ip: '45.22.190.12', timestamp: 'Oct 24, 2023 \u2022 14:15:33', status: 'Verified', statusStyle: 'bg-emerald-500/10 text-emerald-600' },
  { event: 'New Security Policy Applied', ip: 'Admin System', timestamp: 'Oct 24, 2023 \u2022 09:00:00', status: 'System', statusStyle: 'bg-primary/10 text-primary' },
];

export default function SecurityPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [threshold, setThreshold] = useState(5);
  const [duration, setDuration] = useState(15);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <div className="flex items-end justify-between mb-12">
        <div>
          <nav className="flex items-center gap-2 text-label-sm text-on-surface-variant/60 mb-2">
            <span>Settings</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary font-bold">Security</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">Security Configuration</h1>
          <p className="font-body-md text-on-surface-variant mt-2">Manage global access controls and account protection policies for your enterprise instance.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/admin/dashboard')} className="px-6 py-2.5 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all">Save Changes</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 glass-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-3xl">lock_reset</span>
            </div>
            <div>
              <h3 className="font-headline-md text-on-surface">Account Lockout Policy</h3>
              <p className="font-label-sm text-on-surface-variant/70">Prevent brute-force attacks by limiting login attempts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label htmlFor="threshold" className="font-label-md text-on-surface block px-1">Lockout Threshold</label>
              <p className="text-label-sm text-on-surface-variant/60 mb-2 px-1">Number of failed login attempts before the account is temporarily locked.</p>
              <input
                id="threshold"
                type="number"
                min="1"
                max="10"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <div className="space-y-4">
              <label htmlFor="duration" className="font-label-md text-on-surface block px-1">Lockout Duration</label>
              <p className="text-label-sm text-on-surface-variant/60 mb-2 px-1">Duration in minutes for which the account will remain locked after the threshold is reached.</p>
              <div className="relative">
                <input
                  id="duration"
                  type="number"
                  min="5"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-label-md text-on-surface-variant/50">minutes</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <span className="material-symbols-outlined text-primary shrink-0">info</span>
              <p className="text-label-sm text-on-surface-variant">Recommended: Set threshold to 5 attempts and duration to 30 minutes for a balanced security posture.</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-7 glass-card p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-headline-md text-on-surface">Multi-Factor Auth</h4>
              <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-label-sm font-bold uppercase tracking-wider">Mandatory</div>
            </div>
            <p className="font-body-md text-on-surface-variant">Enforce MFA for all administrative accounts. Currently utilizing TOTP and hardware security keys.</p>
          </div>
          <div className="mt-8 flex gap-3">
            <button className="flex-1 py-3 rounded-xl bg-white border border-outline-variant font-label-md hover:bg-surface-container-high transition-all">Configure MFA</button>
            <button className="flex-1 py-3 rounded-xl bg-primary/5 text-primary border border-primary/10 font-label-md hover:bg-primary/10 transition-all">View Analytics</button>
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 glass-card p-8 relative overflow-hidden group">
          <h4 className="font-headline-md text-on-surface mb-2">Session Timeout</h4>
          <p className="font-label-sm text-on-surface-variant mb-6">Inactivity limit before logout.</p>
          <div className="flex items-center justify-between mb-6">
            <span className="text-display-lg text-primary font-extrabold">15</span>
            <span className="text-headline-md text-on-surface-variant">mins</span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-primary w-1/4 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-label-sm text-on-surface-variant/40">
            <span>5m</span>
            <span>60m</span>
          </div>
        </div>

        <div className="col-span-12 glass-card p-8">
          <div className="flex justify-between items-center mb-8">
            <h4 className="font-headline-md text-on-surface">Recent Security Events</h4>
            <button className="text-primary font-label-md flex items-center gap-1 hover:underline">
              View Full Audit Log
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-label-md text-on-surface-variant/50 uppercase tracking-widest border-b border-outline-variant/10">
                  <th className="pb-4 font-normal">Event</th>
                  <th className="pb-4 font-normal">Source IP</th>
                  <th className="pb-4 font-normal">Timestamp</th>
                  <th className="pb-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface">
                {EVENTS.map((evt, i) => (
                  <tr key={i} className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors group">
                    <td className="py-4 font-bold">{evt.event}</td>
                    <td className="py-4 opacity-70">{evt.ip}</td>
                    <td className="py-4 opacity-70">{evt.timestamp}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold ${evt.statusStyle}`}>{evt.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl px-8 py-4 rounded-2xl shadow-2xl border border-primary/20 flex items-center gap-4 z-[100]" style={{ animation: 'slide-up 0.3s ease' }}>
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface">Settings Saved Successfully</p>
            <p className="text-label-sm text-on-surface-variant">Security policies have been updated globally.</p>
          </div>
        </div>
      )}
    </>
  );
}
