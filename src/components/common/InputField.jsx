export default function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  icon,
  error,
  required,
  ...rest
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
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          {...(type === 'date' ? {
            onKeyDown: (e) => {
              if (e.key !== 'Tab') {
                e.preventDefault();
              }
            },
            onClick: (e) => {
              try {
                e.target.showPicker();
              } catch (err) {}
            }
          } : {})}
          {...rest}
          className={`w-full bg-white/50 border rounded-xl py-3 ${icon ? 'pl-10' : 'pl-4'} pr-4 font-body-md text-on-surface placeholder:text-outline/50 transition-all focus:outline-none input-focus-effect ${
            error ? 'border-error' : 'border-outline-variant'
          } ${rest.disabled ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : ''}`}
        />
      </div>
      {error && (
        <p className="text-label-sm font-label-sm text-error mt-1 ml-1">{error}</p>
      )}
    </div>
  );
}
