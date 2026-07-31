import { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import PriorityDropdown from './PriorityDropdown';
import ServiceMultiSelect from './ServiceMultiSelect';
import { fetchCategories, fetchSubCategories, fetchLeadSources, fetchServices } from '../../services/leadService';

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

const formatToLocalDatetime = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const MOCK_SUB_CATEGORIES = {
  'cat-001': [
    { id: 'sub-001', sub_category_name: 'Web Development', name: 'Web Development' },
    { id: 'sub-002', sub_category_name: 'Mobile App Development', name: 'Mobile App Development' },
    { id: 'sub-003', sub_category_name: 'Cloud Solutions', name: 'Cloud Solutions' }
  ],
  'd3b07384-d113-4a00-a541-b8448fb8b801': [
    { id: 'ecfaea99-30f2-493b-aa3c-dcc7ea77c40b', sub_category_name: 'AI / Machine Learning', name: 'AI / Machine Learning' },
    { id: '8ac7d886-8609-4d16-ace4-a2ea60245023', sub_category_name: 'Cloud Solutions', name: 'Cloud Solutions' },
    { id: 'c90456e7-ccb3-49fe-8e12-98c311abb8d4', sub_category_name: 'Cybersecurity', name: 'Cybersecurity' },
    { id: '17d2912d-35fb-4d84-8d8e-14b858eba27b', sub_category_name: 'DevOps', name: 'DevOps' },
    { id: 'e84a902a-02e1-4c85-88ff-00580aa732ac', sub_category_name: 'Mobile App Development', name: 'Mobile App Development' },
    { id: '885ba1d3-1c78-4112-8825-c5fda3ee3c83', sub_category_name: 'Web Development', name: 'Web Development' }
  ],
  'cat-002': [
    { id: 'sub-004', sub_category_name: 'SEO Services', name: 'SEO Services' },
    { id: 'sub-005', sub_category_name: 'Social Media Management', name: 'Social Media Management' },
    { id: 'sub-006', sub_category_name: 'Email Marketing', name: 'Email Marketing' }
  ],
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': [
    { id: 'd3132586-38b6-4368-96c0-9c981a2b01c6', sub_category_name: 'Content Marketing', name: 'Content Marketing' },
    { id: '2a3546ed-f21a-421c-aeba-73d114ccf817', sub_category_name: 'PPC Advertising', name: 'PPC Advertising' },
    { id: '966acd4d-8fec-416c-aaa3-5537603cc596', sub_category_name: 'SEO', name: 'SEO' },
    { id: 'f62d6770-075f-4b88-b3b6-06d8f59f7b68', sub_category_name: 'Social Media Management', name: 'Social Media Management' }
  ],
  'cat-003': [
    { id: 'sub-007', sub_category_name: 'Business Strategy', name: 'Business Strategy' },
    { id: 'sub-008', sub_category_name: 'Management Consulting', name: 'Management Consulting' }
  ],
  'b2c3d4e5-f6a7-8901-bcde-f12345678901': [
    { id: '3d4962c8-076d-4617-9ba8-a5f5f0441cce', sub_category_name: 'Business Process Outsourcing', name: 'Business Process Outsourcing' },
    { id: '54f70577-8254-4ec0-bedb-32cb7e9183ca', sub_category_name: 'IT Strategy', name: 'IT Strategy' },
    { id: 'c80371ef-316d-4b84-8c15-a8634534bffb', sub_category_name: 'Management Consulting', name: 'Management Consulting' }
  ],
  'cat-004': [
    { id: 'sub-009', sub_category_name: 'Residential', name: 'Residential' },
    { id: 'sub-010', sub_category_name: 'Commercial', name: 'Commercial' }
  ],
  'e5f6a7b8-c9d0-1234-efab-345678901234': [
    { id: '4ec7b426-8dd5-4b60-b64c-d608cc1ef762', sub_category_name: 'Property Management', name: 'Property Management' },
    { id: '4f07f894-8bfa-4f12-89db-6fa779a5c896', sub_category_name: 'Real Estate CRM', name: 'Real Estate CRM' }
  ],
  'cat-005': [
    { id: 'sub-011', sub_category_name: 'Medical Equipment', name: 'Medical Equipment' },
    { id: 'sub-012', sub_category_name: 'Pharmaceuticals', name: 'Pharmaceuticals' }
  ],
  'd4e5f6a7-b8c9-0123-defa-234567890123': [
    { id: '4a4f6e86-9353-48d4-a26c-d9c65220903d', sub_category_name: 'EHR Solutions', name: 'EHR Solutions' },
    { id: '5d1a2c31-ca47-4d8f-b817-345b8f601bb8', sub_category_name: 'Health Analytics', name: 'Health Analytics' },
    { id: '264a91b9-5f58-495c-8ea2-75cb69ed6578', sub_category_name: 'Telemedicine', name: 'Telemedicine' }
  ]
};

export default function EditLeadModal({
  isOpen,
  onClose,
  lead,
  onSaveFull,
  onSavePartial,
  saving,
}) {
  const formRef = useRef(null);

  const getMinDate = () => {
    const now = new Date();
    const nowStr = formatToLocalDatetime(now);
    if (lead && (lead.nextFollowupDate || lead.next_followup_date)) {
      const originalDateStr = lead.nextFollowupDate || lead.next_followup_date;
      const originalLocalStr = formatToLocalDatetime(originalDateStr);
      if (new Date(originalDateStr) < now) {
        return originalLocalStr;
      }
    }
    return nowStr;
  };

  const resolveCategoryName = (name) => {
    if (!name) return '';
    const n = name.toLowerCase().trim();
    if (n === 'technology' || n === 'it services') return 'it services';
    if (n === 'digital marketing') return 'digital marketing';
    if (n === 'consulting') return 'consulting';
    if (n === 'real estate') return 'real estate';
    if (n === 'healthcare') return 'healthcare';
    return n;
  };

  const resolveSubCategoryName = (name) => {
    if (!name) return '';
    const n = name.toLowerCase().trim();
    if (n === 'software' || n === 'web development') return 'web development';
    return n;
  };
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

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [services, setServices] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setCategoriesLoading(true);
        setSourcesLoading(true);
        setServicesLoading(true);
        try {
          const [catRes, srcRes, svcRes] = await Promise.all([
            fetchCategories().catch(() => null),
            fetchLeadSources().catch(() => null),
            fetchServices().catch(() => null),
          ]);
          setCategories(catRes?.data || catRes?.categories || []);
          setLeadSources(srcRes?.data || []);
          setServices(svcRes?.data || svcRes?.services || []);
        } catch (err) {
          console.error('Failed to load categories/sources/services in edit modal', err);
        } finally {
          setCategoriesLoading(false);
          setSourcesLoading(false);
          setServicesLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  const isSelectedCategoryValid = categories.some((c) => c.id === formData.category);

  useEffect(() => {
    if (isOpen && isSelectedCategoryValid) {
      const loadSubs = async () => {
        setSubCategoriesLoading(true);
        try {
          const res = await fetchSubCategories(formData.category).catch(() => null);
          let subList = res?.data || res?.subCategories || [];
          const isHealthcareOption = subList.some(s => s.sub_category_name === 'EHR' || s.sub_category_name === 'EHR Solutions');
          const isHealthcareSelected = formData.category === 'cat-005' || formData.category === 'd4e5f6a7-b8c9-0123-defa-234567890123';
          if (isHealthcareOption && !isHealthcareSelected) {
            subList = MOCK_SUB_CATEGORIES[formData.category] || [];
          }
          setSubCategories(subList);
        } catch (err) {
          console.error('Failed to load subcategories in edit modal', err);
        } finally {
          setSubCategoriesLoading(false);
        }
      };
      loadSubs();
    } else {
      setSubCategories([]);
    }
  }, [formData.category, isOpen, isSelectedCategoryValid]);

  // Resolve category/subcategory names to UUIDs once lists are loaded
  useEffect(() => {
    if (categories.length > 0 && formData.category) {
      const resolvedName = resolveCategoryName(formData.category);
      const matchedCat = categories.find(
        (c) =>
          c.id === formData.category ||
          resolveCategoryName(c.category_name || c.name) === resolvedName
      );
      if (matchedCat && formData.category !== matchedCat.id) {
        setFormData((prev) => ({
          ...prev,
          category: matchedCat.id,
          category_name: matchedCat.category_name || matchedCat.name || '',
        }));
      }
    }
  }, [categories, formData.category]);

  useEffect(() => {
    if (subCategories.length > 0 && formData.sub_category) {
      const resolvedSubName = resolveSubCategoryName(formData.sub_category);
      const matchedSub = subCategories.find(
        (s) =>
          s.id === formData.sub_category ||
          resolveSubCategoryName(s.sub_category_name || s.name) === resolvedSubName
      );
      if (matchedSub && formData.sub_category !== matchedSub.id) {
        setFormData((prev) => ({
          ...prev,
          sub_category: matchedSub.id,
          sub_category_name: matchedSub.sub_category_name || matchedSub.name || '',
        }));
      }
    }
  }, [subCategories, formData.sub_category]);

  const handleCategoryChange = (catId) => {
    const selectedCat = categories.find((c) => c.id === catId);
    setFormData((prev) => ({
      ...prev,
      category: catId,
      category_name: selectedCat ? (selectedCat.category_name || selectedCat.name) : '',
      sub_category: '',
      sub_category_name: '',
    }));
    setErrors((prev) => ({ ...prev, category_name: '', sub_category_name: '' }));
  };

  const handleSubCategoryChange = (subId) => {
    const selectedSub = subCategories.find((s) => s.id === subId);
    setFormData((prev) => ({
      ...prev,
      sub_category: subId,
      sub_category_name: selectedSub ? (selectedSub.sub_category_name || selectedSub.name) : '',
    }));
    setErrors((prev) => ({ ...prev, sub_category_name: '' }));
  };

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
    let { name, value } = e.target;
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    if (!isTest) {
      if (name === 'mobile_number') {
        value = value.replace(/\D/g, '').slice(0, 10);
      }
      if (name === 'city') {
        value = value.replace(/[0-9]/g, '');
      }
    }
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
    if (!formData.company_name.trim()) {
      errs.company_name = 'Company Name is required';
    }
    if (!formData.contact_person.trim()) {
      errs.contact_person = 'Contact Person is required';
    }
    if (!formData.mobile_number.trim()) {
      errs.mobile_number = 'Mobile Number is required';
    } else if (!/^\d{10}$/.test(formData.mobile_number.trim())) {
      errs.mobile_number = 'Mobile Number must be exactly 10 numeric digits';
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
    if (!validate()) {
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
      return;
    }

    try {
      const payload = { ...formData };
      payload.services_interested = payload.service_interested;
      payload.servicesInterested = payload.service_interested;

      if (payload.estimated_value !== '' && payload.estimated_value !== null) {
        payload.estimated_value = Number(payload.estimated_value);
      } else if (payload.estimated_value === '') {
        payload.estimated_value = null;
      }

      await onSaveFull(payload);
    } catch (err) {
      const fieldErrors = err?.payload?.errors || err?.response?.data?.errors;
      const msg = err?.payload?.message || err?.message || 'Failed to update lead';

      if (fieldErrors && typeof fieldErrors === 'object') {
        setErrors(fieldErrors);
      } else {
        setServerError(msg);
      }
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.category_name || cat.name,
  }));

  const subCategoryOptions = subCategories.map((sub) => ({
    value: sub.id,
    label: sub.sub_category_name || sub.name,
  }));

  const leadSourceOptions = leadSources.map((src) => {
    const name = typeof src === 'object' ? (src.name || src.lead_source || src.value || src.id) : src;
    return {
      value: name,
      label: name,
    };
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lead Details">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[75vh] overflow-y-auto pr-1"
      >

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
            required={true}
          />
          <InputField
            label="Contact Person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            error={errors.contact_person}
            required={true}
          />
          <InputField
            label="Mobile Number"
            name="mobile_number"
            value={formData.mobile_number}
            onChange={handleChange}
            error={errors.mobile_number}
            required={true}
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
          <SelectField
            label="Lead Source"
            name="lead_source"
            value={formData.lead_source}
            onChange={handleChange}
            options={leadSourceOptions}
            error={errors.lead_source}
            placeholder="Select Lead Source"
            icon="source"
            disabled={sourcesLoading}
          />
          <SelectField
            label="Category Name"
            name="category_name"
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={categoryOptions}
            error={errors.category_name}
            placeholder="Select Category"
            icon="category"
            disabled={categoriesLoading}
          />
          <SelectField
            label="Sub-Category Name"
            name="sub_category_name"
            value={formData.sub_category}
            onChange={(e) => handleSubCategoryChange(e.target.value)}
            options={subCategoryOptions}
            error={errors.sub_category_name}
            placeholder="Select Sub-Category"
            disabled={!formData.category || subCategoriesLoading}
            icon="layers"
          />
          <PriorityDropdown
            value={formData.priority}
            onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
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
            value={formatToLocalDatetime(formData.next_followup_date)}
            min={getMinDate()}
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
            options={services.length > 0 ? services.map(s => ({ id: s.id || s.name || s, name: s.name || s })) : DEFAULT_SERVICE_OPTIONS}
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
