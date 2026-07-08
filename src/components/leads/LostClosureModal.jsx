import { useState } from 'react';
import Modal from '../common/Modal';
import SelectField from '../common/SelectField';

const LOST_REASONS = [
  'Budget',
  'Competitor',
  'No Response',
  'Cancelled',
  'Other',
];

export default function LostClosureModal({ isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!reason) {
      setError('Please select a lost reason.');
      return;
    }
    onConfirm(reason);
  }

  function handleClose() {
    setReason('');
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Close as Lost">
      <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
        Select a reason for closing this lead as lost.
      </p>
      <SelectField
        label="Lost Reason"
        name="lost-reason"
        value={reason}
        onChange={(e) => { setReason(e.target.value); setError(''); }}
        options={LOST_REASONS.map((value) => ({ value, label: value }))}
        placeholder="Select reason"
        error={error}
      />
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
          className="rounded-xl bg-error px-4 py-2.5 text-white font-label-md text-label-md hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Closing...' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}
