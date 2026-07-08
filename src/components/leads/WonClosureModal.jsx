import { useState } from 'react';
import Modal from '../common/Modal';
import InputField from '../common/InputField';

export default function WonClosureModal({ isOpen, onClose, onConfirm, loading }) {
  const [finalDealValue, setFinalDealValue] = useState('');
  const [closureDate, setClosureDate] = useState('');
  const [errors, setErrors] = useState({});

  function handleConfirm() {
    const newErrors = {};
    if (finalDealValue === '') {
      newErrors.finalDealValue = 'Final deal value is required.';
    } else if (Number(finalDealValue) < 0) {
      newErrors.finalDealValue = 'Deal value cannot be negative.';
    }
    if (!closureDate) {
      newErrors.closureDate = 'Closure date is required.';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onConfirm(Number(finalDealValue), closureDate);
  }

  function handleClose() {
    setFinalDealValue('');
    setClosureDate('');
    setErrors({});
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Close as Won">
      <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
        Enter the final deal value and expected closure date.
      </p>
      <div className="space-y-4">
        <InputField
          label="Final Deal Value"
          name="final-deal-value"
          type="number"
          value={finalDealValue}
          onChange={(e) => { setFinalDealValue(e.target.value); setErrors((prev) => ({ ...prev, finalDealValue: '' })); }}
          placeholder="Enter amount"
          error={errors.finalDealValue}
          required
        />
        <InputField
          label="Closure Date"
          name="closure-date"
          type="date"
          value={closureDate}
          onChange={(e) => { setClosureDate(e.target.value); setErrors((prev) => ({ ...prev, closureDate: '' })); }}
          error={errors.closureDate}
          required
        />
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
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white font-label-md text-label-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Closing...' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}
