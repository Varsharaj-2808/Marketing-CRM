import { useState } from 'react';
import Modal from '../common/Modal';

export default function DeleteLeadModal({ isOpen, onClose, onConfirm, leadId, leadDisplayId, deleting }) {
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      const msg = err?.message || err?.payload?.message || 'Failed to delete lead';
      setError(msg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Lead">
      <div className="space-y-4">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Are you sure you want to delete lead <strong className="text-on-surface">{leadDisplayId || leadId}</strong>? This action will soft-delete the lead.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="font-label-sm text-label-sm text-error">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error text-white font-label-md text-label-md hover:bg-error/90 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Deleting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Lead
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
