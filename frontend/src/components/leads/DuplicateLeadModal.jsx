import Modal from '../common/Modal';

export default function DuplicateLeadModal({
  isOpen,
  onClose,
  leadId,
  onContinue,
  onViewExisting,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate Lead Found">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0">
            warning
          </span>
          <div>
            <p className="font-label-md text-label-md text-amber-800">
              A lead with this mobile number already exists.
            </p>
            {leadId && (
              <p className="font-body-md text-body-md text-amber-700 mt-1">
                Lead ID: {leadId}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onViewExisting}
            className="flex-1 px-4 py-3 rounded-xl border border-primary/30 text-primary font-label-md text-label-md hover:bg-primary/5 transition-all duration-300"
          >
            View Existing
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 btn-gradient px-4 py-3 rounded-xl text-white font-label-md text-label-md"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-white/30 transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
