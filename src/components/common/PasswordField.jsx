import { useState } from 'react';

export default function PasswordField({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  forgotPasswordLink,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center ml-1">
        <label htmlFor={name} className="font-label-md text-label-md text-on-surface-variant">
          {label}
        </label>
        {forgotPasswordLink && (
          <a
            href={forgotPasswordLink}
            className="text-label-sm font-label-sm text-primary hover:underline transition-all"
          >
            Forgot Password?
          </a>
        )}
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined text-[20px]">lock</span>
        </div>
        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required
          className={`w-full bg-white/50 border rounded-xl py-3 pl-10 pr-12 font-body-md text-on-surface placeholder:text-outline/50 transition-all focus:outline-none input-focus-effect ${
            error ? 'border-error' : 'border-outline-variant'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-primary transition-colors"
          tabIndex={-1}
        >
          <span className="material-symbols-outlined text-[20px]">
            {showPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {error && (
        <p className="text-label-sm font-label-sm text-error mt-1 ml-1">{error}</p>
      )}
    </div>
  );
}
