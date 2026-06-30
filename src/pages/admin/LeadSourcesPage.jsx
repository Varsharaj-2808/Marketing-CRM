import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchLeadSources, createLeadSource, updateLeadSource, deleteLeadSource } from '../../services/leadService';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';

function LeadSourcesSkeleton() {
  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div className="flex-1">
          <Skeleton width="40px" height="10px" rounded className="mb-1" />
          <Skeleton width="220px" height="26px" rounded className="mb-1" />
          <Skeleton width="320px" height="14px" rounded />
        </div>
        <Skeleton width="110px" height="36px" rounded />
      </div>
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <Skeleton width="120px" height="20px" rounded />
        </div>
        <SkeletonTable rows={4} cols={3} />
      </div>
    </div>
  );
}

export default function LeadSourcesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, target: null });
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadSources = useCallback(async () => {
    const res = await fetchLeadSources();
    if (res.success) setSources(res.data);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }
    const load = async () => {
      await loadSources();
      setLoading(false);
    };
    load();
  }, [isAuthenticated, navigate, loadSources]);

  const openCreate = () => {
    setEditingSource(null);
    setFormName('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (source) => {
    setEditingSource(source);
    setFormName(source.name);
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    if (editingSource) {
      const res = await updateLeadSource(editingSource.id, { name: formName.trim() });
      if (res.success) {
        await loadSources();
        showNotification(res.message);
        setShowForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    } else {
      const res = await createLeadSource({ name: formName.trim() });
      if (res.success) {
        await loadSources();
        showNotification(res.message);
        setShowForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    }
  };

  const handleDelete = (source) => {
    setConfirmDialog({ isOpen: true, target: source });
  };

  const confirmDelete = async () => {
    const res = await deleteLeadSource(confirmDialog.target.id);
    if (res.success) {
      await loadSources();
      showNotification(res.message);
    } else {
      showNotification(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, target: null });
  };

  if (!isAuthenticated) return null;
  if (loading) return <LeadSourcesSkeleton />;

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Lead Sources</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">Lead Sources</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Manage lead source options used in lead creation forms.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Source
        </button>
      </div>

      {notification && (
        <div className={`mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-sm ${
          notification.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-emerald-500/10 text-emerald-700'
        }`} style={{ animation: 'slide-up 0.3s ease' }}>
          <span className="material-symbols-outlined text-[18px]">{notification.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-label-md">{notification.message}</span>
        </div>
      )}

      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <h4 className="font-headline-md text-headline-md text-on-surface">All Lead Sources</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                <th className="py-2.5 px-3 font-semibold w-16">#</th>
                <th className="py-2.5 px-3 font-semibold">Source Name</th>
                <th className="py-2.5 px-3 font-semibold w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">source</span>
                    No lead sources found. Click "Add Source" to create one.
                  </td>
                </tr>
              ) : (
                sources.map((source, index) => (
                  <tr key={source.id} className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors">
                    <td className="py-3 px-3 text-on-surface-variant">{index + 1}</td>
                    <td className="py-3 px-3 font-medium text-on-surface">{source.name}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(source)}
                          className="px-2.5 py-1 text-label-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(source)}
                          className="px-2.5 py-1 text-label-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {editingSource ? 'Edit Lead Source' : 'Add Lead Source'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-surface-container-high rounded-xl transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">Source Name</label>
                <input
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormError(''); }}
                  className={`w-full bg-surface-container-low/50 border ${formError ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none`}
                  placeholder="Enter source name"
                  autoFocus
                />
                {formError && <p className="text-label-sm text-error mt-1">{formError}</p>}
              </div>
              <div className="flex items-center gap-3 pt-5 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3.5 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                >
                  {editingSource ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Lead Source"
        message={`Are you sure you want to delete "${confirmDialog.target?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, target: null })}
      />
    </div>
  );
}
