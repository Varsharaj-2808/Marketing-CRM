import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import Button from '../components/common/Button';
import PasswordField from '../components/common/PasswordField';
import AlertBanner from '../components/common/AlertBanner';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!token) {
    return (
      <main className="w-full max-w-[384px] px-4 md:px-0 mx-auto min-h-dvh flex items-center justify-center py-6 relative">
        <div className="fixed top-[-15%] left-[-10%] w-[45%] h-[45%] bg-gradient-to-br from-[#4f46e5]/25 to-[#712ae2]/15 blur-[150px] rounded-full -z-10 animate-float animate-glow-pulse" />
        <div className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-[#712ae2]/25 to-[#4f46e5]/15 blur-[150px] rounded-full -z-10 animate-float-slow animate-glow-pulse" />
        <div className="glass-card rounded-3xl p-5 md:p-6 w-full relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
          <div className="text-center mb-4" style={{ animation: 'fade-in-up 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#4f46e5]/10 to-[#712ae2]/10 rounded-2xl mb-3 ring-1 ring-[#4f46e5]/10">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                link_off
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Invalid Reset Link</h2>
            <p className="font-body-md text-body-md text-on-surface-variant/70 mt-1">
              This reset link is missing or invalid. Please request a new one.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/30 text-center">
            <Link to="/forgot-password" className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors">
              Request New Reset Link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const validate = () => {
    const errors = {};
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (result.success) {
        navigate('/login', {
          state: { resetSuccess: true },
        });
      } else {
        setError(result.message || 'Failed to reset password. The link may have expired.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-[384px] px-4 md:px-0 mx-auto min-h-dvh flex items-center justify-center py-6 relative">
      <div className="fixed top-[-15%] left-[-10%] w-[45%] h-[45%] bg-gradient-to-br from-[#4f46e5]/25 to-[#712ae2]/15 blur-[150px] rounded-full -z-10 animate-float animate-glow-pulse" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-[#712ae2]/25 to-[#4f46e5]/15 blur-[150px] rounded-full -z-10 animate-float-slow animate-glow-pulse" />

      <div className="glass-card rounded-3xl p-5 md:p-6 w-full relative overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

        <div className="text-center mb-4" style={{ animation: 'fade-in-up 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#4f46e5]/10 to-[#712ae2]/10 rounded-2xl mb-3 ring-1 ring-[#4f46e5]/10 transition-all duration-500 hover:scale-110 hover:shadow-lg hover:shadow-[#4f46e5]/20 group cursor-pointer">
            <span className="material-symbols-outlined text-primary text-xl transition-all duration-500 group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock_reset
            </span>
          </div>
          <h1 className="font-display-lg text-xl md:text-2xl tracking-tight mb-1"
            style={{ background: 'linear-gradient(135deg, #3525cd, #712ae2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            ApexCRM
          </h1>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-headline-md text-headline-md text-on-surface">Reset Password</h2>
            <p className="font-body-md text-body-md text-on-surface-variant/70">
              Enter your new password below.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate style={{ animation: 'fade-in-up 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <AlertBanner show={!!error} type="error" icon="warning">
            {error}
          </AlertBanner>

          <PasswordField
            label="New Password"
            name="newPassword"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, newPassword: '' })); }}
            placeholder="Min. 8 characters"
            error={fieldErrors.newPassword}
          />

          <PasswordField
            label="Confirm Password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
            placeholder="Re-enter new password"
            error={fieldErrors.confirmPassword}
          />

          <Button type="submit" loading={loading}>
            Reset Password
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-outline-variant/30 text-center" style={{ animation: 'fade-in-up 0.6s 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <Link to="/login" className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
