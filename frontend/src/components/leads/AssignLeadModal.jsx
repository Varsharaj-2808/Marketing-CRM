import { useState, useEffect } from 'react';
import { fetchUsers } from '../../services/leadService';
import Modal from '../common/Modal';

export default function AssignLeadModal({ isOpen, onClose, lead, onAssign, assigning }) {
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  const hasOwner = !!(lead?.assignedTo ?? lead?.assigned_to);

  useEffect(() => {
    if (isOpen) {
      setAssignedTo('');
      setReason('');
      setErrors({});
      setLoadingUsers(true);
      fetchUsers()
        .then((res) => {
          const data = res?.data || res?.users || [];
          const marketingExecs = Array.isArray(data)
            ? data.filter((u) => u.role === 'Marketing Executive')
            : [];
          setUsers(marketingExecs);
        })
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen]);

  function validate() {
    const newErrors = {};
    if (!assignedTo) {
      newErrors.assignedTo = 'Please select a Marketing Executive.';
    }
    if (hasOwner) {
      const trimmed = (reason || '').trim();
      if (!trimmed) {
        newErrors.reason = 'Reassignment reason is required.';
      } else if (trimmed.length > 500) {
        newErrors.reason = 'Reason must not exceed 500 characters.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleConfirm() {
    if (!validate() || assigning) return;
    const selectedUser = users.find((u) => (u.employee_id || u.id) === assignedTo);
    const userName = selectedUser?.name || assignedTo;
    onAssign(assignedTo, reason?.trim() || '', userName);
  }

  function handleClose() {
    if (!assigning) onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={hasOwner ? 'Reassign Lead' : 'Assign Lead'}>
      <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
        {hasOwner
          ? 'This lead is already assigned. Provide a reason for the reassignment.'
          : 'Select a Marketing Executive to assign this lead to.'}
      </p>

      {loadingUsers ? (
        <div className="flex items-center justify-center py-4">
          <span className="material-symbols-outlined animate-spin text-primary text-[24px]">progress_activity</span>
          <span className="ml-2 font-body-md text-body-md text-on-surface-variant">Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="py-6 text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30 mb-2">person_off</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No active Marketing Executives available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
              Marketing Executive *
            </label>
            <select
              value={assignedTo}
              onChange={(e) => { setAssignedTo(e.target.value); if (errors.assignedTo) setErrors((prev) => ({ ...prev, assignedTo: '' })); }}
              className="w-full rounded-xl border border-outline-variant bg-white/50 px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
              aria-label="Marketing Executive"
            >
              <option value="">-- Select Marketing Executive --</option>
              {users.map((u) => (
                <option key={u.employee_id || u.id} value={u.employee_id || u.id}>
                  {u.name} ({u.employee_id || u.id})
                </option>
              ))}
            </select>
            {errors.assignedTo && (
              <p className="mt-1 font-label-sm text-label-sm text-error">{errors.assignedTo}</p>
            )}
          </div>

          {hasOwner && (
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                Reassignment Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); if (errors.reason) setErrors((prev) => ({ ...prev, reason: '' })); }}
                placeholder="Explain why this lead is being reassigned..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-outline-variant bg-white/50 px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                aria-label="Reassignment reason"
              />
              <div className="flex items-center justify-between mt-1">
                {errors.reason ? (
                  <p className="font-label-sm text-label-sm text-error">{errors.reason}</p>
                ) : <span />}
                <p className="font-label-sm text-label-sm text-on-surface-variant/60">
                  {reason.length}/500
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          disabled={assigning}
          className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-white/80 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!assignedTo || assigning || loadingUsers}
          className="rounded-xl bg-primary px-4 py-2.5 font-label-md text-label-md text-white transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          aria-label={assigning ? 'Assigning...' : hasOwner ? 'Reassign' : 'Assign'}
        >
          {assigning && (
            <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
          )}
          {assigning ? 'Assigning...' : hasOwner ? 'Reassign' : 'Assign'}
        </button>
      </div>
    </Modal>
  );
}
