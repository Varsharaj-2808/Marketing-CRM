export default function Button({ children, type = 'submit', disabled, loading, onClick, className = '' }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`w-full btn-gradient py-4 rounded-xl text-white font-label-md text-label-md flex items-center justify-center gap-2 group ${className}`}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      )}
      <span>{loading ? 'Authenticating...' : children}</span>
      {!loading && (
        <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      )}
    </button>
  );
}
