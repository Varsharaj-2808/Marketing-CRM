import { useState, useEffect } from 'react';

const ROLES = ['Admin', 'Marketing Executive'];

export default function UserFormModal({ isOpen, onClose, onSave, user, existingEmails, existingMobiles }) {
  const [formData, setFormData] = useState({
    employee_name: '',
    mobile: '',
    email: '',
    role: 'Marketing Executive',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
    if (!formData.employee_name.trim()) {
      errs.employee_name = 'Employee Name is required';
    } else if (formData.employee_name.length > 100) {
      errs.employee_name = 'Employee Name exceeds maximum length of 100 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.employee_name)) {
      errs.employee_name = 'Employee Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (!formData.mobile.trim()) {
      errs.mobile = 'Mobile Number is required';
    } else if (!/^\d+$/.test(formData.mobile)) {
      errs.mobile = 'Mobile Number must contain digits only';
    } else if (formData.mobile.trim().length !== 10) {
      errs.mobile = 'Mobile Number must be exactly 10 digits';
    }

    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.role) errs.role = 'Role is required';
    if (!errs.email && existingEmails?.includes(formData.email.toLowerCase()) && (!user || formData.email.toLowerCase() !== user.email.toLowerCase())) {
      errs.email = 'Email already registered';
    }
    if (!errs.mobile && existingMobiles?.includes(formData.mobile) && (!user || formData.mobile !== user.mobile)) {
      errs.mobile = 'Mobile Number already registered';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitting(true);
      try {
        await onSave(formData);
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleChange = (field, value) => {
    let cleanVal = value;
    if (field === 'mobile') {
      cleanVal = value.replace(/\D/g, '');
    }
    setFormData((prev) => ({ ...prev, [field]: cleanVal }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">{user ? 'Edit User' : 'Create New User'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container-high rounded-xl transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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
              disabled={submitting}
              className={`w-full bg-surface-container-low/50 border ${errors.employee_name ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50`}
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
              disabled={submitting}
              maxLength={10}
              className={`w-full bg-surface-container-low/50 border ${errors.mobile ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50`}
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
              disabled={submitting}
              className={`w-full bg-surface-container-low/50 border ${errors.email ? 'border-error' : 'border-outline-variant/30'} rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50`}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-label-sm text-error mt-1">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="emp-role" className="font-label-md text-label-md text-on-surface block">Role</label>
            <select
              id="emp-role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              disabled={submitting}
              className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50"
            >
              <option value="">Select role</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.role && <p className="text-label-sm text-error mt-1">{errors.role}</p>}
          </div>
          <div className="flex items-center gap-3 pt-5 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
