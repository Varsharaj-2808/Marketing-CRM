import { useEffect, useState } from 'react';
import { fetchCategories, fetchSubCategories } from '../../services/leadService';

const FILTER_OPTIONS = {
  status: ['Won', 'Lost'],
  stage: ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Follow-up', 'Negotiation', 'Demo Scheduled', 'Closed'],
  source: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Event'],
  priority: ['High', 'Medium', 'Low', 'Hot', 'Warm', 'Cold'],
};

const ORIGINAL_CATEGORIES = ['IT Services', 'Digital Marketing', 'Consulting', 'Real Estate', 'Healthcare'];

function SelectFilter({ id, label, value, options, onChange, disabled, onFocus, onClick }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
      {label}
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onClick={onClick}
        disabled={disabled}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">All</option>
        {options.map((option) => {
          const val = typeof option === 'object' ? option.value : option;
          const lbl = typeof option === 'object' ? option.label : option;
          return (
            <option key={val} value={val}>{lbl}</option>
          );
        })}
      </select>
    </label>
  );
}

export default function FilterPanel({ filters, isAdmin, onChange, onClear }) {
  const [categoriesList, setCategoriesList] = useState([]);
  const [subCategoriesList, setSubCategoriesList] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const loadCategoriesLazy = async () => {
    if (categoriesLoaded) return;
    try {
      const res = await fetchCategories({ status: 'Active' });
      if (res.success) {
        setCategoriesList(res.data || []);
        setCategoriesLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching categories in filter panel', err);
    }
  };

  useEffect(() => {
    if (filters.category && !categoriesLoaded) {
      loadCategoriesLazy();
    }
  }, [filters.category, categoriesLoaded]);

  useEffect(() => {
    if (!filters.category) {
      setSubCategoriesList([]);
      return;
    }
    async function loadSubCategories() {
      try {
        const res = await fetchSubCategories(filters.category, { status: 'Active' });
        if (res.success) {
          setSubCategoriesList(res.data || []);
        }
      } catch (err) {
        console.error('Error fetching sub-categories in filter panel', err);
      }
    }
    loadSubCategories();
  }, [filters.category]);

  const update = (key, value) => onChange({ ...filters, [key]: value });

  const handleCategoryChange = (catId) => {
    onChange({
      ...filters,
      category: catId,
      subCategory: '',
    });
  };

  const categoryOptions = [
    ...ORIGINAL_CATEGORIES.map(cat => ({ value: cat, label: cat })),
    ...categoriesList.map(cat => ({
      value: cat.id,
      label: cat.category_name || cat.name
    }))
  ];

  const subCategoryOptions = subCategoriesList.map(sub => ({
    value: sub.id,
    label: sub.sub_category_name || sub.name
  }));

  return (
    <div className="grid grid-cols-1 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-xs sm:grid-cols-2 lg:grid-cols-4">
      <SelectFilter id="status-filter" label="Status" value={filters.status} options={FILTER_OPTIONS.status} onChange={(value) => update('status', value)} />
      <SelectFilter id="stage-filter" label="Stage" value={filters.stage} options={FILTER_OPTIONS.stage} onChange={(value) => update('stage', value)} />
      <SelectFilter id="source-filter" label="Source" value={filters.source} options={FILTER_OPTIONS.source} onChange={(value) => update('source', value)} />
      <SelectFilter id="category-filter" label="Category" value={filters.category} options={categoryOptions} onChange={handleCategoryChange} onFocus={loadCategoriesLazy} onClick={loadCategoriesLazy} />
      <SelectFilter
        id="subcategory-filter"
        label="Sub-Category"
        value={filters.subCategory || ''}
        options={subCategoryOptions}
        onChange={(value) => update('subCategory', value)}
        disabled={!filters.category}
      />
      <SelectFilter id="priority-filter" label="Priority" value={filters.priority} options={FILTER_OPTIONS.priority} onChange={(value) => update('priority', value)} />
      {isAdmin && (
        <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Assigned To
          <input
            aria-label="Assigned To"
            value={filters.assignedTo}
            onChange={(event) => update('assignedTo', event.target.value)}
            placeholder="Name or employee ID"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
          />
        </label>
      )}
      <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
        From Date
        <input
          aria-label="From Date"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => update('dateFrom', event.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') {
              e.preventDefault();
            }
          }}
          onClick={(e) => {
            try {
              e.target.showPicker();
            } catch (err) {}
          }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
        To Date
        <input
          aria-label="To Date"
          type="date"
          value={filters.dateTo}
          onChange={(event) => update('dateTo', event.target.value)}
          min={filters.dateFrom || undefined}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') {
              e.preventDefault();
            }
          }}
          onClick={(e) => {
            try {
              e.target.showPicker();
            } catch (err) {}
          }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
        />
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={onClear}
          className="h-10 w-full rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
