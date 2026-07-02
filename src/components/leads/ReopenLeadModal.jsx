import { useState } from 'react';
import Modal from '../common/Modal';
import InputField from '../common/InputField';

export default function ReopenLeadModal({ isOpen, onClose, onConfirm, loading, closedStage }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    const trimmed = (reason || '').trim();
    if (!trimmed) {
      setError('Reopen reason is required.');
      return;
    }
    onConfirm(trimmed);
  }

  function handleClose() {
    setReason('');
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reopen Lead">
      <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
        This lead is currently {closedStage || 'closed'}. Provide a reason for reopening.
      </p>
      <div className="space-y-4">
        <label className="font-label-md text-label-md text-on-surface-variant block">
          Reopen Reason *
        </label>
        <textarea
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(''); }}
          placeholder="Explain why this lead is being reopened"
          rows={4}
          maxLength={500}
          className="w-full rounded-xl border border-outline-variant bg-white/50 px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
          aria-label="Reopen reason"
        />
        {error && (
          <p className="font-label-sm text-label-sm text-error">{error}</p>
        )}
        <p className="text-label-sm text-label-sm text-on-surface-variant/60">
          Provide a reason for reopening this lead.
        </p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-white/80 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="rounded-xl bg-primary px-4 py-2.5 text-white font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Reopening...' : 'Confirm Reopen'}
        </button>
      </div>
    </Modal>
  );
}
