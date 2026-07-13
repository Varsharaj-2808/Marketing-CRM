import { useEffect, useState, useCallback } from 'react';
import { fetchCategories, fetchActiveSubCategories, fetchUsers } from '../../services/leadService';

const FILTER_OPTIONS = {
  status: ['Won', 'Lost'],
  stage: ['New', 'Contacted', 'Qualified', 'Meeting Scheduled', 'Requirement Gathering', 'Proposal Sent', 'Negotiation', 'Hold', 'Closed'],
  source: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Phone Inquiry', 'Walk-in', 'Partner', 'Other'],
  priority: ['Hot', 'Warm', 'Cold'],
};

function SelectFilter({ id, label, value, options, onChange, disabled, onFocus }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
      {label}
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
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
  const [usersList, setUsersList] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const loadCategories = useCallback(async () => {
    if (categoriesLoaded) return;
    try {
      const res = await fetchCategories();
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setCategoriesList(list);
        setCategoriesLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching categories in filter panel', err);
    }
  }, [categoriesLoaded]);

  const loadUsers = useCallback(async () => {
    if (usersLoaded) return;
    try {
      const res = await fetchUsers();
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setUsersList(list);
        setUsersLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching users in filter panel', err);
    }
  }, [usersLoaded]);

  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [usersFetched, setUsersFetched] = useState(false);

  const ensureCategories = () => {
    if (!categoriesFetched) {
      setCategoriesFetched(true);
      loadCategories();
    }
  };

  const ensureUsers = () => {
    if (!usersFetched) {
      setUsersFetched(true);
      loadUsers();
    }
  };

  useEffect(() => {
    if (!filters.category) {
      setSubCategoriesList([]);
      return;
    }
    let cancelled = false;
    async function loadSubCategories() {
      try {
        const res = await fetchActiveSubCategories(filters.category);
        if (!cancelled && res.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setSubCategoriesList(list);
        }
      } catch (err) {
        console.error('Error fetching sub-categories in filter panel', err);
      }
    }
    loadSubCategories();
    return () => { cancelled = true; };
  }, [filters.category]);

  const update = (key, value) => onChange({ ...filters, [key]: value });

  const handleCategoryChange = (catId) => {
    onChange({
      ...filters,
      category: catId,
      subCategory: '',
    });
  };

  const categoryOptions = categoriesList.map(cat => ({
    value: cat.id,
    label: cat.category_name || cat.name,
  }));

  const subCategoryOptions = subCategoriesList.map(sub => ({
    value: sub.id,
    label: sub.sub_category_name || sub.name,
  }));

  const userOptions = usersList.map(u => ({
    value: u.employee_id || u.id,
    label: u.name,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-xs sm:grid-cols-2 lg:grid-cols-4">
      <SelectFilter id="status-filter" label="Status" value={filters.status} options={FILTER_OPTIONS.status} onChange={(value) => update('status', value)} />
      <SelectFilter id="stage-filter" label="Stage" value={filters.stage} options={FILTER_OPTIONS.stage} onChange={(value) => update('stage', value)} />
      <SelectFilter id="source-filter" label="Source" value={filters.source} options={FILTER_OPTIONS.source} onChange={(value) => update('source', value)} />
      <SelectFilter id="category-filter" label="Category" value={filters.category} options={categoryOptions} onChange={handleCategoryChange} onFocus={ensureCategories} />
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
        <SelectFilter
          id="assignedto-filter"
          label="Assigned To"
          value={filters.assignedTo}
          options={userOptions}
          onChange={(value) => update('assignedTo', value)}
          onFocus={ensureUsers}
        />
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
