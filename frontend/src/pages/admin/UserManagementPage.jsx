import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import UserTable from '../../components/admin/UserTable';
import UserFormModal from '../../components/admin/UserFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';
import Pagination from '../../components/common/Pagination';

const USER_PAGE_SIZE = 5;
const AUDIT_PAGE_SIZE = 5;

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

      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <Skeleton width="80px" height="20px" rounded />
        </div>
        <SkeletonTable rows={4} cols={7} />
      </div>

      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <Skeleton width="80px" height="20px" rounded />
          <Skeleton width="80px" height="14px" rounded />
        </div>
        <SkeletonTable rows={3} cols={5} />
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const initialData = useRef(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, targetUser: null, action: '' });
  const [notification, setNotification] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

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
      setUsers(res.data);
      setUserTotal(res.pagination.total);
    }
  }, [userPage, searchQuery, roleFilter, statusFilter]);

  const fetchAuditLog = useCallback(async () => {
    const res = await userService.getAuditLog({ page: auditPage, pageSize: AUDIT_PAGE_SIZE });
    if (res.success) {
      setAuditLog(res.data);
      setAuditTotal(res.pagination.total);
    }
  }, [auditPage]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!initialData.current) {
      initialData.current = true;
      const sync = userService.getUsersSync({ page: userPage, pageSize: USER_PAGE_SIZE, search: searchQuery, role: roleFilter, status: statusFilter });
      setUsers(sync.data);
      setUserTotal(sync.pagination.total);
      const syncAudit = userService.getAuditLogSync({ page: auditPage, pageSize: AUDIT_PAGE_SIZE });
      setAuditLog(syncAudit.data);
      setAuditTotal(syncAudit.pagination.total);
      setLoading(false);
    }
    const load = async () => {
      await Promise.all([fetchUsers(), fetchAuditLog()]);
      setLoading(false);
    };
    load();
  }, [isAuthenticated, navigate, fetchUsers, fetchAuditLog, userPage, searchQuery, roleFilter, statusFilter, auditPage]);

  useEffect(() => { setUserPage(1); }, [searchQuery, roleFilter, statusFilter]);

  const handleSaveUser = async (formData) => {
    if (editingUser) {
      const res = await userService.updateUser(editingUser.employee_id, formData);
      if (res.success) {
        await fetchUsers();
        await fetchAuditLog();
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
        await fetchAuditLog();
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
      await fetchAuditLog();
      showNotification(res.message);
    } else {
      showNotification(res.message, 'error');
    }
    setConfirmDialog({ isOpen: false, targetUser: null, action: '' });
  };

  const existingEmails = [];
  const existingMobiles = [];

  const userTotalPages = Math.ceil(userTotal / USER_PAGE_SIZE);
  const auditTotalPages = Math.ceil(auditTotal / AUDIT_PAGE_SIZE);

  if (!isAuthenticated || !user) return null;
  if (loading) return <UserManagementSkeleton />;

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">User Management</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">User Management</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Create, edit, and manage user accounts and permissions.</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add User
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="font-headline-md text-headline-md text-on-surface">All Users</h4>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="relative w-full sm:w-56">
                <span className="material-symbols-outlined text-on-surface-variant/50 text-[18px] absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, ID..."
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl pl-9 pr-4 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="All">Any</option>
                <option value="Admin">Admin</option>
                <option value="Marketing Executive">Marketing Executive</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="All">Any</option>
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

      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-headline-md text-headline-md text-on-surface">Audit Log</h4>
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="text-primary font-label-md flex items-center gap-1 hover:underline"
          >
            View Full Log
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Target</th>
                <th className="py-2.5 px-3 font-semibold">Performed By</th>
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface">
              {auditLog.map((entry) => (
                <tr key={entry.id} className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors group relative">
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${
                      entry.action.includes('CREATED') ? 'bg-emerald-500/10 text-emerald-600' :
                      entry.action.includes('UPDATED') ? 'bg-primary/10 text-primary' :
                      entry.action.includes('DEACTIVATED') ? 'bg-error-container text-on-error-container' :
                      entry.action.includes('ACTIVATED') ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>{entry.action}</span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-on-surface">{entry.resourceId || entry.user_id?.slice(0, 8)}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{entry.email}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-3 text-on-surface-variant max-w-[160px] truncate">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={auditPage}
          totalPages={auditTotalPages}
          onPageChange={setAuditPage}
          totalItems={auditTotal}
          pageSize={AUDIT_PAGE_SIZE}
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
