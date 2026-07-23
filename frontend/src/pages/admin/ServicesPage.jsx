import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchServices, createService, updateService, deleteService } from '../../services/leadService';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';
import Toast from '../../components/common/Toast';

function ServicesSkeleton() {
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <Skeleton width="120px" height="20px" rounded />
        </div>
        <SkeletonTable rows={4} cols={3} />
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, target: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [saving, setSaving] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleToastClose = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const loadServices = useCallback(async () => {
    const res = await fetchServices();
    if (res.success) setServices(res.data);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }
    const load = async () => {
      await loadServices();
      setLoading(false);
    };
    load();
  }, [isAuthenticated, navigate, loadServices]);

  const openCreate = () => {
    setEditingService(null);
    setFormName('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setFormName(service.name);
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    if (/^\d+$/.test(formName.trim())) {
      setFormError('Service name cannot be purely numeric');
      return;
    }
    setSaving(true);
    try {
      if (editingService) {
        const res = await updateService(editingService.id, { name: formName.trim() });
        if (res.success) {
          await loadServices();
          showToast(res.message);
          setShowForm(false);
        } else {
          showToast(res.message, 'error');
        }
      } else {
        const res = await createService({ name: formName.trim() });
        if (res.success) {
          await loadServices();
          showToast(res.message);
          setShowForm(false);
        } else {
          showToast(res.message, 'error');
        }
      }
    } catch (err) {
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (service) => {
    setConfirmDialog({ isOpen: true, target: service });
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      const res = await deleteService(confirmDialog.target.id);
      if (res.success) {
        await loadServices();
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Delete failed', 'error');
    } finally {
      setSaving(false);
      setConfirmDialog({ isOpen: false, target: null });
    }
  };

  if (!isAuthenticated) return null;
  if (loading) return <ServicesSkeleton />;

  return (
    <div className="mt-4">
      {/* Modern Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
            <span className="text-primary font-bold">Services</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Services</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage service offerings available for lead selection.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Service
        </button>
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={handleToastClose}
      />

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-base font-semibold text-slate-900">All Services</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" role="table">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <th className="py-3.5 px-6 w-16">#</th>
                <th className="py-3.5 px-4">Service Name</th>
                <th className="py-3.5 px-6 w-48 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500 bg-white">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30 text-slate-400">handyman</span>
                    No services found. Click "Add Service" to create one.
                  </td>
                </tr>
              ) : (
                services.map((service, index) => (
                  <tr key={service.id} className="border-b border-slate-150 hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="py-4 px-6 text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900">{service.name}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(service)}
                          className="px-3.5 py-1.5 text-[13px] font-semibold text-primary bg-primary-fixed hover:bg-primary-fixed-dim rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="px-3.5 py-1.5 text-[13px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-slate-200" style={{ animation: 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="px-6 py-4.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>
              <button onClick={() => !saving && setShowForm(false)} disabled={saving} className="p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Service Name</label>
                <input
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormError(''); }}
                  disabled={saving}
                  className={`w-full bg-slate-50 border ${formError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'} rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:border-primary transition-all outline-none disabled:opacity-50`}
                  placeholder="Enter service name"
                  autoFocus
                />
                {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
              </div>
              <div className="flex items-center gap-3 pt-4.5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    editingService ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Service"
        message={`Are you sure you want to delete "${confirmDialog.target?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, target: null })}
        loading={saving}
      />
    </div>
  );
}
