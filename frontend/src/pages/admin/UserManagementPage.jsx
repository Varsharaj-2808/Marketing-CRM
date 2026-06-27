import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import UserTable from '../../components/admin/UserTable';
import UserFormModal from '../../components/admin/UserFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

const INITIAL_USERS = [
  { employee_id: 'EMP-00001', employee_name: 'Admin User', mobile: '9876543210', email: 'admin@company.com', role: 'Admin', status: 'Active' },
  { employee_id: 'EMP-00002', employee_name: 'Executive User', mobile: '9876543211', email: 'executive@company.com', role: 'Marketing Executive', status: 'Active' },
];

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    localStorage.setItem('crm_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('crm_audit_log', JSON.stringify(auditLog));
  }, [auditLog]);

  if (!isAuthenticated || !user) return null;

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

  return (
    <>
      <div className="flex items-end justify-between mb-12">
        <div>
          <nav className="flex items-center gap-2 text-label-sm text-on-surface-variant/60 mb-2">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary font-bold">User Management</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">User Management</h1>
          <p className="font-body-md text-on-surface-variant mt-2">Create, edit, and manage user accounts and permissions.</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add User
        </button>
      </div>

      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-3 ${
          notification.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-emerald-500/10 text-emerald-700'
        }`} style={{ animation: 'slide-up 0.3s ease' }}>
          <span className="material-symbols-outlined">{notification.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-label-md">{notification.message}</span>
        </div>
      )}

      <div className="glass-card overflow-hidden mb-12">
        <div className="p-8 border-b border-outline-variant/10">
          <h4 className="font-headline-md text-headline-md text-on-surface">All Users</h4>
        </div>
        <UserTable users={users} onEdit={handleEdit} onDeactivate={handleDeactivate} onActivate={handleActivate} />
      </div>

      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-headline-md text-headline-md text-on-surface">Audit Log</h4>
          <button className="text-primary font-label-md flex items-center gap-1 hover:underline">
            View Full Log
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-label-md text-on-surface-variant/50 uppercase tracking-widest border-b border-outline-variant/10">
                <th className="pb-4 font-normal px-2">Action</th>
                <th className="pb-4 font-normal px-2">Target</th>
                <th className="pb-4 font-normal px-2">Performed By</th>
                <th className="pb-4 font-normal px-2">Timestamp</th>
                <th className="pb-4 font-normal px-2">Details</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface">
              {auditLog.slice(0, 10).map((entry, i) => (
                <tr key={i} className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors">
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-sm font-bold ${
                      entry.action.includes('CREATED') ? 'bg-emerald-500/10 text-emerald-600' :
                      entry.action.includes('UPDATED') ? 'bg-primary/10 text-primary' :
                      entry.action.includes('DEACTIVATED') ? 'bg-error-container text-on-error-container' :
                      entry.action.includes('ACTIVATED') ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>{entry.action}</span>
                  </td>
                  <td className="py-3 px-2 font-bold">{entry.target}</td>
                  <td className="py-3 px-2 opacity-70">{entry.by}</td>
                  <td className="py-3 px-2 opacity-70">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-2 opacity-70 max-w-[200px] truncate">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </>
  );
}
