export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-error">warning</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
          <p className="text-body-md text-on-surface-variant">{message}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-error text-white font-label-md shadow-lg shadow-error/20 hover:shadow-error/40 active:scale-95 transition-all">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
