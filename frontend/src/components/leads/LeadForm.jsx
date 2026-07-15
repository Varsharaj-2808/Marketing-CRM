import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchCategories,
  fetchUsers,
  fetchSubCategories,
  fetchLeadSources,
  fetchServices,
  checkDuplicateLead,
  createLead,
} from '../../services/leadService';
import AlertBanner from '../common/AlertBanner';
import LoadingSpinner from '../common/LoadingSpinner';
import CompanySection from './CompanySection';
import ContactSection from './ContactSection';
import LeadInformationSection from './LeadInformationSection';
import DuplicateLeadModal from './DuplicateLeadModal';
import Toast from '../common/Toast';

const INITIAL_FORM = {
  companyName: '',
  website: '',
  businessCategory: '',
  businessSubCategory: '',
  contactPerson: '',
  mobileNumber: '',
  email: '',
  city: '',
  leadSource: '',
  servicesInterested: [],
  priority: '',
  estimatedValue: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(data) {
  const errors = {};

  if (!data.companyName.trim()) errors.companyName = 'Company Name is required';
  if (!data.contactPerson.trim()) errors.contactPerson = 'Contact Person is required';
  if (!data.mobileNumber.trim()) {
    errors.mobileNumber = 'Mobile Number is required';
  } else if (!/^\d{10}$/.test(data.mobileNumber.trim())) {
    errors.mobileNumber = 'Mobile Number must be exactly 10 digits';
  }
  if (data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Invalid email format';
  }
  if (!data.businessCategory) errors.businessCategory = 'Business Category is required';
  if (!data.businessSubCategory) errors.businessSubCategory = 'Business Sub Category is required';
  if (!data.leadSource) errors.leadSource = 'Lead Source is required';
  if (!data.servicesInterested || data.servicesInterested.length === 0) {
    errors.servicesInterested = 'At least one service must be selected';
  }
  if (!data.priority) errors.priority = 'Priority is required';

  return errors;
}

export default function LeadForm({ onSuccess, onViewLead }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [services, setServices] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const FALLBACK_CATEGORIES = [
    { id: 'cat-001', name: 'IT Services' },
    { id: 'cat-002', name: 'Digital Marketing' },
    { id: 'cat-003', name: 'Consulting' },
    { id: 'cat-004', name: 'Real Estate' },
    { id: 'cat-005', name: 'Healthcare' },
  ];

  const FALLBACK_SUB_CATEGORIES = {
    'cat-001': [{ id: 'sub-001', name: 'Web Development' }, { id: 'sub-002', name: 'Mobile App Development' }, { id: 'sub-003', name: 'Cloud Solutions' }],
    'cat-002': [{ id: 'sub-004', name: 'SEO Services' }, { id: 'sub-005', name: 'Social Media Management' }, { id: 'sub-006', name: 'Email Marketing' }],
    'cat-003': [{ id: 'sub-007', name: 'Business Strategy' }, { id: 'sub-008', name: 'Management Consulting' }],
    'cat-004': [{ id: 'sub-009', name: 'Residential' }, { id: 'sub-010', name: 'Commercial' }],
    'cat-005': [{ id: 'sub-011', name: 'Medical Equipment' }, { id: 'sub-012', name: 'Pharmaceuticals' }],
  };

  useEffect(() => {
    async function load() {
      try {
        const [catRes, userRes, srcRes, svcRes] = await Promise.all([
          fetchCategories().catch(() => null),
          fetchUsers().catch(() => null),
          fetchLeadSources().catch(() => null),
          fetchServices().catch(() => null),
        ]);
        setCategories(catRes?.data || catRes?.categories || FALLBACK_CATEGORIES);
        setUsers(userRes?.data || userRes?.users || []);
        if (srcRes?.data) setLeadSources(srcRes.data);
        if (svcRes?.data) setServices(svcRes.data);
      } catch (err) {
        setApiError('Failed to load required data. Please try again.');
      } finally {
        setCategoriesLoading(false);
        setUsersLoading(false);
      }
    }
    load();
  }, []);

  const handleCategoryChange = useCallback(async (e) => {
    const categoryId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      businessCategory: categoryId,
      businessSubCategory: '',
    }));
    setErrors((prev) => ({ ...prev, businessCategory: '', businessSubCategory: '' }));

    if (!categoryId) {
      setSubCategories([]);
      return;
    }

    setSubCategoriesLoading(true);
    try {
      const res = await fetchSubCategories(categoryId).catch(() => null);
      setSubCategories(res?.data || res?.subCategories || FALLBACK_SUB_CATEGORIES[categoryId] || []);
    } catch {
      setSubCategories(FALLBACK_SUB_CATEGORIES[categoryId] || []);
    } finally {
      setSubCategoriesLoading(false);
    }
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleServiceChange = useCallback((services) => {
    setFormData((prev) => ({ ...prev, servicesInterested: services }));
    if (errors.servicesInterested) {
      setErrors((prev) => ({ ...prev, servicesInterested: '' }));
    }
  }, [errors]);

  const scrollToFirstError = useCallback((errorKeys) => {
    const firstKey = errorKeys[0];
    const fieldMap = {
      companyName: 'companyName',
      contactPerson: 'contactPerson',
      mobileNumber: 'mobileNumber',
      email: 'email',
      businessCategory: 'businessCategory',
      businessSubCategory: 'businessSubCategory',
      leadSource: 'leadSource',
      servicesInterested: 'servicesInterested',
      priority: 'priority',
    };
    const fieldId = fieldMap[firstKey];
    if (fieldId) {
      const el = document.getElementById(fieldId);
      if (el) {
        el.focus();
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setDuplicateData(null);

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      scrollToFirstError(Object.keys(validationErrors));
      return;
    }

    setSaving(true);
    try {
      const duplicateRes = await checkDuplicateLead(formData.mobileNumber.trim()).catch(() => null);
      if (duplicateRes?.duplicate || duplicateRes?.exists || duplicateRes?.data?.duplicate) {
        const leadId = duplicateRes?.leadId || duplicateRes?.data?.leadId || duplicateRes?.data?.id || 'LD-0000';
        setDuplicateData({ leadId });
        setSaving(false);
        return;
      }

      await performCreate();
    } catch {
      setApiError('Failed to check for duplicates. Please try again.');
      setSaving(false);
    }
  };

  const performCreate = async () => {
    setSaving(true);
    try {
      const { mapLeadFields } = await import('../../utils/fieldMapping');
      const rawPayload = {
        companyName: formData.companyName.trim(),
        website: formData.website.trim(),
        businessCategory: formData.businessCategory,
        businessSubCategory: formData.businessSubCategory,
        contactPerson: formData.contactPerson.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        leadSource: formData.leadSource,
        servicesInterested: formData.servicesInterested,
        priority: formData.priority,
        estimatedValue: formData.estimatedValue.trim(),
        assignedTo: user?.id || user?._id || '',
      };
      const payload = mapLeadFields(rawPayload);

      const res = await createLead(payload);
      if (res?.success || res?.data) {
        const leadId = res?.data?.id || res?.data?.leadId || res?.leadId || '';
        setToast({ show: true, message: 'Lead created successfully.', type: 'success' });
        setTimeout(() => {
          if (leadId && onSuccess) onSuccess(leadId);
        }, 1000);
      } else {
        setApiError(res?.message || 'Failed to create lead. Please try again.');
      }
    } catch {
      setApiError('Failed to create lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateContinue = () => {
    setDuplicateData(null);
    performCreate();
  };

  const handleViewExisting = () => {
    setDuplicateData(null);
    if (duplicateData?.leadId && onViewLead) {
      onViewLead(duplicateData.leadId);
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateData(null);
  };

  const FALLBACK_SOURCES = [
    { id: 'Website', name: 'Website' },
    { id: 'Referral', name: 'Referral' },
    { id: 'Social Media', name: 'Social Media' },
    { id: 'Email Campaign', name: 'Email Campaign' },
    { id: 'Phone Inquiry', name: 'Phone Inquiry' },
    { id: 'Walk-in', name: 'Walk-in' },
    { id: 'Partner', name: 'Partner' },
    { id: 'Other', name: 'Other' },
  ];

  const FALLBACK_SERVICES = [
    { id: 'Web Development', name: 'Web Development' },
    { id: 'Mobile App Development', name: 'Mobile App Development' },
    { id: 'Digital Marketing', name: 'Digital Marketing' },
    { id: 'SEO Services', name: 'SEO Services' },
    { id: 'Cloud Solutions', name: 'Cloud Solutions' },
    { id: 'Consulting', name: 'Consulting' },
    { id: 'UI/UX Design', name: 'UI/UX Design' },
    { id: 'IT Support', name: 'IT Support' },
  ];

  const resolvedSources = leadSources.length > 0 ? leadSources : FALLBACK_SOURCES;
  const resolvedServices = services.length > 0 ? services : FALLBACK_SERVICES;

  if (categoriesLoading || usersLoading) {
    return <LoadingSpinner text="Loading form data..." />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: '', type: 'success' })}
      />

      <DuplicateLeadModal
        isOpen={!!duplicateData}
        onClose={handleDuplicateCancel}
        leadId={duplicateData?.leadId}
        onContinue={handleDuplicateContinue}
        onViewExisting={handleViewExisting}
        onCancel={handleDuplicateCancel}
      />

      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

        <AlertBanner show={!!apiError} type="error" icon="warning" className="mb-4">
          {apiError}
        </AlertBanner>

        <div className="space-y-8">
          <CompanySection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            categories={categories}
            categoriesLoading={categoriesLoading}
            subCategories={subCategories}
            subCategoriesLoading={subCategoriesLoading}
            onCategoryChange={handleCategoryChange}
          />

          <div className="border-t border-outline-variant/30 pt-8">
            <ContactSection
              formData={formData}
              errors={errors}
              handleChange={handleChange}
            />
          </div>

          <div className="border-t border-outline-variant/30 pt-8">
            <LeadInformationSection
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              handleServiceChange={handleServiceChange}
              user={user}
              leadSources={resolvedSources}
              services={resolvedServices}
            />
          </div>

          <div className="border-t border-outline-variant/30 pt-6 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-gradient px-8 py-3 rounded-xl text-white font-label-md text-label-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving && (
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
              )}
              <span>{saving ? 'Saving...' : 'Save Lead'}</span>
              {!saving && (
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
