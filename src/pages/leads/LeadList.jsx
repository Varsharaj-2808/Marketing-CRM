import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchAdminLeads, fetchMarketingLeads, fetchUsers, bulkAssignLeads, fetchSavedViews, createSavedView, deleteSavedView, exportLeads, fetchCategories } from '../../services/leadService';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SkeletonTable from '../../components/common/SkeletonTable';
import FilterPanel from '../../components/leads/FilterPanel';
import LeadTable from '../../components/leads/LeadTable';
import Pagination from '../../components/leads/Pagination';
import SavedViewsPanel, { DEFAULT_SAVED_VIEWS } from '../../components/leads/SavedViewsPanel';
import SearchBar from '../../components/leads/SearchBar';
import Toast from '../../components/common/Toast';
import BulkAssignModal from '../../components/leads/BulkAssignModal';
import ExportModal from '../../components/leads/ExportModal';
import { getLeadField, toDisplayText } from '../../utils/leadDisplay';

const PAGE_SIZE = 25;

const EMPTY_FILTERS = {
  status: '',
  stage: '',
  source: '',
  category: '',
  subCategory: '',
  priority: '',
  assignedTo: '',
  dateFrom: '',
  dateTo: '',
};

function normalizeLead(lead) {
  const id = getLeadField(lead, ['id', '_id', 'leadId', 'lead_id'], '');
  let status = getLeadField(lead, ['lead_status', 'status'], '');
  let stage = getLeadField(lead, ['stage', 'leadStage', 'lead_stage'], '');

  const progressStages = ['New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Closed', 'New Lead'];
  if (progressStages.includes(status) && !stage) {
    stage = status;
  }
  if (status === 'New Lead') {
    stage = 'New';
  }
  if (stage === 'New Lead') {
    stage = 'New';
  }

  return {
    id,
    leadId: getLeadField(lead, ['leadId', 'lead_id', 'id'], 'LD-0000'),
    companyName: getLeadField(lead, ['companyName', 'company_name', 'company'], '-'),
    contactPerson: getLeadField(lead, ['contactPerson', 'contact_person', 'contactName'], '-'),
    mobileNumber: getLeadField(lead, ['mobileNumber', 'mobile_number', 'mobile', 'phone'], '-'),
    status,
    stage: stage || 'New',
    source: getLeadField(lead, ['source', 'leadSource', 'lead_source'], '-'),
    category: getLeadField(lead, ['category_name', 'category', 'businessCategory', 'business_category'], '-'),
    subCategory: getLeadField(lead, ['sub_category_name', 'subCategory', 'businessSubCategory', 'business_sub_category'], '-'),
    priority: lead.priority || lead.quality || lead.lead_quality || '-',
    assignedTo: lead.assignedTo ?? lead.assigned_to ?? null,
    assignedToName: (() => {
      const name = getLeadField(lead, ['assigned_to_name', 'assignedToName'], '');
      const empId = getLeadField(lead, ['assigned_employee_id', 'assignedEmployeeId'], '');
      if (empId && name) return `${empId} (${name})`;
      if (empId) return empId;
      if (name) return name;
      if (lead?.assignedTo && typeof lead.assignedTo === 'object') {
        return lead.assignedTo.name || lead.assignedTo.employee_name || 'Unassigned';
      }
      if (lead?.assigned_to && typeof lead.assigned_to === 'object') {
        return lead.assigned_to.name || lead.assigned_to.employee_name || 'Unassigned';
      }
      if (typeof lead?.assignedTo === 'string') return lead.assignedTo;
      if (typeof lead?.assigned_to === 'string') return lead.assigned_to;
      return 'Unassigned';
    })(),
    createdAt: getLeadField(lead, ['createdAt', 'created_at', 'createdDate', 'created_date'], ''),
    estimatedValue: getLeadField(lead, ['estimatedValue', 'estimated_value', 'value'], ''),
    nextFollowupDate: lead.next_followup_date || lead.nextFollowupDate || '',
    isOverdue: lead.is_overdue ?? lead.isOverdue ?? false,
  };
}

function normalizeListResponse(response) {
  const rawData = response?.data || response?.leads || response?.results || [];
  const data = Array.isArray(rawData) ? rawData : (rawData?.data || []);
  const pagination = response?.pagination || rawData?.pagination || {};
  const total = Number(
    pagination.total ??
    pagination.totalRecords ??
    pagination.total_records ??
    rawData?.totalCount ??
    rawData?.total_count ??
    response?.total ??
    response?.totalCount ??
    data.length
  );
  const totalPages = Number(
    pagination.totalPages ??
    pagination.total_pages ??
    rawData?.totalPages ??
    rawData?.total_pages ??
    response?.totalPages ??
    response?.total_pages ??
    Math.max(1, Math.ceil(total / PAGE_SIZE))
  );

  return {
    leads: Array.isArray(data) ? data.map(normalizeLead) : [],
    totalRecords: Number.isFinite(total) ? total : 0,
    totalPages: Number.isFinite(totalPages) ? totalPages : 1,
  };
}

function buildQuery({ page, search, filters, sort }) {
  const query = { page, limit: PAGE_SIZE };
  if (search.trim().length >= 2) query.search = search.trim();
  if (filters.status) query.status = filters.status;
  if (filters.stage) query.stage = filters.stage;
  if (filters.source) query.source = filters.source;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category_id = filters.category;
  if (filters.subCategory) query.sub_category_id = filters.subCategory;
  if (filters.assignedTo) query.assigned_to = filters.assignedTo;
  if (filters.dateFrom) query.from = filters.dateFrom;
  if (filters.dateTo) query.to = filters.dateTo;
  if (sort.sortBy) {
    query.sortBy = sort.sortBy;
    query.sortOrder = sort.sortOrder;
  }
  return query;
}

export default function LeadList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdmin = user?.role === 'Admin';
  const isMarketingExecutive = user?.role === 'Marketing Executive';

  const [leads, setLeads] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState({ sortBy: '', sortOrder: 'desc' });
  const [savedViews, setSavedViews] = useState(DEFAULT_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastShow, setToastShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const accessDenied = isAdminRoute && !isAdmin;
  const [categoriesMap, setCategoriesMap] = useState({});

  useEffect(() => {
    fetchCategories().then((res) => {
      const list = res?.data?.categories || res?.data || [];
      if (Array.isArray(list)) {
        const map = {};
        list.forEach((c) => { map[c.id] = c.category_name || c.name; });
        setCategoriesMap(map);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setActiveSearch(searchInput.trim().length >= 2 ? searchInput.trim() : '');
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useMemo(
    () => buildQuery({ page, search: activeSearch, filters, sort }),
    [page, activeSearch, filters, sort]
  );

  const loadLeads = useCallback(async () => {
    if (accessDenied) return;
    setLoading(true);
    setError('');
    try {
      const response = isAdmin ? await fetchAdminLeads(query) : await fetchMarketingLeads(query);
      const normalized = normalizeListResponse(response);
      let filteredLeads = normalized.leads;
      let totalRecords = normalized.totalRecords;
      if (!isAdmin && user) {
        const userId = user.id || user.employee_id || user.employeeId;
        filteredLeads = normalized.leads.filter((l) => {
          const assignedId = typeof l.assignedTo === 'object' && l.assignedTo
            ? (l.assignedTo.employee_id || l.assignedTo.id)
            : l.assignedTo || null;
          return assignedId === userId;
        });
        totalRecords = filteredLeads.length;
      }
      setLeads(filteredLeads);
      setTotalPages(Math.max(1, Math.ceil(totalRecords / PAGE_SIZE)));
      setTotalRecords(totalRecords);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const message = err?.message || err?.payload?.message || '';
      if (status === 403 || /access denied/i.test(message)) {
        setError('Access Denied');
      } else {
        setError('Failed to load leads.');
      }
      setLeads([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [accessDenied, isAdmin, query]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);



  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
    setActiveViewId('');
    setPage(1);
  };

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      sortOrder: current.sortBy === sortBy && current.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
    setActiveViewId('');
    setPage(1);
  };

  const handleApplySavedView = (view) => {
    setFilters({ ...EMPTY_FILTERS, ...(view.filters || {}) });
    setSort(view.sort || { sortBy: '', sortOrder: 'desc' });
    setSearchInput(view.search || '');
    setActiveSearch(view.search || '');
    setActiveViewId(view.id);
    setPage(1);
  };

  const handleSaveCurrentView = async (nameOverride) => {
    const promptName = nameOverride || window.prompt('View name', activeSearch || filters.priority || filters.status ? 'Current Lead View' : 'My Lead View');
    const name = promptName?.trim();
    if (!name) return;
    const res = await createSavedView({ name, filters, sort, search: activeSearch });
    const newView = res?.data || res || { id: `view-${Date.now()}`, name, filters, sort, search: activeSearch };
    const view = {
      id: newView.id || newView._id || `view-${Date.now()}`,
      name: newView.name || name,
      filters: newView.filters || filters,
      sort: newView.sort || sort,
      search: newView.search || activeSearch,
    };
    setSavedViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
    setToastMessage('Saved View created successfully.');
    setToastType('success');
    setToastShow(true);
  };

  const handleUpdateSavedView = async (viewId, nameOverride) => {
    const name = nameOverride?.trim();
    if (!name) return;
    setSavedViews((prev) => prev.map((view) => (view.id === viewId ? {
      ...view,
      name,
      filters,
      sort,
      search: activeSearch,
    } : view)));
    setActiveViewId(viewId);
  };

  const handleDeleteSavedView = async (viewId) => {
    await deleteSavedView(viewId);
    setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
    if (activeViewId === viewId) setActiveViewId('');
  };

  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [page, activeSearch, filters]);

  const handleToggleSelect = (id) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedLeadIds((prev) => {
      const allIds = leads.map((l) => l.id);
      const allSelected = allIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleClearSelection = () => setSelectedLeadIds(new Set());

  const selectedCount = selectedLeadIds.size;

  const handleBulkReassign = () => {
    setReassignModalOpen(true);
  };

  const handleConfirmReassign = async (assignedTo, reason, userName) => {
    setReassigning(true);
    try {
      const leadIds = Array.from(selectedLeadIds);
      const res = await bulkAssignLeads(leadIds, assignedTo, reason);
      setReassignModalOpen(false);
      handleClearSelection();
      const count = res?.count || leadIds.length;
      setToastMessage(`${count} lead${count > 1 ? 's' : ''} assigned to ${userName}`);
      setToastType('success');
      setToastShow(true);
      loadLeads();
    } catch (err) {
      if (err?.status === 400) {
        setToastMessage('Reassignment reason is required as one or more leads already have an owner.');
      } else {
        setToastMessage('Failed to assign leads. Please try again.');
      }
      setToastType('error');
      setToastShow(true);
    } finally {
      setReassigning(false);
    }
  };

  const handleBulkExport = () => {
    const selectedLeads = leads.filter((l) => selectedLeadIds.has(l.id));
    const csv = [
      ['Lead ID', 'Company Name', 'Contact Person', 'Mobile', 'Status', 'Stage', 'Source', 'Category', 'Priority', 'Assigned To', 'Created Date', 'Estimated Value'].join(','),
      ...selectedLeads.map((l) =>
        [l.leadId, l.companyName, l.contactPerson, l.mobileNumber, l.status, l.stage, l.source, l.category, l.priority, l.assignedToName, l.createdAt, l.estimatedValue].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    handleClearSelection();
  };

  const handleExportFiltered = async (format) => {
    setExporting(true);
    try {
      const q = buildQuery({ page: 1, search: activeSearch, filters, sort });
      const exportParams = {
        format: format || (isAdmin ? 'csv' : 'excel'),
        category_id: q.category_id || '',
        sub_category_id: q.sub_category_id || '',
        status: q.status || '',
        quality: q.priority || '',
        stage: q.stage || '',
        from: q.from || '',
        to: q.to || '',
      };
      
      const blob = await exportLeads(exportParams, isAdmin);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setToastMessage('Leads exported successfully.');
      setToastType('success');
      setToastShow(true);
    } catch (err) {
      setToastMessage(err?.message || 'Failed to export leads.');
      setToastType('error');
      setToastShow(true);
    } finally {
      setExporting(false);
    }
  };

  const handleOpenLead = (leadId) => {
    navigate(`${isAdmin ? '/admin' : '/marketing'}/leads/${leadId}`);
  };

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-error/20 bg-white/70 p-8 text-center">
          <h1 className="text-headline-md font-headline-md text-error">Access Denied</h1>
        </div>
      </div>
    );
  }

  const pageTitle = isAdmin ? 'All Leads' : 'My Leads';
  const subtitle = totalRecords === 1 ? '1 matching record' : `${totalRecords} matching records`;

  return (
    <div className="mx-auto max-w-[1500px] px-2 py-4 sm:px-4 sm:py-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
          <div className="flex w-full items-center gap-2 lg:max-w-xl">
            <div className="flex-1">
              <SearchBar value={searchInput} onChange={setSearchInput} />
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExportFiltered('csv')}
                    style={{ display: 'none' }}
                    className="h-10 rounded-lg border border-slate-200 bg-white/70 px-4 text-xs font-semibold text-slate-705 hover:bg-white transition-all whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    id="export-filtered-btn"
                    onClick={() => setExportModalOpen(true)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shadow-xs"
                  >
                    Export
                  </button>
                </>
              )}
              {(isAdmin || isMarketingExecutive) && (
                <button
                  type="button"
                  onClick={() => navigate(`${isAdminRoute ? '/admin' : '/marketing'}/leads/create`)}
                  className="inline-flex items-center justify-center h-10 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold hover:opacity-95 px-4 transition-colors whitespace-nowrap shadow-xs"
                >
                  Create Lead
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-5">
          {isAdmin && (
            <div className="mb-4">
              <SavedViewsPanel
                views={savedViews}
                activeViewId={activeViewId}
                onApplyView={handleApplySavedView}
                onSaveView={handleSaveCurrentView}
                onUpdateView={handleUpdateSavedView}
                onDeleteView={handleDeleteSavedView}
              />
            </div>
          )}
          <FilterPanel
            filters={filters}
            isAdmin={isAdmin}
            onChange={handleFilterChange}
            onClear={() => {
              setFilters(EMPTY_FILTERS);
              setActiveViewId('');
              setPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <LoadingSpinner text="Loading leads..." />
            <div className="mt-6">
              <SkeletonTable rows={5} cols={10} />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-800 shadow-sm">
            <h2 className="text-base font-bold uppercase tracking-wider text-red-900">{error}</h2>
            {error !== 'Access Denied' && (
              <button
                type="button"
                onClick={loadLeads}
                className="mt-4 rounded-lg bg-red-600 hover:bg-red-750 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50">
            <EmptyState
              icon="leaderboard"
              title="No Leads Found"
              description="No leads found matching your criteria."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <LeadTable
              leads={leads}
              isAdmin={isAdmin}
              sort={sort}
              onSort={handleSort}
              onOpenLead={handleOpenLead}
              selectedIds={selectedLeadIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
            />
            {isAdmin && selectedCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3.5 shadow-sm animate-slide-up">
                <span className="text-sm font-semibold text-slate-800">
                  {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkReassign}
                    className="rounded-lg bg-primary hover:bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs"
                  >
                    Reassign
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkExport}
                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}

        {!isAdmin && isMarketingExecutive && (
          <p className="mt-4 text-label-sm text-on-surface-variant">
            Showing leads assigned to {user?.name || 'you'}.
          </p>
        )}
        <BulkAssignModal
          isOpen={reassignModalOpen}
          onClose={() => !reassigning && setReassignModalOpen(false)}
          selectedCount={selectedCount}
          selectedLeads={leads.filter((l) => selectedLeadIds.has(l.id))}
          onAssign={handleConfirmReassign}
          assigning={reassigning}
        />

        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => !exporting && setExportModalOpen(false)}
          activeFilters={filters}
          filterLabels={{ category: categoriesMap }}
          onExport={async (format) => {
            await handleExportFiltered(format);
            setExportModalOpen(false);
          }}
          loading={exporting}
        />

        <Toast
          message={toastMessage}
          type={toastType}
          show={toastShow}
          onClose={() => setToastShow(false)}
        />
      </div>
    </div>
  );
}
