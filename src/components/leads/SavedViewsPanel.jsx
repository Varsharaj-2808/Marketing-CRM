import { useState } from 'react';
import Modal from '../common/Modal';

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
  onUpdateView,
  onDeleteView,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedView, setSelectedView] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState('');
  const [deleteViewId, setDeleteViewId] = useState('');

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedView(null);
    setDraftName('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (view) => {
    setModalMode('edit');
    setSelectedView(view);
    setDraftName(view?.name || '');
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedView(null);
    setDraftName('');
    setError('');
  };

  const handleSubmit = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError('View name is required.');
      return;
    }

    if (modalMode === 'edit' && selectedView) {
      onUpdateView?.(selectedView.id, trimmed);
    } else {
      onSaveView?.(trimmed);
    }
    closeModal();
  };

  const confirmDelete = (viewId) => {
    setDeleteViewId(viewId);
  };

  const handleDeleteConfirm = () => {
    if (deleteViewId) {
      onDeleteView?.(deleteViewId);
    }
    setDeleteViewId('');
  };

  return (
    <section className="rounded-lg border border-outline-variant/40 bg-white/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-label-lg font-label-lg text-on-surface">Saved Views</h2>
          <p className="text-label-sm text-on-surface-variant">Fast filters for repeated lead reviews.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
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
            onClick={openCreateModal}
            className="mt-3 rounded-lg border border-primary/30 px-3 py-2 text-label-sm font-label-sm text-primary hover:bg-primary/5"
          >
            Create View
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {views.map((view) => {
            const isDefault = DEFAULT_SAVED_VIEWS.some((defaultView) => defaultView.id === view.id);
            return (
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
                  aria-label={`Apply ${view.name}`}
                >
                  <span className="block truncate text-label-md font-label-md">{view.name}</span>
                  <span className="block truncate text-label-sm text-on-surface-variant">
                    {Object.entries(view.filters || {})
                      .filter(([, value]) => value)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' · ') || 'Current lead view'}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(view)}
                    className="rounded-md p-1 text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                    aria-label="Edit view"
                    title={`Edit ${view.name}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => confirmDelete(view.id)}
                      className="rounded-md p-1 text-on-surface-variant hover:bg-error/10 hover:text-error"
                      aria-label={`Delete ${view.name}`}
                      title="Delete view"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'edit' ? 'Edit Saved View' : 'Save Current View'}>
        <div className="space-y-4">
          <label className="block text-label-md font-label-md text-on-surface-variant" htmlFor="saved-view-name">
            View name
          </label>
          <input
            id="saved-view-name"
            aria-label="View name"
            value={draftName}
            onChange={(event) => {
              setDraftName(event.target.value);
              if (error) setError('');
            }}
            placeholder="Enter a view name"
            className="h-10 w-full rounded-lg border border-outline-variant bg-white/70 px-3 text-body-sm text-on-surface placeholder:text-outline focus:outline-none input-focus-effect"
          />
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="rounded-lg border border-outline-variant px-3 py-2 text-label-sm font-label-sm text-on-surface">Cancel</button>
            <button type="button" onClick={handleSubmit} className="rounded-lg bg-primary px-3 py-2 text-label-sm font-label-sm text-white">Save View</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteViewId)} onClose={() => setDeleteViewId('')} title="Delete Saved View">
        <div className="space-y-4">
          <p className="text-body-sm text-on-surface-variant">This saved view will be removed from your list.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteViewId('')} className="rounded-lg border border-outline-variant px-3 py-2 text-label-sm font-label-sm text-on-surface">Cancel</button>
            <button type="button" onClick={handleDeleteConfirm} className="rounded-lg bg-error px-3 py-2 text-label-sm font-label-sm text-white">Delete</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
