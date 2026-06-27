import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { validateRegisterForm } from '../validations/registerSchema';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import PasswordField from '../components/common/PasswordField';
import AlertBanner from '../components/common/AlertBanner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [touched, setTouched] = useState({});

  function handleChange(field) {
    return (e) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) {
        const fieldErrors = validateRegisterForm({ ...formData, [field]: value });
        setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] || '' }));
      }
      if (alert) setAlert(null);
    };
  }

  function handleBlur(field) {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validateRegisterForm({ ...formData, [field]: formData[field] });
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] || '' }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validation = validateRegisterForm(formData);
    setErrors(validation);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (Object.keys(validation).length > 0) return;
    setLoading(true);
    setAlert(null);
    try {
      const result = await register(formData.name, formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setAlert({ type: 'error', message: result.message || 'Registration failed' });
      }
    } catch {
      setAlert({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  function dismissAlert() {
    setAlert(null);
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#1a1245] to-[#24243e]">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-violet-500/30 to-fuchsia-500/20 top-[-10%] left-[-10%] animate-float" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 bottom-[-10%] right-[-10%] animate-float-slow" />
      <div className="relative w-full max-w-md px-4 py-6 sm:py-10">
        <div className="glass-card animate-fade-in-up p-6 md:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/25 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-gray-400 text-sm mt-1">Register your new account</p>
          </div>

          {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={dismissAlert} />}

          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mx-auto mb-6" />

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <InputField
              label="Full Name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange('name')}
              onBlur={handleBlur('name')}
              error={errors.name}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              }
            />

            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              error={errors.email}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              }
            />

            <PasswordField
              label="Password"
              name="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              error={errors.password}
            />

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              error={errors.confirmPassword}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />

            <Button type="submit" loading={loading} disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
