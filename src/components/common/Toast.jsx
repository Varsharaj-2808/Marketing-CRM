import { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', show, onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show, message, duration, onClose]);

  if (!visible) return null;

  const bgColor = type === 'success' ? '!bg-emerald-50 !border-emerald-200 !text-emerald-800' : '!bg-error-container !border-error/10 !text-on-error-container';

  return (
    <div className="fixed top-6 right-6 z-[60] animate-slide-up">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-xl border shadow-lg ${bgColor}`}
        role="alert"
      >
        <span className="material-symbols-outlined text-[20px] shrink-0">
          {type === 'success' ? 'check_circle' : 'warning'}
        </span>
        <p className="font-label-md text-label-md">{message}</p>
        <button onClick={() => { setVisible(false); if (onClose) setTimeout(onClose, 300); }} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
