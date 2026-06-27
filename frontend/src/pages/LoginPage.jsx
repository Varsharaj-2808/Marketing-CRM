import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLockoutTimer } from '../hooks/useLockoutTimer';
import { validateLoginForm } from '../validations/loginSchema';
import { DEMO_ACCOUNTS } from '../constants/demoAccounts';
import InputField from '../components/common/InputField';
import PasswordField from '../components/common/PasswordField';
import Button from '../components/common/Button';
import AlertBanner from '../components/common/AlertBanner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLockedOut, getLockoutRemainingMs, lockoutUntil, isAuthenticated } = useAuth();
  const { formatted, isActive: lockoutActive } = useLockoutTimer(lockoutUntil);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDemo, setShowDemo] = useState(false);

  const fillCredentials = useCallback((account) => {
    setEmail(account.email);
    setPassword(account.password);
    setFieldErrors({});
    setError('');
    setShowDemo(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validation = validateLoginForm({ email, password });
    if (!validation.valid) {
      if (validation.message.includes('Email')) {
        setFieldErrors({ email: validation.message });
      } else if (validation.message.includes('Password')) {
        setFieldErrors({ password: validation.message });
      }
      return;
    }
    setFieldErrors({});

    if (isLockedOut()) {
      setError('Account temporarily locked. Please try again later.');
      return;
    }

    setLoading(true);
    const result = await login(email, password, rememberMe);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else if (result.status === 429) {
      setError(result.message || 'Account temporarily locked. Please try again after 15 minutes.');
    } else if (result.status === 403) {
      setError('Account is inactive. Contact your administrator.');
    } else {
      setError(result.message || 'Invalid email or password');
    }
  };

  const lockoutRemaining = getLockoutRemainingMs();

  return (
      <main className="w-full max-w-[448px] px-4 md:px-0 mx-auto min-h-dvh flex items-center justify-center py-6 relative">
        <div className="fixed top-[-15%] left-[-10%] w-[45%] h-[45%] bg-gradient-to-br from-[#4f46e5]/25 to-[#712ae2]/15 blur-[150px] rounded-full -z-10 animate-float animate-glow-pulse" />
        <div className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-[#712ae2]/25 to-[#4f46e5]/15 blur-[150px] rounded-full -z-10 animate-float-slow animate-glow-pulse" />

        <div className="glass-card rounded-3xl p-6 md:p-8 w-full relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

          <div className="text-center mb-6" style={{ animation: 'fade-in-up 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#4f46e5]/10 to-[#712ae2]/10 rounded-2xl mb-3 ring-1 ring-[#4f46e5]/10 transition-all duration-500 hover:scale-110 hover:shadow-lg hover:shadow-[#4f46e5]/20 group cursor-pointer">
              <span
                className="material-symbols-outlined text-primary text-xl transition-all duration-500 group-hover:scale-110"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
            </div>
            <h1 className="font-display-lg text-xl md:text-2xl tracking-tight mb-1"
              style={{ background: 'linear-gradient(135deg, #3525cd, #712ae2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              ApexCRM
            </h1>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-headline-md text-headline-md text-on-surface">Welcome Back</h2>
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                Enter your credentials to continue
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate data-testid="loginForm" style={{ animation: 'fade-in-up 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <AlertBanner show={!!error} type="error" icon="warning">
              {error}
              {lockoutActive && (
                <span className="block mt-1 font-semibold">
                  Lockout remaining: {formatted}
                </span>
              )}
            </AlertBanner>

            <div className="space-y-4">
              <InputField
                label="Email / Username"
                name="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })); }}
                onBlur={() => {
                  if (!email.trim()) setFieldErrors((prev) => ({ ...prev, email: 'Email is required' }));
                }}
                placeholder="name@company.com"
                icon="alternate_email"
                error={fieldErrors.email}
                required
              />

              <PasswordField
                label="Password"
                name="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                onBlur={() => {
                  if (!password) setFieldErrors((prev) => ({ ...prev, password: 'Password is required' }));
                }}
                placeholder="••••••••"
                error={fieldErrors.password}
                forgotPasswordLink="/forgot-password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#9b97b4] text-primary focus:ring-primary/30 bg-white/70 transition-all checked:bg-primary checked:border-primary"
                />
                <span className="font-label-md text-label-md text-on-surface-variant">Remember Me</span>
              </label>
            </div>

            <Button type="submit" loading={loading} disabled={lockoutActive}>
              Sign In
            </Button>
          </form>

          <div className="mt-5" style={{ animation: 'fade-in-up 0.6s 0.28s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <button
              type="button"
              onClick={() => setShowDemo((p) => !p)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-label-sm text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-white/20 transition-all duration-300"
            >
              <span
                className={`material-symbols-outlined text-base transition-transform duration-300 ${showDemo ? 'rotate-180' : ''}`}
              >
                expand_more
              </span>
              Demo Credentials
            </button>

            {showDemo && (
              <div className="mt-3 space-y-2 animate-slide-up">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => fillCredentials(account)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/20 hover:bg-white/35 border border-white/20 hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f46e5]/10 to-[#712ae2]/10 flex items-center justify-center ring-1 ring-[#4f46e5]/10 group-hover:ring-[#4f46e5]/30 transition-all shrink-0">
                      <span
                        className="material-symbols-outlined text-primary text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {account.role === 'Admin' ? 'admin_panel_settings' : 'badge'}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-label-md text-label-md text-on-surface truncate">{account.role}</p>
                      <p className="font-body-md text-body-md text-on-surface-variant/60 truncate">{account.email}</p>
                    </div>
                    <span className="text-label-sm text-primary/60 group-hover:text-primary font-medium transition-colors shrink-0">
                      Use
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center" style={{ animation: 'fade-in-up 0.6s 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <p className="font-body-md text-label-sm text-on-surface-variant/50 mb-3">
              Protected by Enterprise-grade AES-256 Encryption
            </p>
            <Link to="/forgot-password" className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors">
              Forgot Password?
            </Link>
            <span className="mx-2 text-on-surface-variant/30">·</span>
            <Link to="/register" className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors">
              Create Account
            </Link>
          </div>
        </div>

        <div className="fixed bottom-4 flex items-center justify-center gap-2 opacity-50">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-label-sm font-label-sm text-on-surface-variant">Global Systems Operational</span>
        </div>
      </main>
  );
}
