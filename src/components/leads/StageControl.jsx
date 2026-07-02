import SelectField from '../common/SelectField';

const STAGE_TRANSITIONS = {
  New: ['Contacted', 'Hold', 'Lost'],
  Contacted: ['Meeting Scheduled', 'Hold', 'Lost'],
  'Meeting Scheduled': ['Requirement Gathering', 'Hold', 'Lost'],
  'Requirement Gathering': ['Proposal Sent', 'Hold', 'Lost'],
  'Proposal Sent': ['Negotiation', 'Hold', 'Lost'],
  Negotiation: ['Hold', 'Lost'],
  Hold: ['Contacted', 'Lost'],
};

const CLOSED_STATUSES = ['Won', 'Lost'];

export default function StageControl({
  currentStage,
  currentStatus,
  isAdmin,
  onStageChange,
  onCloseAsWon,
  onOpenReopen,
  disabled,
  loading,
}) {
  const nextStages = STAGE_TRANSITIONS[currentStage] || ['Hold', 'Lost'];
  const isClosed = CLOSED_STATUSES.includes(currentStatus) || currentStage === 'Closed';

  const options = [
    { value: currentStage || 'Unknown', label: `${currentStage || 'Unknown'} (current)`, disabled: true },
    ...nextStages.map((stage) => ({ value: stage, label: stage })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <SelectField
            label="Stage"
            name="lead-stage"
            value={currentStage || 'Unknown'}
            onChange={onStageChange}
            disabled={disabled || isClosed}
            options={options}
            placeholder="Select Stage"
          />
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {currentStage === 'Negotiation' && !isClosed && (
            <button
              type="button"
              onClick={onCloseAsWon}
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white font-label-sm text-label-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Close as Won
            </button>
          )}
          {isClosed && isAdmin && (
            <button
              type="button"
              onClick={onOpenReopen}
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-2.5 text-white font-label-sm text-label-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Reopen Lead
            </button>
          )}
        </div>
      </div>

      {isClosed && (
        <p className="text-label-sm text-label-sm text-on-surface-variant">
          {isAdmin
            ? 'This lead is closed. Use the button above to unlock stage updates.'
            : 'This lead is closed. Contact Admin to reopen.'}
        </p>
      )}
    </div>
  );
}
