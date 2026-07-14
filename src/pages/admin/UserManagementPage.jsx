import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import UserTable from '../../components/admin/UserTable';
import UserFormModal from '../../components/admin/UserFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';
import Pagination from '../../components/common/Pagination';

const USER_PAGE_SIZE = 5;

function UserManagementSkeleton() {
  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <Skeleton width="40px" height="10px" rounded />
            <Skeleton width="12px" height="12px" />
            <Skeleton width="100px" height="10px" rounded />
          </div>
          <Skeleton width="220px" height="26px" rounded className="mb-1" />
          <Skeleton width="320px" height="14px" rounded />
        </div>
        <Skeleton width="110px" height="36px" rounded />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <Skeleton width="80px" height="20px" rounded />
        </div>
        <SkeletonTable rows={4} cols={7} />
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialSearch = searchParams.get('search') || '';
  const initialRole = searchParams.get('role') || 'All';
  const initialStatus = searchParams.get('status') || 'All';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [userPage, setUserPage] = useState(initialPage);
  const [userTotal, setUserTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, targetUser: null, action: '' });
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    const res = await userService.getUsers({
      page: userPage,
      pageSize: USER_PAGE_SIZE,
      search: searchQuery,
      role: roleFilter,
      status: statusFilter,
    });
    if (res.success) {
      const userList = Array.isArray(res.data) ? res.data : (res.data?.users || []);
      const totalCount = res.pagination?.totalRecords ?? res.pagination?.total ?? userList.length;
      setUsers(userList);
      setUserTotal(totalCount);
    }
  }, [userPage, searchQuery, roleFilter, statusFilter]);

  // Sync state changes back to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (userPage > 1) params.set('page', String(userPage));
    if (roleFilter !== 'All') params.set('role', roleFilter);
    if (statusFilter !== 'All') params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [searchQuery, roleFilter, statusFilter, userPage, setSearchParams]);

  // Sync external/URL changes back to state (e.g. back button)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlPage = Number(searchParams.get('page')) || 1;
    const urlRole = searchParams.get('role') || 'All';
    const urlStatus = searchParams.get('status') || 'All';

    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
      setSearchInput(urlSearch);
    }
    if (urlPage !== userPage) {
      setUserPage(urlPage);
    }
    if (urlRole !== roleFilter) {
      setRoleFilter(urlRole);
    }
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // Debounce search input to update searchQuery
  useEffect(() => {
    const timeout = setTimeout(() => {
      const val = searchInput.trim();
      if (val !== searchQuery) {
        setSearchQuery(val);
        setUserPage(1);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, searchQuery]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }
    const load = async () => {
      await fetchUsers();
      setLoading(false);
    };
    load();
  }, [isAuthenticated, navigate, fetchUsers, userPage, searchQuery, roleFilter, statusFilter]);

  // Reset page when filters change (except search, which is handled by debounce)
  useEffect(() => {
    setUserPage(1);
  }, [roleFilter, statusFilter]);

  const handleSaveUser = async (formData) => {
    if (editingUser) {
      const res = await userService.updateUser(editingUser.employee_id, formData);
      if (res.success) {
        await fetchUsers();
        showNotification(res.message);
        setShowForm(false);
        setEditingUser(null);
      } else {
        showNotification(res.message, 'error');
      }
    } else {
      const res = await userService.createUser(formData);
      if (res.success) {
        await fetchUsers();
        showNotification(res.message);
        setShowForm(false);
      } else {
        showNotification(res.message, 'error');
      }
    }
  };

  const handleEdit = (userData) => {
    setEditingUser(userData);
    setShowForm(true);
  };

  const handleDeactivate = (userData) => {
    setConfirmDialog({ isOpen: true, targetUser: userData, action: 'deactivate' });
  };

  const handleActivate = (userData) => {
    setConfirmDialog({ isOpen: true, targetUser: userData, action: 'activate' });
  };

  const confirmAction = async () => {
    const { targetUser, action } = confirmDialog;
    const newStatus = action === 'deactivate' ? 'Inactive' : 'Active';
    const res = await userService.updateUserStatus(targetUser.employee_id, newStatus);
    if (res.success) {
      await fetchUsers();
      showNotification(res.message);
    } else {
      showNotification(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, targetUser: null, action: '' });
  };
  const existingEmails = users.map(u => u.email?.toLowerCase());

  const existingMobiles = users.map(u => u.mobile);

  const userTotalPages = Math.ceil(userTotal / USER_PAGE_SIZE);

  if (!isAuthenticated || !user) return null;
  if (loading) return <UserManagementSkeleton />;

  return (
    <div className="mt-4">
      {/* Modern Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
            <span className="text-primary font-bold">User Management</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create, edit, and manage user accounts and permissions.</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add User
        </button>
      </div>

      {notification && (
        <div className={`mb-3 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm font-medium shadow-xs border ${
          notification.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-850 border-emerald-200'
        }`} style={{ animation: 'slide-up 0.3s ease' }}>
          <span className="material-symbols-outlined text-[18px]">{notification.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h4 className="text-base font-semibold text-slate-900">All Users</h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative sm:w-56">
                <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, email, ID..."
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-auto h-10 bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="All">Any Role</option>
                <option value="Admin">Admin</option>
                <option value="Marketing Executive">Marketing Executive</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto h-10 bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="All">Any Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <UserTable users={users} onEdit={handleEdit} onDeactivate={handleDeactivate} onActivate={handleActivate} />
        <Pagination
          currentPage={userPage}
          totalPages={userTotalPages}
          onPageChange={setUserPage}
          totalItems={userTotal}
          totalFiltered={userTotal}
          pageSize={USER_PAGE_SIZE}
        />
      </div>

      <UserFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        user={editingUser}
        existingEmails={existingEmails}
        existingMobiles={existingMobiles}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.action === 'deactivate' ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${confirmDialog.action} ${confirmDialog.targetUser?.employee_name}?`}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({ isOpen: false, targetUser: null, action: '' })}
      />
    </div>
  );
}
