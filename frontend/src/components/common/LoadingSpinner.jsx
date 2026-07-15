export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
        progress_activity
      </span>
      <p className="font-body-md text-body-md text-on-surface-variant">
        {text}
      </p>
    </div>
  );
}
