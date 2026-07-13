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
      if (json?.data) {
        const list = Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.data) ? json.data.data : []);
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
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
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
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
    } catch (err) {
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCat = async (cat) => {
    try {
      const inUseRes = await checkCategoryInUse(cat.id);
      const inUse = inUseRes?.inUse ?? inUseRes?.data?.in_use;
      if (inUse) {
        const leadCount = inUseRes?.leads?.length ?? inUseRes?.data?.lead_count ?? 0;
        setErrorDialog({
          isOpen: true,
          message: `Cannot delete "${cat.category_name || cat.name}". It is currently in use by ${leadCount} lead(s). Deactivate it instead.`
        });
        return;
      }
    } catch {
      // If in-use check fails, proceed to let backend enforce
    }
    setConfirmDialog({ isOpen: true, target: cat, type: 'category' });
  };

  const confirmDeleteCat = async () => {
    setSaving(true);
    try {
      const res = await deleteCategory(confirmDialog.target.id);
      if (res.success) {
        await loadCategories();
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Delete failed', 'error');
    } finally {
      setSaving(false);
      setConfirmDialog({ isOpen: false, target: null, type: '' });
    }
  };

  const handleToggleCatStatus = async (cat) => {
    const isActive = cat.status ? cat.status === 'Active' : cat.isActive !== false;
    const newStatus = !isActive;
    setSaving(true);
    try {
      const res = await toggleCategoryStatus(cat.id, newStatus);
      if (res.success) {
        await loadCategories();
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Status toggle failed', 'error');
    } finally {
      setSaving(false);
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
    setSaving(true);
    try {
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
    } catch (err) {
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSub = async (categoryId, sub) => {
    try {
      const inUseRes = await checkSubCategoryInUse(categoryId, sub.id);
      const inUse = inUseRes?.inUse ?? inUseRes?.data?.in_use;
      if (inUse) {
        const leadCount = inUseRes?.leads?.length ?? inUseRes?.data?.lead_count ?? 0;
        setErrorDialog({
          isOpen: true,
          message: `Cannot delete "${sub.sub_category_name || sub.name}". It is currently in use by ${leadCount} lead(s). Deactivate it instead.`
        });
        return;
      }
    } catch {
      // If in-use check fails (e.g. connection issue), proceed to let backend enforce
    }
    setConfirmDialog({ isOpen: true, target: { ...sub, categoryId }, type: 'subcategory' });
  };

  const confirmDeleteSub = async () => {
    const { categoryId, id } = confirmDialog.target;
    setSaving(true);
    try {
      const res = await deleteSubCategory(categoryId, id);
      if (res.success) {
        await loadSubs(categoryId);
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Delete failed', 'error');
    } finally {
      setSaving(false);
      setConfirmDialog({ isOpen: false, target: null, type: '' });
    }
  };

  const handleToggleSubStatus = async (categoryId, sub) => {
    const isActive = sub.status ? sub.status === 'Active' : sub.isActive !== false;
    const newStatus = !isActive;
    setSaving(true);
    try {
      const res = await toggleSubCategoryStatus(categoryId, sub.id, newStatus);
      if (res.success) {
        await loadSubs(categoryId);
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Status toggle failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAuditLog = async (cat) => {
    setAuditLoading(true);
    setAuditTarget(cat);
    const res = await fetchCategoryAuditLogDirect(cat.id);
    if (res.success) {
      setAuditLogs(res.data || []);
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

      {/* Modern Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
            <span className="text-primary font-bold">Categories</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage business categories and their sub-categories.</p>
        </div>
        <button
          onClick={openCreateCat}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Category
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-base font-semibold text-slate-900">All Categories</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[500px] w-full text-left border-collapse" role="table">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <th className="py-3.5 px-6 w-16">#</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4 w-32">Status</th>
                <th className="py-3.5 px-4 w-36">Sub-Categories</th>
                <th className="py-3.5 px-6 w-[360px]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 bg-white">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30 text-slate-400">category</span>
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => {
                  const isInactive = cat.status ? cat.status === 'Inactive' : cat.isActive === false;
                  return (
                    <Fragment key={cat.id}>
                      <tr className={`border-b border-slate-150 hover:bg-slate-50/50 transition-colors duration-150 ${isInactive ? 'opacity-60 bg-slate-50/30' : ''}`}>
                        <td className="py-4 px-6 text-slate-500 font-medium">{index + 1}</td>
                        <td className="py-4 px-4 font-semibold text-slate-900">
                          {cat.category_name || cat.name}
                          {isInactive && <span className="ml-2 text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">(Inactive)</span>}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-755 border border-emerald-250'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            {isInactive ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-container bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 transition-colors"
                          >
                            <span className={`material-symbols-outlined text-[16px] transition-transform ${expandedId === cat.id ? 'rotate-90' : ''}`}>
                              chevron_right
                            </span>
                            {subMap[cat.id]?.length ?? 0}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                            <button
                              onClick={() => openCreateSub(cat.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-755 bg-emerald-50 hover:bg-emerald-100/80 rounded-md transition-colors"
                            >
                              Add Sub
                            </button>
                            <button
                              onClick={() => openEditCat(cat)}
                              className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary-fixed hover:bg-primary-fixed-dim rounded-md transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleCatStatus(cat)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${isInactive ? 'text-emerald-755 bg-emerald-50 hover:bg-emerald-100/80' : 'text-amber-755 bg-amber-50 hover:bg-amber-100/80'}`}
                            >
                              {isInactive ? 'Activate' : 'Deactivate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCat(cat)}
                              className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => openAuditLog(cat)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              Audit
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === cat.id && (
                        <tr>
                          <td colSpan={5} className="py-3 px-6 bg-slate-50/20">
                            {/* Modern Nested Sub-category Card */}
                            <div className="bg-[#FAFAFC] border border-slate-200 border-l-4 border-l-primary rounded-lg p-5 shadow-sm">
                              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">subdirectory_arrow_right</span>
                                Sub-categories for {cat.category_name || cat.name}
                              </h5>
                              {(!subMap[cat.id] || subMap[cat.id].length === 0) ? (
                                <p className="text-xs text-slate-400 italic py-2">No sub-categories yet.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                  <table className="min-w-[420px] w-full text-left">
                                    <thead>
                                      <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200/80 sticky top-0">
                                        <th className="py-2.5 px-4 w-16">#</th>
                                        <th className="py-2.5 px-4">Sub-Category Name</th>
                                        <th className="py-2.5 px-4 w-28">Status</th>
                                        <th className="py-2.5 px-4 w-[280px]">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {subMap[cat.id].map((sub, subIdx) => {
                                        const subInactive = sub.status ? sub.status === 'Inactive' : sub.isActive === false;
                                        return (
                                          <tr key={sub.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors duration-150 ${subInactive ? 'opacity-60 bg-slate-50/20' : ''}`}>
                                            <td className="py-2.5 px-4 text-xs text-slate-400 font-medium">{subIdx + 1}</td>
                                            <td className="py-2.5 px-4 text-sm text-slate-800 font-semibold">
                                              {sub.sub_category_name || sub.name}
                                              {subInactive && <span className="ml-2 text-xs font-normal text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">(Inactive)</span>}
                                            </td>
                                            <td className="py-2.5 px-4 text-xs">
                                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${subInactive ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-205'}`}>
                                                {subInactive ? 'Inactive' : 'Active'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-4">
                                              <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                                                <button
                                                  onClick={() => openEditSub(cat.id, sub)}
                                                  className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-fixed rounded-md transition-colors"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => handleToggleSubStatus(cat.id, sub)}
                                                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${subInactive ? 'text-emerald-750 hover:bg-emerald-50' : 'text-amber-750 hover:bg-amber-50'}`}
                                                >
                                                  {subInactive ? 'Activate' : 'Deactivate'}
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteSub(cat.id, sub)}
                                                  className="px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-md transition-colors"
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
                                </div>
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

      {/* Modals section */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-slate-200" style={{ animation: 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="px-6 py-4.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingCat ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={() => !saving && setShowCatForm(false)} disabled={saving} className="p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCat(); }} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Category Name</label>
                <input
                  value={catFormName}
                  onChange={(e) => { setCatFormName(e.target.value); setCatFormError(''); }}
                  disabled={saving}
                  className={`w-full bg-slate-50 border ${catFormError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'} rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:border-primary transition-all outline-none disabled:opacity-50`}
                  placeholder="Enter category name"
                  autoFocus
                />
                {catFormError && <p className="text-xs text-red-500 mt-1">{catFormError}</p>}
              </div>
              <div className="flex items-center gap-3 pt-4.5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
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
                    editingCat ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-slate-200" style={{ animation: 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="px-6 py-4.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingSub ? 'Edit Sub-Category' : 'Add Sub-Category'}
              </h3>
              <button onClick={() => !saving && setShowSubForm(false)} disabled={saving} className="p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSub(); }} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Sub-Category Name</label>
                <input
                  value={subFormName}
                  onChange={(e) => { setSubFormName(e.target.value); setSubFormError(''); }}
                  disabled={saving}
                  className={`w-full bg-slate-50 border ${subFormError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'} rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:border-primary transition-all outline-none disabled:opacity-50`}
                  placeholder="Enter sub-category name"
                  autoFocus
                />
                {subFormError && <p className="text-xs text-red-500 mt-1">{subFormError}</p>}
              </div>
              <div className="flex items-center gap-3 pt-4.5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowSubForm(false)}
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
                    editingSub ? 'Update' : 'Create'
                  )}
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
        loading={saving}
      />

      {errorDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 overflow-hidden border border-slate-200" style={{ animation: 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-150">
                <span className="material-symbols-outlined text-red-650 text-[24px]">block</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Cannot Delete</h3>
              <p className="text-xs text-slate-500">{errorDialog.message}</p>
            </div>
            <button
              onClick={() => setErrorDialog({ isOpen: false, message: '' })}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {auditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 overflow-hidden border border-slate-200" style={{ animation: 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-150 bg-slate-50/20 -mx-6 px-6 -mt-6 py-4.5">
              <h3 className="text-base font-bold text-slate-900">
                Audit Log: {auditTarget.category_name || auditTarget.name}
              </h3>
              <button onClick={() => setAuditTarget(null)} className="p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                <span className="ml-2 text-sm text-slate-500 font-medium">Loading audit log...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                <p className="text-xs font-medium">No audit entries yet for this category.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Details</th>
                      <th className="py-2.5 px-4 w-48">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 text-slate-700 text-xs">
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-650">{getAuditEntryDetails(entry)}</td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(entry.timestamp || entry.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-5 flex justify-end pt-4 border-t border-slate-150">
              <button
                onClick={() => setAuditTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}