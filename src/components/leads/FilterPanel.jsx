const FILTER_OPTIONS = {
  status: ['New', 'Open', 'Contacted', 'Qualified', 'Converted', 'Lost'],
  stage: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed'],
  source: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Event'],
  category: ['IT Services', 'Digital Marketing', 'Consulting', 'Real Estate', 'Healthcare'],
  priority: ['High', 'Medium', 'Low', 'Hot', 'Warm', 'Cold'],
};

function SelectFilter({ id, label, value, options, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-label-sm font-label-sm text-on-surface-variant">
      {label}
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-outline-variant bg-white/70 px-3 text-body-sm text-on-surface focus:outline-none input-focus-effect"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function FilterPanel({ filters, isAdmin, onChange, onClear }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant/40 bg-white/35 p-3 sm:grid-cols-2 xl:grid-cols-4">
      <SelectFilter id="status-filter" label="Status" value={filters.status} options={FILTER_OPTIONS.status} onChange={(value) => update('status', value)} />
      <SelectFilter id="stage-filter" label="Stage" value={filters.stage} options={FILTER_OPTIONS.stage} onChange={(value) => update('stage', value)} />
      <SelectFilter id="source-filter" label="Source" value={filters.source} options={FILTER_OPTIONS.source} onChange={(value) => update('source', value)} />
      <SelectFilter id="category-filter" label="Category" value={filters.category} options={FILTER_OPTIONS.category} onChange={(value) => update('category', value)} />
      <SelectFilter id="priority-filter" label="Priority" value={filters.priority} options={FILTER_OPTIONS.priority} onChange={(value) => update('priority', value)} />
      {isAdmin && (
        <label className="flex min-w-0 flex-col gap-1 text-label-sm font-label-sm text-on-surface-variant">
          Assigned To
          <input
            aria-label="Assigned To"
            value={filters.assignedTo}
            onChange={(event) => update('assignedTo', event.target.value)}
            placeholder="Name or employee ID"
            className="h-10 rounded-lg border border-outline-variant bg-white/70 px-3 text-body-sm text-on-surface placeholder:text-outline focus:outline-none input-focus-effect"
          />
        </label>
      )}
      <label className="flex min-w-0 flex-col gap-1 text-label-sm font-label-sm text-on-surface-variant">
        From Date
        <input
          aria-label="From Date"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => update('dateFrom', event.target.value)}
          className="h-10 rounded-lg border border-outline-variant bg-white/70 px-3 text-body-sm text-on-surface focus:outline-none input-focus-effect"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-label-sm font-label-sm text-on-surface-variant">
        To Date
        <input
          aria-label="To Date"
          type="date"
          value={filters.dateTo}
          onChange={(event) => update('dateTo', event.target.value)}
          min={filters.dateFrom || undefined}
          className="h-10 rounded-lg border border-outline-variant bg-white/70 px-3 text-body-sm text-on-surface focus:outline-none input-focus-effect"
        />
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={onClear}
          className="h-10 w-full rounded-lg bg-primary px-3 text-label-md font-label-md text-white transition-colors hover:bg-primary/90"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
