import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import UserTable from '../../components/admin/UserTable';
import UserFormModal from '../../components/admin/UserFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';
import Pagination from '../../components/common/Pagination';

const USER_PAGE_SIZE = 5;
const AUDIT_PAGE_SIZE = 5;

const INITIAL_USERS = [
  { employee_id: 'EMP-00001', employee_name: 'Admin User', mobile: '9876543210', email: 'admin@company.com', role: 'Admin', status: 'Active' },
  { employee_id: 'EMP-00002', employee_name: 'Executive User', mobile: '9876543211', email: 'executive@company.com', role: 'Marketing Executive', status: 'Active' },
];

function UserManagementSkeleton() {
  return (
    <div className="mt-1">
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
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_users');
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, user: null, action: '' });
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLog, setAuditLog] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_audit_log');
      return stored ? JSON.parse(stored) : [
        { action: 'USER_CREATED', target: 'EMP-00001', by: 'System', timestamp: new Date().toISOString(), details: 'Admin User created' },
        { action: 'USER_CREATED', target: 'EMP-00002', by: 'System', timestamp: new Date().toISOString(), details: 'Executive User created' },
      ];
    } catch {
      return [];
    }
  });

  const addAuditEntry = useCallback((action, target, details) => {
    const entry = {
      action,
      target,
      by: user?.id || 'Unknown',
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLog((prev) => [entry, ...prev]);
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateEmployeeId = () => {
    const maxId = users.reduce((max, u) => {
      const num = parseInt(u.employee_id.replace('EMP-', ''), 10);
      return num > max ? num : max;
    }, 0);
    return `EMP-${String(maxId + 1).padStart(5, '0')}`;
  };

  const handleSaveUser = (formData) => {
    if (editingUser) {
      const existsEmail = users.some(
        (u) => u.email.toLowerCase() === formData.email.toLowerCase() && u.employee_id !== editingUser.employee_id
      );
      if (existsEmail) {
        showNotification('Email already registered', 'error');
        return;
      }
      const existsMobile = users.some(
        (u) => u.mobile === formData.mobile && u.employee_id !== editingUser.employee_id
      );
      if (existsMobile) {
        showNotification('Mobile Number already registered', 'error');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.employee_id === editingUser.employee_id ? { ...u, ...formData } : u))
      );
      addAuditEntry('USER_UPDATED', editingUser.employee_id, `${JSON.stringify({ old: editingUser, new: formData })}`);
      showNotification('User updated successfully');
      setShowForm(false);
      setEditingUser(null);
    } else {
      const newUser = {
        employee_id: generateEmployeeId(),
        employee_name: formData.employee_name,
        mobile: formData.mobile,
        email: formData.email,
        role: formData.role,
        status: formData.status,
      };
      setUsers((prev) => [...prev, newUser]);
      addAuditEntry('USER_CREATED', newUser.employee_id, `${newUser.employee_name} created with role ${newUser.role}`);
      showNotification(`User created successfully - ${newUser.employee_id}`);
      setShowForm(false);
    }
  };

  const handleEdit = (userData) => {
    setEditingUser(userData);
    setShowForm(true);
  };

  const handleDeactivate = (userData) => {
    setConfirmDialog({ isOpen: true, user: userData, action: 'deactivate' });
  };

  const handleActivate = (userData) => {
    setConfirmDialog({ isOpen: true, user: userData, action: 'activate' });
  };

  const confirmAction = () => {
    const { user: targetUser, action } = confirmDialog;
    const newStatus = action === 'deactivate' ? 'Inactive' : 'Active';
    setUsers((prev) => prev.map((u) => (u.employee_id === targetUser.employee_id ? { ...u, status: newStatus } : u)));
    addAuditEntry(
      action === 'deactivate' ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
      targetUser.employee_id,
      `${targetUser.employee_name} ${action}d`
    );
    showNotification(`User ${action}d successfully`);
    setConfirmDialog({ isOpen: false, user: null, action: '' });
  };

  const existingEmails = users.map((u) => u.email.toLowerCase());
  const existingMobiles = users.map((u) => u.mobile);

  const paginatedUsers = users.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE);
  const paginatedAudit = auditLog.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);
  const userTotalPages = Math.ceil(users.length / USER_PAGE_SIZE);
  const auditTotalPages = Math.ceil(auditLog.length / AUDIT_PAGE_SIZE);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    localStorage.setItem('crm_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('crm_audit_log', JSON.stringify(auditLog));
  }, [auditLog]);

  if (!isAuthenticated || !user) return null;
  if (loading) return <UserManagementSkeleton />;

  return (
    <div className="mt-1">
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
          <h4 className="font-headline-md text-headline-md text-on-surface">All Users</h4>
        </div>
        <UserTable users={paginatedUsers} onEdit={handleEdit} onDeactivate={handleDeactivate} onActivate={handleActivate} />
        <Pagination
          currentPage={userPage}
          totalPages={userTotalPages}
          onPageChange={setUserPage}
          totalItems={users.length}
          pageSize={USER_PAGE_SIZE}
        />
      </div>

      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-headline-md text-headline-md text-on-surface">Audit Log</h4>
          <button className="text-primary font-label-md flex items-center gap-1 hover:underline">
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
              {paginatedAudit.map((entry, i) => (
                <tr key={i} className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors group relative">
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${
                      entry.action.includes('CREATED') ? 'bg-emerald-500/10 text-emerald-600' :
                      entry.action.includes('UPDATED') ? 'bg-primary/10 text-primary' :
                      entry.action.includes('DEACTIVATED') ? 'bg-error-container text-on-error-container' :
                      entry.action.includes('ACTIVATED') ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>{entry.action}</span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-on-surface">{entry.target}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{entry.by}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{new Date(entry.timestamp).toLocaleString()}</td>
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
          totalItems={auditLog.length}
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
        message={`Are you sure you want to ${confirmDialog.action} ${confirmDialog.user?.employee_name}?`}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({ isOpen: false, user: null, action: '' })}
      />
    </div>
  );
}
