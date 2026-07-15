import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getProfile, changePassword } from '../../services/authService';
import Toast from '../../components/common/Toast';
import Skeleton from '../../components/common/Skeleton';
import PasswordField from '../../components/common/PasswordField';
import Pagination from '../../components/common/Pagination';

const EVENTS = [
  { event: 'Failed Login Attempt', ip: '192.168.1.105', timestamp: 'Oct 24, 2023 \u2022 14:22:01', status: 'Rejected', statusStyle: 'bg-error-container text-on-error-container' },
  { event: 'MFA Verification Success', ip: '45.22.190.12', timestamp: 'Oct 24, 2023 \u2022 14:15:33', status: 'Verified', statusStyle: 'bg-emerald-500/10 text-emerald-600' },
  { event: 'New Security Policy Applied', ip: 'Admin System', timestamp: 'Oct 24, 2023 \u2022 09:00:00', status: 'System', statusStyle: 'bg-primary/10 text-primary' },
];

export default function SecurityPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Profile API state
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Lockout policy state (classic settings)
  const [threshold, setThreshold] = useState(5);
  const [duration, setDuration] = useState(15);
  const [eventsPage, setEventsPage] = useState(1);
  const EVENTS_PAGE_SIZE = 5;

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }

    let active = true;
    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileError(null);
        const res = await getProfile();
        if (active) {
          if (res?.success && res?.data) {
            setProfile(res.data);
          } else {
            setProfileError('Failed to load profile details.');
          }
        }
      } catch (err) {
        if (active) {
          setProfileError(err?.message || 'Failed to load profile details.');
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }
    loadProfile();
    return () => { active = false; };
  }, [isAuthenticated, navigate]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const isPasswordMode = currentPassword || newPassword || confirmPassword;
    if (isPasswordMode) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setToast({ show: true, message: 'All password fields are required.', type: 'error' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setToast({ show: true, message: 'Passwords do not match.', type: 'error' });
        return;
      }

      try {
        setSaving(true);
        const res = await changePassword({ currentPassword, newPassword });
        if (res?.success) {
          setToast({
            show: true,
            message: 'Settings saved. Password changed successfully.',
            type: 'success'
          });
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setToast({
            show: true,
            message: res?.message || 'Failed to change password.',
            type: 'error'
          });
        }
      } catch (err) {
        setToast({
          show: true,
          message: err?.payload?.message || err?.message || 'Failed to change password.',
          type: 'error'
        });
      } finally {
        setSaving(false);
      }
    } else {
      // Classic lockout policy save
      setSaving(true);
      try {
        setToast({
          show: true,
          message: 'Settings saved successfully.',
          type: 'success'
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    const targetDashboard = user?.role === 'Admin' ? '/admin/dashboard' : '/marketing/dashboard';
    navigate(targetDashboard);
  };

  const [isConfirmFocused, setIsConfirmFocused] = useState(false);

  const hasLength = newPassword.length >= 8;
  const hasNumeric = /[0-9]/.test(newPassword);
  const hasAlpha = /[a-zA-Z]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

  let score = 0;
  if (newPassword) {
    if (hasLength) score++;
    if (hasNumeric) score++;
    if (hasAlpha) score++;
    if (hasSpecial) score++;
  }

  let strengthLabel = '';
  if (newPassword) {
    if (score <= 2) {
      strengthLabel = 'Weak';
    } else if (score === 3) {
      strengthLabel = 'Medium';
    } else if (score === 4) {
      strengthLabel = 'Strong';
    }
  }

  const isPasswordValid = newPassword && score === 4;

  const isPasswordMode = currentPassword || newPassword || confirmPassword;
  const isFormValid = !isPasswordMode || (
    currentPassword.trim() !== '' &&
    isPasswordValid &&
    confirmPassword.trim() !== '' &&
    newPassword === confirmPassword
  );

  const showConfirmError = confirmPassword && newPassword !== confirmPassword;
  const isAdmin = user?.role === 'Admin';

  if (!isAuthenticated || !user) return null;

  return (
    <div className="mt-4 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pb-4 border-b border-outline-variant/10">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Settings</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Security</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface text-2xl font-bold tracking-tight">Security Configuration</h1>
          <p className="font-body-md text-on-surface-variant mt-1 text-sm">
            Manage your account profile information and update your password.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!isFormValid || saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {profileError && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/10 font-body-md flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          <span>{profileError}</span>
        </div>
      )}

      {/* Account Info and Change Password Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Information Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
          
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="material-symbols-outlined text-primary text-[24px]">account_circle</span>
              <h3 className="font-headline-md text-on-surface text-lg font-bold">Account Information</h3>
            </div>

            {profileLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton width="100px" height="12px" rounded />
                    <Skeleton width="100%" height="42px" rounded />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant/80 ml-1 block mb-1">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.name || ''}
                    className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md text-on-surface/80 outline-none select-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant/80 ml-1 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={profile?.email || ''}
                    className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md text-on-surface/80 outline-none select-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant/80 ml-1 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.mobile || ''}
                    className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md text-on-surface/80 outline-none select-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant/80 ml-1 block mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.role || ''}
                    className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md text-on-surface/80 outline-none select-none cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />

          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="material-symbols-outlined text-primary text-[24px]">lock_reset</span>
              <h3 className="font-headline-md text-on-surface text-lg font-bold">Change Password</h3>
            </div>

            <div className="space-y-4">
              <PasswordField
                label="Current Password *"
                name="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />

              <PasswordField
                label="New Password *"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />

              {newPassword && !isConfirmFocused && !confirmPassword && (
                <div className="space-y-2 mt-1 mb-3 ml-1" data-testid="password-strength-indicator">
                  <div className="flex justify-between items-center text-label-sm">
                    <span className="text-on-surface-variant">Password Strength:</span>
                    <span className={
                      score <= 2 ? 'text-red-500 font-semibold' :
                      score === 3 ? 'text-yellow-600 font-semibold' :
                      'text-green-600 font-semibold'
                    }>
                      {strengthLabel}
                    </span>
                  </div>
                  
                  <div className="flex gap-1 h-1.5 w-full">
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      score >= 1 ? (score <= 2 ? 'bg-red-500' : score === 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-outline-variant/30'
                    }`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      score >= 2 ? (score <= 2 ? 'bg-red-500' : score === 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-outline-variant/30'
                    }`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      score >= 4 ? 'bg-green-500' : 'bg-outline-variant/30'
                    }`} />
                  </div>

                  {/* Requirements checklist */}
                  <ul className="text-label-sm space-y-1 mt-2 text-on-surface-variant/80">
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] leading-none shrink-0 ${hasLength ? 'text-green-600 font-bold' : 'text-outline/40'}`}>
                        {hasLength ? 'check_circle' : 'circle'}
                      </span>
                      <span>Min. 8 characters</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] leading-none shrink-0 ${hasNumeric ? 'text-green-600 font-bold' : 'text-outline/40'}`}>
                        {hasNumeric ? 'check_circle' : 'circle'}
                      </span>
                      <span>At least 1 numeric character (0-9)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] leading-none shrink-0 ${hasAlpha ? 'text-green-600 font-bold' : 'text-outline/40'}`}>
                        {hasAlpha ? 'check_circle' : 'circle'}
                      </span>
                      <span>At least 1 alphabetic character (a-z, A-Z)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] leading-none shrink-0 ${hasSpecial ? 'text-green-600 font-bold' : 'text-outline/40'}`}>
                        {hasSpecial ? 'check_circle' : 'circle'}
                      </span>
                      <span>At least 1 special character</span>
                    </li>
                  </ul>
                </div>
              )}

              <PasswordField
                label="Confirm Password *"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                error={showConfirmError ? "Passwords do not match" : null}
                onFocus={() => setIsConfirmFocused(true)}
                onBlur={() => setIsConfirmFocused(false)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Only Lockout Policy & Security Event Grid */}
      {isAdmin && (
        <div className="sr-only">
          <div className="grid grid-cols-12 gap-6">
            {/* Account Lockout Policy */}
            <div className="col-span-12 glass-card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">lock_reset</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface text-lg font-bold">Account Lockout Policy</h3>
                  <p className="font-label-sm text-on-surface-variant/70 text-xs">Prevent brute-force attacks by limiting login attempts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label htmlFor="threshold" className="font-label-md text-on-surface block font-semibold text-sm">Lockout Threshold</label>
                  <p className="text-label-sm text-on-surface-variant/60 mb-1 text-xs">Number of failed login attempts before the account is temporarily locked.</p>
                  <input
                    id="threshold"
                    type="number"
                    min="1"
                    max="10"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="duration" className="font-label-md text-on-surface block font-semibold text-sm">Lockout Duration</label>
                  <p className="text-label-sm text-on-surface-variant/60 mb-1 text-xs">Duration in minutes for which the account will remain locked after the threshold is reached.</p>
                  <div className="relative">
                    <input
                      id="duration"
                      type="number"
                      min="5"
                      step="5"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-label-md text-on-surface-variant/50 text-xs">minutes</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-outline-variant/20">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="material-symbols-outlined text-primary shrink-0">info</span>
                  <p className="text-label-sm text-on-surface-variant text-xs">Recommended: Set threshold to 5 attempts and duration to 30 minutes for a balanced security posture.</p>
                </div>
              </div>
            </div>

            {/* Multi-Factor Auth */}
            <div className="col-span-12 md:col-span-7 glass-card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-headline-md text-on-surface text-lg font-bold">Multi-Factor Auth</h4>
                  <div className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-label-sm font-bold uppercase tracking-wider text-xs">Mandatory</div>
                </div>
                <p className="font-body-md text-on-surface-variant text-sm">Enforce MFA for all administrative accounts. Currently utilizing TOTP and hardware security keys.</p>
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" className="flex-1 py-2.5 rounded-xl bg-white border border-outline-variant font-label-md hover:bg-surface-container-high transition-all text-sm">Configure MFA</button>
                <button type="button" className="flex-1 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10 font-label-md hover:bg-primary/10 transition-all text-sm">View Analytics</button>
              </div>
            </div>

            {/* Session Timeout */}
            <div className="col-span-12 md:col-span-5 glass-card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-hidden group">
              <h4 className="font-headline-md text-on-surface mb-1 text-lg font-bold">Session Timeout</h4>
              <p className="font-label-sm text-on-surface-variant mb-4 text-xs">Inactivity limit before logout.</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-display-lg text-primary font-extrabold text-3xl">15</span>
                <span className="text-headline-md text-on-surface-variant text-sm">mins</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-primary w-1/4 rounded-full"></div>
              </div>
              <div className="flex justify-between mt-1 text-label-sm text-on-surface-variant/40 text-xs">
                <span>5m</span>
                <span>60m</span>
              </div>
            </div>

            {/* Recent Security Events */}
            <div className="col-span-12 glass-card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h4 className="font-headline-md text-on-surface text-lg font-bold">Recent Security Events</h4>
                <button type="button" className="text-primary font-label-md flex items-center gap-1 hover:underline text-sm">
                  View Full Audit Log
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[600px] w-full text-left">
                  <thead>
                    <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm text-xs">
                      <th className="py-2.5 px-3 font-semibold">Event</th>
                      <th className="py-2.5 px-3 font-semibold">Source IP</th>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-md text-on-surface text-sm">
                    {EVENTS.slice((eventsPage - 1) * EVENTS_PAGE_SIZE, eventsPage * EVENTS_PAGE_SIZE).map((evt, i) => (
                      <tr key={i} className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors group relative">
                        <td className="py-3 px-3 font-semibold text-on-surface">{evt.event}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{evt.ip}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{evt.timestamp}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${evt.statusStyle} text-xs`}>{evt.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={eventsPage}
                totalPages={Math.ceil(EVENTS.length / EVENTS_PAGE_SIZE)}
                onPageChange={setEventsPage}
                totalItems={EVENTS.length}
                pageSize={EVENTS_PAGE_SIZE}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
