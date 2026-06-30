export default function EmptyState({
  icon = 'inbox',
  title = 'No data found',
  description = '',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
        <span
          className="material-symbols-outlined text-primary text-[32px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <h3 className="font-label-md text-label-md text-on-surface">{title}</h3>
      {description && (
        <p className="font-body-md text-body-md text-on-surface-variant/70 text-center max-w-sm">
          {description}
        </p>
      )}
      {action && action}
    </div>
  );
}
