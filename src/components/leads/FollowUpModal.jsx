import { useState, useEffect, useRef, useCallback } from 'react';

const FOLLOWUP_TYPES = [
  { value: 'Call', label: 'Call', icon: 'phone' },
  { value: 'WhatsApp', label: 'WhatsApp', icon: 'chat' },
  { value: 'Email', label: 'Email', icon: 'mail' },
  { value: 'Online Meeting', label: 'Online Meeting', icon: 'videocam' },
  { value: 'Client Meeting', label: 'Client Meeting', icon: 'groups' },
  { value: 'Demo', label: 'Demo', icon: 'smart_display' },
  { value: 'Proposal Discussion', label: 'Proposal Discussion', icon: 'description' },
];

const OUTCOMES = [
  { value: 'Interested', label: 'Interested' },
  { value: 'Need More Info', label: 'Need More Info' },
  { value: 'Proposal Requested', label: 'Proposal Requested' },
  { value: 'Budget Discussion', label: 'Budget Discussion' },
  { value: 'Decision Pending', label: 'Decision Pending' },
  { value: 'Not Interested', label: 'Not Interested' },
];

const MAX_NOTES_LENGTH = 1000;
const MAX_PROPOSAL_AMOUNT = 999999999.99;

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseProposalAmount(value) {
  if (!value || value.trim() === '') return { value: null, error: null };
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  if (isNaN(num)) return { value: null, error: 'Proposal amount must be a number.' };
  if (num < 0) return { value: null, error: 'Proposal amount must be a non-negative number.' };
  if (num > MAX_PROPOSAL_AMOUNT) return { value: null, error: `Proposal amount cannot exceed ${MAX_PROPOSAL_AMOUNT.toLocaleString('en-US')}.` };
  return { value: Math.round(num * 100) / 100, error: null };
}

function isClosingOutcome(outcome) {
  return outcome === 'Not Interested';
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const today = getTodayString();
  return dateStr < today;
}

export default function FollowUpModal({
  isOpen,
  onClose,
  onSubmit,
  leadStage,
  submitting,
  serverError,
  onClearServerError,
}) {
  const [followupType, setFollowupType] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [proposalAmount, setProposalAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');

  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);

  const typeInputRef = useRef(null);
  const firstFieldRef = useRef(null);
  const modalRef = useRef(null);

  const resetForm = useCallback(() => {
    setFollowupType('');
    setOutcome('');
    setNotes('');
    setNextDate('');
    setProposalAmount('');
    setDisplayAmount('');
    setErrors({});
    setDirty(false);
    setConfirmDiscard(false);
    setTypeSearch('');
    setTypeOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 50);
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (serverError) {
      setErrors(prev => ({ ...prev, server: serverError }));
    }
  }, [serverError]);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      if (dirty) {
        setConfirmDiscard(true);
      } else {
        onClose();
      }
    }
  }

  function handleEscape(e) {
    if (e.key === 'Escape' && !confirmDiscard) {
      if (dirty) {
        setConfirmDiscard(true);
      } else {
        onClose();
      }
      return;
    }
    if (e.key === 'Tab' && modalRef.current && !confirmDiscard) {
      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableElements = modalRef.current.querySelectorAll(focusableSelectors);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, dirty, confirmDiscard, followupType, outcome, notes, nextDate, proposalAmount, displayAmount]);

  useEffect(() => {
    if (isOpen) {
      const handleBeforeUnload = (e) => {
        if (dirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isOpen, dirty]);

  function validate() {
    const newErrors = {};
    if (!followupType) {
      newErrors.followupType = 'Follow-up type is required.';
    }
    if (!outcome) {
      newErrors.outcome = 'Outcome is required.';
    }
    if (!isClosingOutcome(outcome) && !nextDate) {
      newErrors.nextDate = 'Next Follow-up Date is required unless the outcome closes the lead.';
    }
    if (nextDate && isPastDate(nextDate)) {
      newErrors.nextDate = 'Next follow-up date must be today or a future date.';
    }
    if (notes.length > MAX_NOTES_LENGTH) {
      newErrors.notes = `Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`;
    }
    if (proposalAmount && proposalAmount.trim() !== '') {
      const parsed = parseProposalAmount(proposalAmount);
      if (parsed.error) {
        newErrors.proposalAmount = parsed.error;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateField(name) {
    const newErrors = { ...errors };
    switch (name) {
      case 'followupType':
        if (!followupType) newErrors.followupType = 'Follow-up type is required.';
        else delete newErrors.followupType;
        break;
      case 'outcome':
        if (!outcome) newErrors.outcome = 'Outcome is required.';
        else {
          delete newErrors.outcome;
          if (isClosingOutcome(outcome) && errors.nextDate?.includes('required')) {
            delete newErrors.nextDate;
          }
          if (!isClosingOutcome(outcome) && errors.nextDate?.includes('required')) {
            delete newErrors.nextDate;
          }
        }
        break;
      case 'nextDate':
        if (!isClosingOutcome(outcome) && !nextDate) {
          newErrors.nextDate = 'Next Follow-up Date is required unless the outcome closes the lead.';
        } else if (nextDate && isPastDate(nextDate)) {
          newErrors.nextDate = 'Next follow-up date must be today or a future date.';
        } else {
          delete newErrors.nextDate;
        }
        break;
      case 'proposalAmount':
        if (proposalAmount && proposalAmount.trim() !== '') {
          const parsed = parseProposalAmount(proposalAmount);
          if (parsed.error) newErrors.proposalAmount = parsed.error;
          else delete newErrors.proposalAmount;
        } else {
          delete newErrors.proposalAmount;
        }
        break;
      case 'notes':
        if (notes.length > MAX_NOTES_LENGTH) {
          newErrors.notes = `Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`;
        } else {
          delete newErrors.notes;
        }
        break;
    }
    setErrors(newErrors);
  }

  function handleBlur(name) {
    validateField(name);
  }

  function handleTypeSelect(value) {
    setFollowupType(value);
    setTypeOpen(false);
    setTypeSearch('');
    setDirty(true);
    onClearServerError?.();
    setTimeout(() => validateField('followupType'), 0);
  }

  function handleOutcomeChange(e) {
    const val = e.target.value;
    setOutcome(val);
    setDirty(true);
    onClearServerError?.();
    if (isClosingOutcome(val) && errors.nextDate?.includes('required')) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.nextDate;
        return copy;
      });
    }
  }

  function handleNotesChange(e) {
    const val = e.target.value;
    if (val.length <= MAX_NOTES_LENGTH) {
      setNotes(val);
    } else {
      setNotes(val.slice(0, MAX_NOTES_LENGTH));
    }
    setDirty(true);
    onClearServerError?.();
  }

  function handleDateChange(e) {
    const val = e.target.value;
    setNextDate(val);
    setDirty(true);
    onClearServerError?.();
    if (val && !isPastDate(val) && errors.nextDate?.includes('required')) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.nextDate;
        return copy;
      });
    }
  }

  function handleAmountChange(e) {
    const val = e.target.value;
    setProposalAmount(val);
    setDisplayAmount(val);
    setDirty(true);
    onClearServerError?.();
  }

  function handleAmountBlur() {
    if (proposalAmount && proposalAmount.trim() !== '') {
      const parsed = parseProposalAmount(proposalAmount);
      if (parsed.value !== null) {
        setProposalAmount(String(parsed.value));
        setDisplayAmount(formatCurrency(parsed.value));
      }
    }
    handleBlur('proposalAmount');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!navigator.onLine) {
      setErrors(prev => ({ ...prev, server: 'Offline Mode: Connection lost. Your changes will be saved locally and synced once connection is restored.' }));
      return;
    }
    if (!validate()) return;
    const parsedAmount = parseProposalAmount(proposalAmount);
    const payload = {
      followup_type: followupType,
      outcome,
      notes: notes.trim() || null,
      next_followup_date: nextDate ? `${nextDate}T10:00:00Z` : null,
      proposal_amount: parsedAmount.value,
    };
    onSubmit(payload);
  }

  function handleDiscardConfirm() {
    setConfirmDiscard(false);
    onClose();
  }

  function handleCancel() {
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }

  const filteredTypes = typeSearch
    ? FOLLOWUP_TYPES.filter(t => t.label.toLowerCase().includes(typeSearch.toLowerCase()))
    : FOLLOWUP_TYPES;

  const isNotInterested = isClosingOutcome(outcome);
  const nextDateRequired = !isNotInterested;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        ref={modalRef}
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="glass-card rounded-3xl p-6 w-full max-w-lg relative z-10 animate-fade-in-scale max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Log Follow-up"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Log Follow-up
            </h3>
            <button
              onClick={handleCancel}
              className="text-outline hover:text-on-surface transition-colors p-1"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {leadStage && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Lead Stage: <span className="font-body-md text-body-md text-on-surface">{leadStage}</span>
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="followupType" className="font-label-md text-label-md text-on-surface-variant ml-1">
                  Follow-up Type <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    ref={firstFieldRef}
                    id="followupType"
                    onClick={() => { setTypeOpen(!typeOpen); setTimeout(() => document.getElementById('typeSearchInput')?.focus(), 50); }}
                    disabled={submitting}
                    className={`w-full bg-white/50 border rounded-xl py-3 pl-4 pr-10 font-body-md text-left text-on-surface transition-all focus:outline-none input-focus-effect ${
                      errors.followupType ? 'border-error' : 'border-outline-variant'
                    } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : 'cursor-pointer'}`}
                    aria-expanded={typeOpen}
                    aria-haspopup="listbox"
                    aria-label="Follow-up Type"
                    aria-required="true"
                  >
                    {followupType ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-outline">
                          {FOLLOWUP_TYPES.find(t => t.value === followupType)?.icon || 'more_horiz'}
                        </span>
                        {followupType}
                      </span>
                    ) : (
                      <span className="text-outline/50">Select follow-up type</span>
                    )}
                  </button>
                  {typeOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-outline-variant shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-outline-variant/30">
                        <input
                          id="typeSearchInput"
                          type="text"
                          value={typeSearch}
                          onChange={(e) => setTypeSearch(e.target.value)}
                          placeholder="Search types..."
                          className="w-full px-3 py-2 bg-white/50 border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none input-focus-effect"
                        />
                      </div>
                      <ul role="listbox" className="overflow-y-auto max-h-48" aria-label="Follow-up Type">
                        {filteredTypes.map((t) => (
                          <li
                            key={t.value}
                            role="option"
                            aria-selected={followupType === t.value}
                            onClick={() => handleTypeSelect(t.value)}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors font-body-md text-body-md ${
                              followupType === t.value ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-primary/5'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px] text-outline">{t.icon}</span>
                            {t.label.split(new RegExp(`(${typeSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === typeSearch.toLowerCase() && typeSearch ? (
                                <mark key={i} className="bg-amber-200/60 px-0">{part}</mark>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                          </li>
                        ))}
                        {filteredTypes.length === 0 && (
                          <li className="px-4 py-3 text-label-sm text-outline">No matching types</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
                {errors.followupType && (
                  <p className="text-label-sm font-label-sm text-error mt-1 ml-1" role="alert">{errors.followupType}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="outcomeSelect" className="font-label-md text-label-md text-on-surface-variant ml-1">
                  Outcome <span className="text-error">*</span>
                </label>
                <select
                  id="outcomeSelect"
                  value={outcome}
                  onChange={handleOutcomeChange}
                  onBlur={() => handleBlur('outcome')}
                  disabled={submitting}
                  aria-required="true"
                  className={`w-full bg-white/50 border rounded-xl py-3 pl-4 pr-10 font-body-md text-on-surface transition-all focus:outline-none input-focus-effect appearance-none cursor-pointer ${
                    errors.outcome ? 'border-error' : 'border-outline-variant'
                  } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : ''}`}
                >
                  <option value="" className="text-outline/50">Select outcome</option>
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {isNotInterested && (
                  <p className="text-label-sm font-label-sm text-amber-700 mt-1 ml-1">
                    Note: Selecting 'Not Interested' designates a closing outcome. Next Follow-up Date will be optional.
                  </p>
                )}
                {errors.outcome && (
                  <p className="text-label-sm font-label-sm text-error mt-1 ml-1" role="alert">{errors.outcome}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="fupNotes" className="font-label-md text-label-md text-on-surface-variant ml-1">
                  Notes
                </label>
                <textarea
                  id="fupNotes"
                  value={notes}
                  onChange={handleNotesChange}
                  onBlur={() => handleBlur('notes')}
                  disabled={submitting}
                  placeholder="Enter follow-up details..."
                  maxLength={MAX_NOTES_LENGTH}
                  aria-multiline="true"
                  className={`w-full bg-white/50 border rounded-xl py-3 px-4 font-body-md text-body-md text-on-surface transition-all focus:outline-none input-focus-effect resize-none min-h-[80px] ${
                    errors.notes ? 'border-error' : 'border-outline-variant'
                  } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : ''}`}
                />
                <div className="flex justify-between items-center">
                  {errors.notes ? (
                    <p className="text-label-sm font-label-sm text-error" role="alert">{errors.notes}</p>
                  ) : <span />}
                  <span className={`text-label-sm font-label-sm ${notes.length > MAX_NOTES_LENGTH - 100 ? 'text-amber-600' : 'text-outline'}`}>
                    {notes.length}/{MAX_NOTES_LENGTH}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="fupDate" className="font-label-md text-label-md text-on-surface-variant ml-1">
                  Next Follow-up Date{nextDateRequired ? ' *' : ''}
                </label>
                <div className="relative">
                  <input
                    id="fupDate"
                    type="date"
                    value={nextDate}
                    onChange={handleDateChange}
                    onBlur={() => handleBlur('nextDate')}
                    disabled={submitting}
                    min={getTodayString()}
                    className={`w-full bg-white/50 border rounded-xl py-3 pl-4 pr-10 font-body-md text-body-md text-on-surface transition-all focus:outline-none input-focus-effect ${
                      errors.nextDate ? 'border-error' : 'border-outline-variant'
                    } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : ''}`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  </div>
                </div>
                {errors.nextDate && (
                  <p className="text-label-sm font-label-sm text-error mt-1 ml-1" role="alert">{errors.nextDate}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="fupAmount" className="font-label-md text-label-md text-on-surface-variant ml-1">
                  Proposal Amount
                </label>
                <input
                  id="fupAmount"
                  type="text"
                  inputMode="decimal"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  onBlur={handleAmountBlur}
                  disabled={submitting}
                  placeholder="0.00"
                  className={`w-full bg-white/50 border rounded-xl py-3 pl-4 pr-4 font-body-md text-body-md text-on-surface transition-all focus:outline-none input-focus-effect ${
                    errors.proposalAmount ? 'border-error' : 'border-outline-variant'
                  } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : ''}`}
                />
                {errors.proposalAmount && (
                  <p className="text-label-sm font-label-sm text-error mt-1 ml-1" role="alert">{errors.proposalAmount}</p>
                )}
              </div>

              {errors.server && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl" role="alert" aria-live="assertive">
                  <p className="text-label-sm font-label-sm text-error">{errors.server}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-label-md font-label-md text-on-surface hover:bg-white/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {confirmDiscard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDiscard(false)} />
          <div className="glass-card rounded-3xl p-6 w-full max-w-sm relative z-10 animate-fade-in-scale">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Discard Changes?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-4">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-label-md font-label-md text-on-surface hover:bg-white/50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscardConfirm}
                className="px-4 py-2 rounded-xl bg-error text-white text-label-md font-label-md hover:bg-error/90 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
