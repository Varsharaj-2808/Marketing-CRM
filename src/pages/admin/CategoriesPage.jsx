import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchCategories,
  fetchSubCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from '../../services/leadService';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';

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
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadCategories = useCallback(async () => {
    const res = await fetchCategories();
    if (res.success) setCategories(res.data);
  }, []);

  const loadSubs = useCallback(async (categoryId) => {
    const res = await fetchSubCategories(categoryId);
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
      await loadCategories();
      setLoading(false);
    };
    load();
  }, [isAuthenticated, navigate, loadCategories]);

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
    setCatFormName(cat.name);
    setCatFormError('');
    setShowCatForm(true);
  };

  const handleSaveCat = async () => {
    if (!catFormName.trim()) {
      setCatFormError('Name is required');
      return;
    }
    if (editingCat) {
      const res = await updateCategory(editingCat.id, { name: catFormName.trim() });
      if (res.success) {
        await loadCategories();
        showNotification(res.message);
        setShowCatForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    } else {
      const res = await createCategory({ name: catFormName.trim() });
      if (res.success) {
        await loadCategories();
        showNotification(res.message);
        setShowCatForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    }
  };

  const handleDeleteCat = (cat) => {
    setConfirmDialog({ isOpen: true, target: cat, type: 'category' });
  };

  const confirmDeleteCat = async () => {
    const res = await deleteCategory(confirmDialog.target.id);
    if (res.success) {
      await loadCategories();
      showNotification(res.message);
    } else {
      showNotification(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, target: null, type: '' });
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
    setSubFormName(sub.name);
    setSubFormError('');
    setShowSubForm(true);
  };

  const handleSaveSub = async () => {
    if (!subFormName.trim()) {
      setSubFormError('Name is required');
      return;
    }
    if (editingSub) {
      const res = await updateSubCategory(subFormCategoryId, editingSub.id, { name: subFormName.trim() });
      if (res.success) {
        await loadSubs(subFormCategoryId);
        showNotification(res.message);
        setShowSubForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    } else {
      const res = await createSubCategory(subFormCategoryId, { name: subFormName.trim() });
      if (res.success) {
        await loadSubs(subFormCategoryId);
        showNotification(res.message);
        setShowSubForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    }
  };

  const handleDeleteSub = (categoryId, sub) => {
    setConfirmDialog({ isOpen: true, target: { ...sub, categoryId }, type: 'subcategory' });
  };

  const confirmDeleteSub = async () => {
    const { categoryId, id } = confirmDialog.target;
    const res = await deleteSubCategory(categoryId, id);
    if (res.success) {
      await loadSubs(categoryId);
      showNotification(res.message);
    } else {
      showNotification(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, target: null, type: '' });
  };

  const confirmAction = () => {
    if (confirmDialog.type === 'category') confirmDeleteCat();
    else if (confirmDialog.type === 'subcategory') confirmDeleteSub();
  };

  if (!isAuthenticated) return null;
  if (loading) return <CategoriesSkeleton />;

  return (
    <div className="mt-4">
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
          <h4 className="font-headline-md text-headline-md text-on-surface">All Categories</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                <th className="py-2.5 px-3 font-semibold w-16">#</th>
                <th className="py-2.5 px-3 font-semibold">Category Name</th>
                <th className="py-2.5 px-3 font-semibold w-32">Sub-Categories</th>
                <th className="py-2.5 px-3 font-semibold w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">category</span>
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => (
                  <Fragment key={cat.id}>
                    <tr className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors">
                      <td className="py-3 px-3 text-on-surface-variant">{index + 1}</td>
                      <td className="py-3 px-3 font-medium text-on-surface">{cat.name}</td>
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
                        <div className="flex items-center gap-1">
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
                            onClick={() => handleDeleteCat(cat)}
                            className="px-2.5 py-1 text-label-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === cat.id && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <div className="bg-surface-container-low/40 border-b border-outline-variant/10">
                            {(!subMap[cat.id] || subMap[cat.id].length === 0) ? (
                              <p className="px-10 py-4 text-label-sm text-on-surface-variant italic">No sub-categories yet.</p>
                            ) : (
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-label-xs text-on-surface-variant uppercase tracking-wider">
                                    <th className="py-2 px-10 font-semibold w-16">#</th>
                                    <th className="py-2 px-3 font-semibold">Sub-Category Name</th>
                                    <th className="py-2 px-3 font-semibold w-56">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subMap[cat.id].map((sub, subIdx) => (
                                    <tr key={sub.id} className="border-t border-outline-variant/5 hover:bg-primary/[0.02] transition-colors">
                                      <td className="py-2 px-10 text-on-surface-variant">{subIdx + 1}</td>
                                      <td className="py-2 px-3 text-on-surface">{sub.name}</td>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => openEditSub(cat.id, sub)}
                                            className="px-2 py-0.5 text-label-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                          >
                                            Edit
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
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
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
        message={`Are you sure you want to delete "${confirmDialog.target?.name}"?`}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({ isOpen: false, target: null, type: '' })}
      />
    </div>
  );
}
