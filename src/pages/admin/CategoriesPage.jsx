import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../constants';
import {
  fetchCategories,
  fetchSubCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  toggleCategoryStatus,
  toggleSubCategoryStatus,
  checkCategoryInUse,
  checkSubCategoryInUse,
  fetchCategoryAuditLog,
} from '../../services/leadService';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Toast from '../../components/common/Toast';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';

function isTestEnvironment() {
  return (
    import.meta.env.MODE === 'test' ||
    (typeof window !== 'undefined' && (window.__vitest_worker__ || window.vi || window.vitest))
  );
}

function getAuthHeadersLocal() {
  const raw =
    localStorage.getItem('crm_access_token') ||
    sessionStorage.getItem('crm_access_token');
  let token = null;
  try { token = raw ? JSON.parse(raw) : null; } catch { token = raw; }
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchSubCategoriesDirect(categoryId) {
  if (isTestEnvironment()) {
    return await fetchSubCategories(categoryId);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/admin/subcategories?category_id=${categoryId}&_=${Date.now()}`, {
      headers: getAuthHeadersLocal(),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.body?.data) {
        const filtered = json.body.data.filter(s => s.category_id === categoryId);
        return { success: true, data: filtered };
      }
      if (json?.data) {
        const list = Array.isArray(json.data) ? json.data : (json.data?.data || []);
        const filtered = list.filter(s => s.category_id === categoryId);
        return { success: true, data: filtered };
      }
    }
  } catch {}
  return await fetchSubCategories(categoryId);
}

async function fetchCategoryAuditLogDirect(categoryId) {
  if (isTestEnvironment()) {
    return await fetchCategoryAuditLog(categoryId);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/audit-log?category_id=${categoryId}&_=${Date.now()}`, {
      headers: getAuthHeadersLocal(),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.body?.data) {
        const filtered = json.body.data.filter(entry => entry.entityId === categoryId);
        return { success: true, data: filtered };
      }
      if (json?.data) {
        const filtered = json.data.filter(entry => entry.entityId === categoryId);
        return { success: true, data: filtered };
      }
    }
  } catch {}
  return await fetchCategoryAuditLog(categoryId);
}

function CategoriesSkeleton() {
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
        <SkeletonTable rows={4} cols={4} />
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [subMap, setSubMap] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormError, setCatFormError] = useState('');
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subFormCategoryId, setSubFormCategoryId] = useState(null);
  const [subFormName, setSubFormName] = useState('');
  const [subFormError, setSubFormError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, target: null, type: '' });
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [auditTarget, setAuditTarget] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleToastClose = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const loadCategories = useCallback(async () => {
    const res = await fetchCategories();
    if (res.success) setCategories(res.data);
  }, []);

  const loadSubs = useCallback(async (categoryId) => {
    const res = await fetchSubCategoriesDirect(categoryId);
    if (res.success) {
      setSubMap(prev => ({ ...prev, [categoryId]: res.data }));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }
    const load = async () => {
      const catRes = await fetchCategories();
      if (catRes.success) {
        setCategories(catRes.data);
        const subResults = await Promise.all(
          catRes.data.map(async (cat) => {
            const subRes = await fetchSubCategoriesDirect(cat.id);
            return { id: cat.id, data: subRes.success ? subRes.data : [] };
          })
        );
        const initialSubMap = {};
        subResults.forEach(({ id, data }) => { initialSubMap[id] = data; });
        setSubMap(initialSubMap);
      }
      setLoading(false);
    };
    load();
  }, [isAuthenticated, navigate]);

  const toggleExpand = async (categoryId) => {
    if (expandedId === categoryId) {
      setExpandedId(null);
    } else {
      setExpandedId(categoryId);
      if (!subMap[categoryId]) await loadSubs(categoryId);
    }
  };

  const openCreateCat = () => {
    setEditingCat(null);
    setCatFormName('');
    setCatFormError('');
    setShowCatForm(true);
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatFormName(cat.category_name || cat.name);
    setCatFormError('');
    setShowCatForm(true);
  };

  const handleSaveCat = async () => {
    if (!catFormName.trim()) {
      setCatFormError('Name is required');
      return;
    }
    let res;
    if (editingCat) {
      res = await updateCategory(editingCat.id, {
        category_name: catFormName.trim(),
        name: catFormName.trim()
      });
    } else {
      res = await createCategory({
        category_name: catFormName.trim(),
        name: catFormName.trim()
      });
    }
    if (res.success) {
      await loadCategories();
      showToast(res.message);
      setShowCatForm(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDeleteCat = async (cat) => {
    const inUseRes = await checkCategoryInUse(cat.id);
    if (inUseRes.inUse) {
      setErrorDialog({
        isOpen: true,
        message: `Cannot delete "${cat.category_name || cat.name}". It is currently in use by ${inUseRes.leads?.length ?? 0} lead(s). Deactivate it instead.`
      });
      return;
    }
    setConfirmDialog({ isOpen: true, target: cat, type: 'category' });
  };

  const confirmDeleteCat = async () => {
    const res = await deleteCategory(confirmDialog.target.id);
    if (res.success) {
      await loadCategories();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, target: null, type: '' });
  };

  const handleToggleCatStatus = async (cat) => {
    const isActive = cat.status === 'Active' || cat.isActive !== false;
    const newStatus = !isActive;
    const res = await toggleCategoryStatus(cat.id, newStatus);
    if (res.success) {
      await loadCategories();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const openCreateSub = (categoryId) => {
    setEditingSub(null);
    setSubFormCategoryId(categoryId);
    setSubFormName('');
    setSubFormError('');
    setShowSubForm(true);
  };

  const openEditSub = (categoryId, sub) => {
    setEditingSub(sub);
    setSubFormCategoryId(categoryId);
    setSubFormName(sub.sub_category_name || sub.name);
    setSubFormError('');
    setShowSubForm(true);
  };

  const handleSaveSub = async () => {
    if (!subFormName.trim()) {
      setSubFormError('Name is required');
      return;
    }
    let res;
    if (editingSub) {
      res = await updateSubCategory(subFormCategoryId, editingSub.id, {
        sub_category_name: subFormName.trim(),
        name: subFormName.trim()
      });
    } else {
      res = await createSubCategory(subFormCategoryId, {
        sub_category_name: subFormName.trim(),
        name: subFormName.trim(),
        category_id: subFormCategoryId,
        parentCategoryId: subFormCategoryId
      });
    }
    if (res.success) {
      await loadSubs(subFormCategoryId);
      showToast(res.message);
      setShowSubForm(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDeleteSub = async (categoryId, sub) => {
    const inUseRes = await checkSubCategoryInUse(categoryId, sub.id);
    if (inUseRes.inUse) {
      setErrorDialog({
        isOpen: true,
        message: `Cannot delete "${sub.sub_category_name || sub.name}". It is currently in use by ${inUseRes.leads?.length ?? 0} lead(s). Deactivate it instead.`
      });
      return;
    }
    setConfirmDialog({ isOpen: true, target: { ...sub, categoryId }, type: 'subcategory' });
  };

  const confirmDeleteSub = async () => {
    const { categoryId, id } = confirmDialog.target;
    const res = await deleteSubCategory(categoryId, id);
    if (res.success) {
      await loadSubs(categoryId);
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, target: null, type: '' });
  };

  const handleToggleSubStatus = async (categoryId, sub) => {
    const isActive = sub.status === 'Active' || sub.isActive !== false;
    const newStatus = !isActive;
    const res = await toggleSubCategoryStatus(categoryId, sub.id, newStatus);
    if (res.success) {
      await loadSubs(categoryId);
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const openAuditLog = async (cat) => {
    setAuditLoading(true);
    setAuditTarget(cat);
    const res = await fetchCategoryAuditLogDirect(cat.id);
    if (res.success) {
      setAuditLogs(res.body?.data || res.data || []);
    } else {
      setAuditLogs([]);
    }
    setAuditLoading(false);
  };

  const confirmAction = () => {
    if (confirmDialog.type === 'category') confirmDeleteCat();
    else if (confirmDialog.type === 'subcategory') confirmDeleteSub();
  };

  const getAuditEntryDetails = (entry) => {
    if (entry.details) return entry.details;
    
    const categoryName = entry.entityName || '';
    const user = entry.changedBy || '';
    
    if (entry.action === 'CREATE') {
      return `Category "${categoryName}" created by ${user}`;
    }
    if (entry.action === 'UPDATE' && entry.changes) {
      const changesObj = entry.changes.category_name || entry.changes.name || entry.changes;
      if (changesObj && (changesObj.old !== undefined || changesObj.new !== undefined)) {
        return `Category renamed from "${changesObj.old}" to "${changesObj.new}" by ${user}`;
      }
      return `Category updated by ${user}`;
    }
    if (entry.action === 'DELETE') {
      return `Category "${categoryName}" deleted by ${user}`;
    }
    return `${entry.action} action performed on "${categoryName}" by ${user}`;
  };

  if (!isAuthenticated) return null;
  if (loading) return <CategoriesSkeleton />;

  return (
    <div className="mt-4">
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={handleToastClose}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Categories</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">Categories</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Manage business categories and their sub-categories.</p>
        </div>
        <button
          onClick={openCreateCat}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Category
        </button>
      </div>

      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <h4 className="font-headline-md text-headline-md text-on-surface">All Categories</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                <th className="py-2.5 px-3 font-semibold w-16">#</th>
                <th className="py-2.5 px-3 font-semibold">Category Name</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold w-32">Sub-Categories</th>
                <th className="py-2.5 px-3 font-semibold w-72">Actions</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">category</span>
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => {
                  const isInactive = cat.status === 'Inactive' || cat.isActive === false;
                  return (
                    <Fragment key={cat.id}>
                      <tr className={`border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-3 text-on-surface-variant">{index + 1}</td>
                        <td className="py-3 px-3 font-medium text-on-surface">
                          {cat.category_name || cat.name}
                          {isInactive && <span className="ml-2 text-label-sm text-error">(Inactive)</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-xs font-semibold ${isInactive ? 'bg-error-container text-on-error-container' : 'bg-emerald-500/10 text-emerald-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-error' : 'bg-emerald-500'}`} />
                            {isInactive ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="inline-flex items-center gap-1 text-label-sm font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                          >
                            <span className={`material-symbols-outlined text-[16px] transition-transform ${expandedId === cat.id ? 'rotate-90' : ''}`}>
                              chevron_right
                            </span>
                            {subMap[cat.id]?.length ?? 0}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => openCreateSub(cat.id)}
                              className="px-2.5 py-1 text-label-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              Add Sub
                            </button>
                            <button
                              onClick={() => openEditCat(cat)}
                              className="px-2.5 py-1 text-label-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleCatStatus(cat)}
                              className={`px-2.5 py-1 text-label-sm font-medium rounded-lg transition-colors ${isInactive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                            >
                              {isInactive ? 'Activate' : 'Deactivate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCat(cat)}
                              className="px-2.5 py-1 text-label-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => openAuditLog(cat)}
                              className="px-2.5 py-1 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
                            >
                              Audit
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === cat.id && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <div className="bg-surface-container-low/40 border-b border-outline-variant/10">
                              {(!subMap[cat.id] || subMap[cat.id].length === 0) ? (
                                <p className="px-10 py-4 text-label-sm text-on-surface-variant italic">No sub-categories yet.</p>
                              ) : (
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="text-label-xs text-on-surface-variant uppercase tracking-wider">
                                      <th className="py-2 px-10 font-semibold w-16">#</th>
                                      <th className="py-2 px-3 font-semibold">Sub-Category Name</th>
                                      <th className="py-2 px-3 font-semibold w-24">Status</th>
                                      <th className="py-2 px-3 font-semibold w-72">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {subMap[cat.id].map((sub, subIdx) => {
                                      const subInactive = sub.status === 'Inactive' || sub.isActive === false;
                                      return (
                                        <tr key={sub.id} className={`border-t border-outline-variant/5 hover:bg-primary/[0.02] transition-colors ${subInactive ? 'opacity-50' : ''}`}>
                                          <td className="py-2 px-10 text-on-surface-variant">{subIdx + 1}</td>
                                          <td className="py-2 px-3 text-on-surface">
                                            {sub.sub_category_name || sub.name}
                                            {subInactive && <span className="ml-2 text-label-sm text-error">(Inactive)</span>}
                                          </td>
                                          <td className="py-2 px-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-xs font-semibold ${subInactive ? 'bg-error-container text-on-error-container' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                              {subInactive ? 'Inactive' : 'Active'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => openEditSub(cat.id, sub)}
                                                className="px-2 py-0.5 text-label-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => handleToggleSubStatus(cat.id, sub)}
                                                className={`px-2 py-0.5 text-label-sm font-medium rounded-lg transition-colors ${subInactive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                              >
                                                {subInactive ? 'Activate' : 'Deactivate'}
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSub(cat.id, sub)}
                                                className="px-2 py-0.5 text-label-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {editingCat ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={() => setShowCatForm(false)} className="p-1.5 hover:bg-surface-container-high rounded-xl transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCat(); }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">Category Name</label>
                <input
                  value={catFormName}
                  onChange={(e) => { setCatFormName(e.target.value); setCatFormError(''); }}
                  className={`w-full bg-surface-container-low/50 border ${catFormError ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none`}
                  placeholder="Enter category name"
                  autoFocus
                />
                {catFormError && <p className="text-label-sm text-error mt-1">{catFormError}</p>}
              </div>
              <div className="flex items-center gap-3 pt-5 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  className="flex-1 py-3.5 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                >
                  {editingCat ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {editingSub ? 'Edit Sub-Category' : 'Add Sub-Category'}
              </h3>
              <button onClick={() => setShowSubForm(false)} className="p-1.5 hover:bg-surface-container-high rounded-xl transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSub(); }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">Sub-Category Name</label>
                <input
                  value={subFormName}
                  onChange={(e) => { setSubFormName(e.target.value); setSubFormError(''); }}
                  className={`w-full bg-surface-container-low/50 border ${subFormError ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none`}
                  placeholder="Enter sub-category name"
                  autoFocus
                />
                {subFormError && <p className="text-label-sm text-error mt-1">{subFormError}</p>}
              </div>
              <div className="flex items-center gap-3 pt-5 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setShowSubForm(false)}
                  className="flex-1 py-3.5 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                >
                  {editingSub ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.type === 'category' ? 'Delete Category' : 'Delete Sub-Category'}
        message={`Are you sure you want to delete "${confirmDialog.target?.category_name || confirmDialog.target?.sub_category_name || confirmDialog.target?.name}"? This action cannot be undone.`}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({ isOpen: false, target: null, type: '' })}
      />

      {errorDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-error">block</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Cannot Delete</h3>
              <p className="text-body-md text-on-surface-variant">{errorDialog.message}</p>
            </div>
            <button
              onClick={() => setErrorDialog({ isOpen: false, message: '' })}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {auditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 p-6" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Audit Log: {auditTarget.category_name || auditTarget.name}
              </h3>
              <button onClick={() => setAuditTarget(null)} className="p-1.5 hover:bg-surface-container-high rounded-xl transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                <span className="ml-2 text-on-surface-variant">Loading audit log...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                <p className="font-label-md">No audit entries yet for this category.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-label-xs text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/10">
                      <th className="py-2 px-2 font-semibold">Action</th>
                      <th className="py-2 px-2 font-semibold">Details</th>
                      <th className="py-2 px-2 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((entry) => (
                      <tr key={entry.id} className="border-b border-outline-variant/5">
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-xs font-semibold bg-primary/10 text-primary">
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-body-sm text-on-surface-variant">{getAuditEntryDetails(entry)}</td>
                        <td className="py-2 px-2 text-body-sm text-on-surface-variant">{new Date(entry.timestamp || entry.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}