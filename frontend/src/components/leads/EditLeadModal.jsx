import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import InputField from '../common/InputField';
import PriorityDropdown from './PriorityDropdown';
import ServiceMultiSelect from './ServiceMultiSelect';

const VALID_PRIORITIES = ['Hot', 'Warm', 'Cold'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SERVICE_OPTIONS = [
  { id: 'Web Development', name: 'Web Development' },
  { id: 'SEO', name: 'SEO' },
  { id: 'Mobile App Development', name: 'Mobile App Development' },
  { id: 'Cloud Solutions', name: 'Cloud Solutions' },
  { id: 'Digital Marketing', name: 'Digital Marketing' },
  { id: 'Consulting', name: 'Consulting' },
  { id: 'Social Media Management', name: 'Social Media Management' },
];

export default function EditLeadModal({
  isOpen,
  onClose,
  lead,
  onSaveFull,
  onSavePartial,
  saving,
}) {
  const [updateType, setUpdateType] = useState('full'); // 'full' (PUT) or 'partial' (PATCH)
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    mobile_number: '',
    email: '',
    website: '',
    city: '',
    lead_source: '',
    category_name: '',
    sub_category_name: '',
    category: '',
    sub_category: '',
    service_interested: [],
    priority: '',
    estimated_value: '',
    next_followup_date: '',
    remarks: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (lead && isOpen) {
      const catName = lead.category_name || lead.categoryName || lead.category || '';
      const subCatName = lead.sub_category_name || lead.subCategoryName || lead.sub_category || '';

      const rawServices = lead.servicesInterested || lead.services_interested || lead.service_interested || [];
      let service_interested = [];
      if (Array.isArray(rawServices)) {
        service_interested = rawServices;
      } else if (typeof rawServices === 'string') {
        try {
          const parsed = JSON.parse(rawServices);
          if (Array.isArray(parsed)) service_interested = parsed;
          else service_interested = [rawServices];
        } catch {
          service_interested = rawServices.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }

      setFormData({
        company_name: lead.companyName || lead.company_name || '',
        contact_person: lead.contactPerson || lead.contact_person || '',
        mobile_number: lead.mobileNumber || lead.mobile_number || '',
        email: lead.email || '',
        website: lead.website || '',
        city: lead.city || '',
        lead_source: lead.source || lead.lead_source || '',
        category_name: catName,
        sub_category_name: subCatName,
        category: lead.category || lead.categoryId || catName,
        sub_category: lead.sub_category || lead.subCategoryId || subCatName,
        service_interested: service_interested,
        priority: lead.priority || '',
        estimated_value: lead.estimatedValue || lead.estimated_value || '',
        next_followup_date: lead.nextFollowupDate || lead.next_followup_date || '',
        remarks: lead.remarks || '',
      });
      setErrors({});
      setServerError('');
    }
  }, [lead, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextData = { ...prev, [name]: value };
      if (name === 'category_name') {
        nextData.category = value;
      }
      if (name === 'sub_category_name') {
        nextData.sub_category = value;
      }
      return nextData;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (updateType === 'full' || formData.company_name !== '') {
      if (!formData.company_name.trim()) errs.company_name = 'Company Name is required';
    }
    if (updateType === 'full' || formData.contact_person !== '') {
      if (!formData.contact_person.trim()) errs.contact_person = 'Contact Person is required';
    }
    if (updateType === 'full' || formData.mobile_number !== '') {
      if (!formData.mobile_number.trim()) {
        errs.mobile_number = 'Mobile Number is required';
      } else if (!/^\d{10}$/.test(formData.mobile_number.trim())) {
        errs.mobile_number = 'Mobile Number must be exactly 10 numeric digits';
      }
    }
    if (formData.email && formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) {
      errs.email = 'Invalid email format';
    }
    if (formData.priority && !VALID_PRIORITIES.includes(formData.priority)) {
      errs.priority = 'Priority must be one of: Hot, Warm, Cold';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    try {
      const payload = { ...formData };
      payload.services_interested = payload.service_interested;
      payload.servicesInterested = payload.service_interested;

      if (payload.estimated_value !== '' && payload.estimated_value !== null) {
        payload.estimated_value = Number(payload.estimated_value);
      } else if (payload.estimated_value === '') {
        payload.estimated_value = null;
      }

      if (updateType === 'full') {
        await onSaveFull(payload);
      } else {
        await onSavePartial(payload);
      }
    } catch (err) {
      const fieldErrors = err?.payload?.errors || err?.response?.data?.errors;
      const msg = err?.payload?.message || err?.message || 'Failed to update lead';

      if (fieldErrors && typeof fieldErrors === 'object') {
        setErrors(fieldErrors);
      } else {
        setServerError(msg);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lead Details">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Segmented Control / Update Mode Switcher */}
        <div className="flex items-center p-1 bg-surface-container-low rounded-xl border border-outline-variant/20 mb-4">
          <button
            type="button"
            onClick={() => setUpdateType('full')}
            className={`flex-1 py-1.5 px-3 text-label-md font-label-md rounded-lg transition-all ${
              updateType === 'full'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Full Update
          </button>
          <button
            type="button"
            onClick={() => setUpdateType('partial')}
            className={`flex-1 py-1.5 px-3 text-label-md font-label-md rounded-lg transition-all ${
              updateType === 'partial'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Quick Edit
          </button>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-error">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <p className="font-label-sm text-label-sm">{serverError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            error={errors.company_name}
            required={updateType === 'full'}
          />
          <InputField
            label="Contact Person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            error={errors.contact_person}
            required={updateType === 'full'}
          />
          <InputField
            label="Mobile Number"
            name="mobile_number"
            value={formData.mobile_number}
            onChange={handleChange}
            error={errors.mobile_number}
            required={updateType === 'full'}
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />
          <InputField
            label="Website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            error={errors.website}
          />
          <InputField
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            error={errors.city}
          />
          <InputField
            label="Lead Source"
            name="lead_source"
            value={formData.lead_source}
            onChange={handleChange}
            error={errors.lead_source}
          />
          <InputField
            label="Category Name"
            name="category_name"
            value={formData.category_name}
            onChange={handleChange}
            error={errors.category_name}
          />
          <InputField
            label="Sub-Category Name"
            name="sub_category_name"
            value={formData.sub_category_name}
            onChange={handleChange}
            error={errors.sub_category_name}
          />
          <PriorityDropdown
            value={formData.priority}
            onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
            error={errors.priority}
          />
          <InputField
            label="Estimated Value"
            name="estimated_value"
            type="number"
            value={formData.estimated_value}
            onChange={handleChange}
            error={errors.estimated_value}
          />
          <InputField
            label="Next Follow-up Date"
            name="next_followup_date"
            type="datetime-local"
            value={formData.next_followup_date ? new Date(formData.next_followup_date).toISOString().slice(0, 16) : ''}
            onChange={handleChange}
            error={errors.next_followup_date}
          />
        </div>

        <div className="pt-1">
          <ServiceMultiSelect
            selected={formData.service_interested}
            onChange={(newServices) =>
              setFormData((prev) => ({
                ...prev,
                service_interested: newServices,
                services_interested: newServices,
                servicesInterested: newServices,
              }))
            }
            options={DEFAULT_SERVICE_OPTIONS}
            error={errors.service_interested}
          />
        </div>

        <InputField
          label="Remarks"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          error={errors.remarks}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Saving Changes...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
