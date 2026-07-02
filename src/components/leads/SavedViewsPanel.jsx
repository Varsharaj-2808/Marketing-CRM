const DEFAULT_SAVED_VIEWS = [
  {
    id: 'my-hot-leads',
    name: 'My Hot Leads',
    filters: { priority: 'High' },
    sort: { sortBy: 'createdAt', sortOrder: 'desc' },
    search: '',
  },
  {
    id: 'pending-follow-up-today',
    name: 'Pending Follow-up Today',
    filters: { stage: 'Contacted' },
    sort: { sortBy: 'createdAt', sortOrder: 'desc' },
    search: '',
  },
];

export { DEFAULT_SAVED_VIEWS };

export default function SavedViewsPanel({
  views,
  activeViewId,
  onApplyView,
  onSaveView,
  onDeleteView,
}) {
  return (
    <section className="rounded-lg border border-outline-variant/40 bg-white/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-label-lg font-label-lg text-on-surface">Saved Views</h2>
          <p className="text-label-sm text-on-surface-variant">Fast filters for repeated lead reviews.</p>
        </div>
        <button
          type="button"
          onClick={onSaveView}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-label-sm font-label-sm text-white transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[17px]">bookmark_add</span>
          Save Current View
        </button>
      </div>

      {views.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline-variant bg-white/45 p-4 text-center">
          <p className="text-body-sm text-on-surface-variant">No saved views yet. Create your first view.</p>
          <button
            type="button"
            onClick={onSaveView}
            className="mt-3 rounded-lg border border-primary/30 px-3 py-2 text-label-sm font-label-sm text-primary hover:bg-primary/5"
          >
            Create View
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {views.map((view) => (
            <div
              key={view.id}
              className={`flex min-w-[220px] items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                activeViewId === view.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant/40 bg-white/55 text-on-surface hover:bg-white/75'
              }`}
            >
              <button
                type="button"
                onClick={() => onApplyView(view)}
                className="min-w-0 flex-1 text-left"
                title={view.name}
              >
                <span className="block truncate text-label-md font-label-md">{view.name}</span>
                <span className="block truncate text-label-sm text-on-surface-variant">
                  {Object.entries(view.filters || {})
                    .filter(([, value]) => value)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' · ') || 'Current lead view'}
                </span>
              </button>
              {!DEFAULT_SAVED_VIEWS.some((defaultView) => defaultView.id === view.id) && (
                <button
                  type="button"
                  onClick={() => onDeleteView(view.id)}
                  className="rounded-md p-1 text-on-surface-variant hover:bg-error/10 hover:text-error"
                  aria-label={`Delete ${view.name}`}
                  title="Delete view"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
