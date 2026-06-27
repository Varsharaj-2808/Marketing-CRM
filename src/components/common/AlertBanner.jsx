export default function AlertBanner({ show, type = 'error', icon = 'warning', children, className = '' }) {
  if (!show) return null;

  const bgColor = type === 'error' ? 'bg-error-container' : type === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
  const borderColor = type === 'error' ? 'border-error/10' : type === 'warning' ? 'border-amber-200' : 'border-blue-200';
  const textColor = type === 'error' ? 'text-on-error-container' : type === 'warning' ? 'text-amber-800' : 'text-blue-800';

  return (
    <div
      className={`flex items-start gap-3 p-4 ${bgColor} rounded-xl border ${borderColor} ${textColor} animate-shake ${className}`}
      role="alert"
    >
      <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
      <div className="text-label-sm font-label-sm">{children}</div>
    </div>
  );
}
