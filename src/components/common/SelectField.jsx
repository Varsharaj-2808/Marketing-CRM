export default function SelectField({
  label,
  name,
  value,
  onChange,
  error,
  required,
  disabled,
  options,
  placeholder,
  icon,
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="font-label-md text-label-md text-on-surface-variant ml-1"
      >
        {label}
        {required && ' *'}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline z-10">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full bg-white/50 border rounded-xl py-3 ${
            icon ? 'pl-10' : 'pl-4'
          } pr-10 font-body-md text-on-surface transition-all focus:outline-none input-focus-effect appearance-none cursor-pointer ${
            error ? 'border-error' : 'border-outline-variant'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : ''}`}
        >
          <option value="" className="text-outline/50">
            {placeholder || `Select ${label}`}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined text-[20px]">
            expand_more
          </span>
        </div>
      </div>
      {error && (
        <p className="text-label-sm font-label-sm text-error mt-1 ml-1">
          {error}
        </p>
      )}
    </div>
  );
}
