import { useState } from 'react';
import Modal from '../common/Modal';

const DEFAULT_SAVED_VIEWS = [
  {
    id: 'my-hot-leads',
    name: 'My Hot Leads',
    filters: { priority: 'Hot' },
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

  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedView(null);
    setDraftName('');
    setError('');
  };

  const handleSubmit = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError('View name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'edit' && selectedView) {
        await onUpdateView?.(selectedView.id, trimmed);
      } else {
        await onSaveView?.(trimmed);
      }
      closeModal();
    } catch (err) {
      setError(err?.message || 'Failed to save view');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (viewId) => {
    setDeleteViewId(viewId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteViewId) {
      setSubmitting(true);
      try {
        await onDeleteView?.(deleteViewId);
        setDeleteViewId('');
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Saved Views</h2>
          <p className="text-xs text-slate-500 mt-0.5">Fast filters for repeated lead reviews.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-container text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
          Save Current View
        </button>
      </div>

      {views.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
          <p className="text-xs text-slate-500">No saved views yet. Create your first view.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 text-primary bg-white hover:bg-primary/5 text-xs font-semibold rounded-lg transition-colors"
          >
            Create View
          </button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1.5">
          {views.map((view) => {
            const isDefault = DEFAULT_SAVED_VIEWS.some((defaultView) => defaultView.id === view.id);
            return (
              <div
                key={view.id}
                className={`flex min-w-[220px] items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 transition-colors ${
                  activeViewId === view.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 bg-slate-50/50 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onApplyView(view)}
                  className="min-w-0 flex-1 text-left"
                  title={view.name}
                  aria-label={`Apply ${view.name}`}
                >
                  <span className="block truncate text-xs font-bold text-slate-900">{view.name}</span>
                  <span className="block truncate text-[10px] text-slate-500 mt-0.5">
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
                    className="rounded-md p-1 text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors"
                    aria-label="Edit view"
                    title={`Edit ${view.name}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(view.id)}
                    className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Delete view"
                    title="Delete view"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => !submitting && closeModal()} title={modalMode === 'edit' ? 'Edit Saved View' : 'Save Current View'}>
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider" htmlFor="saved-view-name">
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
            disabled={submitting}
            placeholder="Enter a view name"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 disabled:opacity-50"
          />
          {error ? <p className="text-xs text-red-600 font-semibold">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} disabled={submitting} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-primary hover:bg-primary-container px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                  <span>Saving...</span>
                </>
              ) : (
                'Save View'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteViewId)} onClose={() => !submitting && setDeleteViewId('')} title="Delete Saved View">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">This saved view will be removed from your list.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteViewId('')} disabled={submitting} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={submitting}
              className="rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                  <span>Deleting...</span>
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
