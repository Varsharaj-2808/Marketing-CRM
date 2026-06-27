import { useState, useEffect } from 'react';

const ROLES = ['Admin', 'Marketing Executive'];
const STATUSES = ['Active', 'Inactive'];

export default function UserFormModal({ isOpen, onClose, onSave, user, existingEmails, existingMobiles }) {
  const [formData, setFormData] = useState({
    employee_name: '',
    mobile: '',
    email: '',
    role: 'Marketing Executive',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        employee_name: user.employee_name || '',
        mobile: user.mobile || '',
        email: user.email || '',
        role: user.role || 'Marketing Executive',
        status: user.status || 'Active',
      });
    } else {
      setFormData({
        employee_name: '',
        mobile: '',
        email: '',
        role: 'Marketing Executive',
        status: 'Active',
      });
    }
    setErrors({});
  }, [user, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.employee_name.trim()) errs.employee_name = 'Employee Name is required';
    else if (formData.employee_name.length > 100) errs.employee_name = 'Employee Name exceeds maximum length of 100 characters';
    if (!formData.mobile.trim()) errs.mobile = 'Mobile Number is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.role) errs.role = 'Role is required';
    if (!formData.status) errs.status = 'Status is required';
    if (!errs.email && existingEmails?.includes(formData.email.toLowerCase()) && (!user || formData.email.toLowerCase() !== user.email.toLowerCase())) {
      errs.email = 'Email already registered';
    }
    if (!errs.mobile && existingMobiles?.includes(formData.mobile) && (!user || formData.mobile !== user.mobile)) {
      errs.mobile = 'Mobile Number already registered';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onSave(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">{user ? 'Edit User' : 'Create New User'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-xl transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {user && (
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface block">Employee ID</label>
              <input
                value={user.employee_id}
                disabled
                className="w-full bg-surface-container-low/30 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md text-on-surface-variant cursor-not-allowed"
              />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="emp-name" className="font-label-md text-label-md text-on-surface block">Employee Name</label>
            <input
              id="emp-name"
              value={formData.employee_name}
              onChange={(e) => handleChange('employee_name', e.target.value)}
              className={`w-full bg-surface-container-low/50 border ${errors.employee_name ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none`}
              placeholder="Enter employee name"
            />
            {errors.employee_name && <p className="text-label-sm text-error mt-1">{errors.employee_name}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="emp-mobile" className="font-label-md text-label-md text-on-surface block">Mobile Number</label>
            <input
              id="emp-mobile"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              className={`w-full bg-surface-container-low/50 border ${errors.mobile ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none`}
              placeholder="Enter mobile number"
            />
            {errors.mobile && <p className="text-label-sm text-error mt-1">{errors.mobile}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="emp-email" className="font-label-md text-label-md text-on-surface block">Email</label>
            <input
              id="emp-email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full bg-surface-container-low/50 border ${errors.email ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none`}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-label-sm text-error mt-1">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="emp-role" className="font-label-md text-label-md text-on-surface block">Role</label>
              <select
                id="emp-role"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="">Select role</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.role && <p className="text-label-sm text-error mt-1">{errors.role}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="emp-status" className="font-label-md text-label-md text-on-surface block">Status</label>
              <select
                id="emp-status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              >
                <option value="">Select status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.status && <p className="text-label-sm text-error mt-1">{errors.status}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
