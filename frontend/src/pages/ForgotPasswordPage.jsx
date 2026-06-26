import { useState } from 'react';
import { Link } from 'react-router-dom';
import { validateEmail } from '../validations/loginSchema';
import { api } from '../services/api';
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';
import AlertBanner from '../components/common/AlertBanner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const validation = validateEmail(email);
    if (!validation.valid) {
      setFieldError(validation.message);
      return;
    }
    setFieldError('');

    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-[448px] px-4 md:px-0 mx-auto min-h-dvh flex items-center justify-center py-6 relative">
      <div className="fixed top-[-15%] left-[-10%] w-[45%] h-[45%] bg-gradient-to-br from-[#4f46e5]/25 to-[#712ae2]/15 blur-[150px] rounded-full -z-10 animate-float" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-[#712ae2]/25 to-[#4f46e5]/15 blur-[150px] rounded-full -z-10 animate-float-slow" />

      <div className="glass-card rounded-3xl p-6 md:p-8 w-full relative overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6]" />

        <div className="text-center mb-6" style={{ animation: 'fade-in-up 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#4f46e5]/10 to-[#712ae2]/10 rounded-2xl mb-3 ring-1 ring-[#4f46e5]/10">
            <span
              className="material-symbols-outlined text-primary text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock_reset
            </span>
          </div>
          <h1 className="font-display-lg text-xl md:text-2xl tracking-tight mb-1"
            style={{ background: 'linear-gradient(135deg, #3525cd, #712ae2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            ApexCRM
          </h1>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-headline-md text-headline-md text-on-surface">Forgot Password</h2>
            <p className="font-body-md text-body-md text-on-surface-variant/70">
              Enter your registered email and we'll send you a reset link.
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate style={{ animation: 'fade-in-up 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <AlertBanner show={!!error} type="error" icon="warning">
            {error}
          </AlertBanner>

          <AlertBanner show={success} type="success" icon="check_circle" className="!bg-emerald-50 !border-emerald-200 !text-emerald-800">
            If an account with that email exists, a password reset link has been sent.
          </AlertBanner>

          <InputField
            label="Email / Username"
            name="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldError(''); }}
            placeholder="name@company.com"
            icon="alternate_email"
            error={fieldError}
            required
          />

          <Button type="submit" loading={loading} disabled={success}>
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center" style={{ animation: 'fade-in-up 0.6s 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <Link
            to="/login"
            className="font-label-sm text-label-sm text-primary hover:underline transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
