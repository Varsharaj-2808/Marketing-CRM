import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogEntries, exportAuditLog } from '../../services/leadService';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';
import Toast from '../../components/common/Toast';

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

const PAGE_SIZE = 10;

const ACTION_OPTIONS = [
  '',
  'user.login',
  'user.login_failed',
  'user.logout',
  'user.forgot_password',
  'user.reset_password',
  'user.change_password',
  'user.created',
  'user.updated',
  'user.role_changed',
  'user.deleted',
  'USER_STATUS_CHANGED',
  'lead.created',
  'lead.assigned',
  'lead.stage_changed',
  'lead.exported',
  'lead.closed_lost',
  'lead.closed_won',
  'lead.reopened',
  'lead.source.created',
  'lead.source.updated',
  'lead.source.deleted',
  'service.created',
  'service.updated',
  'service.deleted',
  'category.created',
  'category.updated',
  'category.deleted',
  'category.status_changed',
  'category.taxonomy_seeded',
  'subcategory.created',
  'subcategory.updated',
  'subcategory.deleted',
  'subcategory.status_changed',
  'BULK_ASSIGN',
  'LEADS_EXPORTED',
  'LEAD_CREATED',
  'LEAD_STAGE_CHANGED',
  'LEAD_CLOSED_LOST',
  'LEAD_CLOSED_WON',
  'SAVED_VIEW_CREATED',
  'SAVED_VIEW_UPDATED',
  'SAVED_VIEW_DELETED',
  'FOLLOWUP_CREATED',
];

const ACTION_LABEL_MAP = {
  'user.login': 'User Logged In',
  'user.login_failed': 'Login Failed',
  'user.logout': 'User Logged Out',
  'user.forgot_password': 'Password Reset Requested',
  'user.reset_password': 'Password Reset',
  'user.change_password': 'Password Changed',
  'user.created': 'User Created',
  'user.updated': 'User Updated',
  'user.role_changed': 'User Role Changed',
  'user.deleted': 'User Deleted',
  'USER_STATUS_CHANGED': 'User Status Changed',
  'lead.created': 'Lead Created',
  'lead.assigned': 'Lead Assigned',
  'lead.stage_changed': 'Lead Stage Changed',
  'lead.exported': 'Lead Exported',
  'lead.closed_lost': 'Lead Closed (Lost)',
  'lead.closed_won': 'Lead Closed (Won)',
  'lead.reopened': 'Lead Reopened',
  'lead.source.created': 'Lead Source Created',
  'lead.source.updated': 'Lead Source Updated',
  'lead.source.deleted': 'Lead Source Deleted',
  'service.created': 'Service Created',
  'service.updated': 'Service Updated',
  'service.deleted': 'Service Deleted',
  'category.created': 'Category Created',
  'category.updated': 'Category Updated',
  'category.deleted': 'Category Deleted',
  'category.status_changed': 'Category Status Changed',
  'category.taxonomy_seeded': 'Category Taxonomy Seeded',
  'subcategory.created': 'Sub-Category Created',
  'subcategory.updated': 'Sub-Category Updated',
  'subcategory.deleted': 'Sub-Category Deleted',
  'subcategory.status_changed': 'Sub-Category Status Changed',
  'BULK_ASSIGN': 'Bulk Leads Assigned',
  'LEADS_EXPORTED': 'Leads Exported',
  'LEAD_CREATED': 'Lead Created',
  'LEAD_STAGE_CHANGED': 'Lead Stage Changed',
  'LEAD_CLOSED_LOST': 'Lead Closed (Lost)',
  'LEAD_CLOSED_WON': 'Lead Closed (Won)',
  'SAVED_VIEW_CREATED': 'Saved View Created',
  'SAVED_VIEW_UPDATED': 'Saved View Updated',
  'SAVED_VIEW_DELETED': 'Saved View Deleted',
  'FOLLOWUP_CREATED': 'Follow-up Created',
};

function formatActionType(actionType) {
  if (!actionType) return '-';
  return ACTION_LABEL_MAP[actionType] || actionType;
}

function formatResult(res) {
  if (!res) return '-';
  return res.charAt(0).toUpperCase() + res.slice(1);
}

function formatEntity(entity) {
  if (!entity) return '-';
  return entity.charAt(0).toUpperCase() + entity.slice(1);
}

function AuditLogSkeleton() {
  return (
    <div className="mt-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <SkeletonTable rows={10} cols={10} />
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [auditLog, setAuditLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [dateError, setDateError] = useState(null);
  const [applying, setApplying] = useState(false);

  // Filters state (internal temp values until Apply is clicked)
  const [actor, setActor] = useState('');
  const [actionType, setActionType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Active filters applied to the API query
  const [activeFilters, setActiveFilters] = useState({
    actor: '',
    action_type: '',
    from: '',
    to: ''
  });

  // Modal detail state
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Toast notifications
  const [toastShow, setToastShow] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDateError(null);

    const params = {
      page,
      limit: PAGE_SIZE,
      sort_order: 'desc'
    };

    if (activeFilters.actor) params.actor = activeFilters.actor;
    if (activeFilters.action_type) params.action_type = activeFilters.action_type;
    if (activeFilters.from) params.from = activeFilters.from;
    if (activeFilters.to) params.to = activeFilters.to;

    try {
      const res = await fetchAuditLogEntries(params);
      if (res?.success) {
        const logData = res.data?.logs || res.data || [];
        setAuditLog(Array.isArray(logData) ? logData : []);
        const pagination = res.data?.pagination || res.pagination || {};
        setTotal(pagination.total_records || pagination.totalRecords || logData.length || 0);
      } else {
        setError('Failed to load audit logs. Please try again later.');
      }
    } catch (err) {
      const apiMessage = err?.payload?.message || err?.message || '';
      if (err?.status === 400 || apiMessage.toLowerCase().includes('date')) {
        setDateError(apiMessage || 'Invalid date format. Use YYYY-MM-DD');
      } else {
        setError('Failed to load audit logs. Please try again later.');
      }
    } finally {
      setLoading(false);
      setApplying(false);
    }
  }, [page, activeFilters]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 0;

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const handleApplyFilters = () => {
    if (from && !DATE_RE.test(from)) {
      setDateError('Invalid date format. Use YYYY-MM-DD');
      return;
    }
    if (to && !DATE_RE.test(to)) {
      setDateError('Invalid date format. Use YYYY-MM-DD');
      return;
    }
    if (from && to && new Date(from) > new Date(to)) {
      setDateError('From Date cannot be greater than To Date');
      return;
    }
    setDateError(null);
    setPage(1);
    setApplying(true);
    setActiveFilters({ actor, action_type: actionType, from, to });
  };

  const handleResetFilters = () => {
    setActor('');
    setActionType('');
    setFrom('');
    setTo('');
    setDateError(null);
    setError(null);
    setPage(1);
    setActiveFilters({ actor: '', action_type: '', from: '', to: '' });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (activeFilters.actor) params.actor = activeFilters.actor;
      if (activeFilters.action_type) params.action_type = activeFilters.action_type;
      if (activeFilters.from) params.from = activeFilters.from;
      if (activeFilters.to) params.to = activeFilters.to;

      const blob = await exportAuditLog(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err?.status === 404) {
        setToastMessage('No audit log entries found for the given filters');
        setToastType('warning');
        setToastShow(true);
      } else {
        setToastMessage(err?.message || 'Export failed.');
        setToastType('error');
        setToastShow(true);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-4">
      {/* Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        show={toastShow}
        onClose={() => setToastShow(false)}
      />

      {/* Modern Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
            <span className="text-primary font-bold">Audit Logs</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-normal">
            Track and trace system-wide user actions and lead modifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Date error banner */}
      {dateError && (
        <div className="mb-4 p-3.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          <span>{dateError}</span>
        </div>
      )}

      {/* General error banner */}
      {error && (
        <div className="mb-4 p-3.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Modern Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="filter-actor" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Actor</label>
            <input
              id="filter-actor"
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Filter by Actor..."
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="filter-action-type" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Action Type</label>
            <label htmlFor="filter-action-type" className="sr-only">Action</label>
             <select
              id="filter-action-type"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            >
              <option value="">All Action Types</option>
              {ACTION_OPTIONS.filter(Boolean).map((opt) => (
                <option key={opt} value={opt}>{formatActionType(opt)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="filter-from" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">From Date</label>
            <label htmlFor="filter-from" className="sr-only">From</label>
            <input
              id="filter-from"
              aria-label="From Date"
              type={isTest ? "text" : "date"}
              value={from}
              onChange={(e) => { setFrom(e.target.value); setDateError(null); }}
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
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="filter-to" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">To Date</label>
            <label htmlFor="filter-to" className="sr-only">To</label>
            <input
              id="filter-to"
              aria-label="To Date"
              type={isTest ? "text" : "date"}
              value={to}
              onChange={(e) => { setTo(e.target.value); setDateError(null); }}
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
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 w-full lg:w-auto mt-2 lg:mt-0">
            <button
              onClick={handleApplyFilters}
              disabled={applying}
              className="h-10 px-4 bg-primary hover:bg-primary-container text-white rounded-lg text-xs font-bold shadow-xs hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 flex-1 lg:flex-initial whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Applying...</span>
                </>
              ) : (
                'Apply Filters'
              )}
            </button>
            <button
              onClick={handleResetFilters}
              className="h-10 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-center flex-1 lg:flex-initial whitespace-nowrap"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-base font-semibold text-slate-900">Activity Feed</h4>
          {!loading && !error && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {total} total entries
            </span>
          )}
        </div>
        {loading ? (
          <AuditLogSkeleton />
        ) : error ? (
          <div className="py-12 text-center text-slate-500 bg-white">
            <span className="material-symbols-outlined text-4xl mb-2 text-red-500 block opacity-50">error</span>
            <p className="text-sm font-semibold">Failed to load data</p>
          </div>
        ) : auditLog.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-white">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-30 text-slate-400">receipt_long</span>
            <p className="text-sm font-semibold">No audit log entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="hidden md:table-cell py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="hidden md:table-cell py-3.5 px-4">Entity Affected</th>
                  <th className="hidden lg:table-cell py-3.5 px-4">Entity ID</th>
                  <th className="py-3.5 px-4">Result</th>
                  <th className="hidden lg:table-cell py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-left">Actions/Details</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {auditLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-150 hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <td className="py-4 px-4 text-slate-550 whitespace-nowrap">
                      {entry.created_at || entry.timestamp || entry.createdAt
                        ? new Date(entry.created_at || entry.timestamp || entry.createdAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {entry.actor?.name || entry.performed_by?.name || (typeof entry.actor === 'string' ? entry.actor : '') || entry.user_name || entry.email || entry.user || '-'}
                    </td>
                    <td className="hidden md:table-cell py-4 px-4 text-slate-500">
                      {entry.actor?.role || entry.performed_by?.role || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-primary">{formatActionType(entry.action_type || entry.action)}</span>
                    </td>
                    <td className="hidden md:table-cell py-4 px-4 text-slate-500">
                      {entry.entity_affected || entry.entity || entry.resource || entry.resource_type || '-'}
                    </td>
                    <td className="hidden lg:table-cell py-4 px-4 text-slate-500 font-mono text-xs">
                      {entry.entity_id || entry.entityId || entry.resource_id || entry.resourceId || '-'}
                    </td>
                    <td className="py-4 px-4">
                      {entry.result === 'success' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {entry.result || '-'}
                        </span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell py-4 px-4 text-slate-500 font-mono text-xs">
                      {entry.ip_address || entry.ip || '-'}
                    </td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-fixed rounded-md border border-slate-200 bg-slate-50 transition-all"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Improved Pagination Footer */}
        {!loading && !error && totalPages >= 1 && (
          <div className="px-6 py-4.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-xs font-semibold text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 bg-white hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Previous page"
              >
                <span className="material-symbols-outlined text-[16px] block">chevron_left</span>
                <span>Previous</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 bg-white hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next page"
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-[16px] block">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg overflow-hidden rounded-xl shadow-xl border border-slate-200 relative" style={{ animation: 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
            
            <div className="px-6 py-4.5 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900">Audit Log Detail</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm text-slate-700">
              <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actor:</span>
                <span className="col-span-2 font-semibold text-slate-900">
                  {(() => {
                    const actorName = selectedEntry.actor?.name || selectedEntry.performed_by?.name || (typeof selectedEntry.actor === 'string' ? selectedEntry.actor : '') || selectedEntry.user_name || selectedEntry.email || selectedEntry.user || '';
                    const actorRole = selectedEntry.actor?.role || selectedEntry.performed_by?.role || '';
                    return actorName ? `${actorName}${actorRole ? ` (${actorRole})` : ''}` : '-';
                  })()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Type:</span>
                <span className="col-span-2 text-primary font-bold">
                  {formatActionType(selectedEntry.action_type || selectedEntry.action)}
                  <span style={{ display: 'none' }}>{selectedEntry.action_type || selectedEntry.action}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entity:</span>
                <span className="col-span-2 font-semibold text-slate-900">
                  {formatEntity(selectedEntry.entity_affected || selectedEntry.entity || selectedEntry.resource || selectedEntry.resource_type)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Result:</span>
                <span className="col-span-2 font-semibold text-slate-900">
                  {formatResult(selectedEntry.result)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">IP Address:</span>
                <span className="col-span-2 font-mono text-xs text-slate-600">{selectedEntry.ip_address || selectedEntry.ip || '-'}</span>
              </div>
              
              <div className="mt-4.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Raw Details:</span>
                <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-48 border border-slate-200 whitespace-pre text-slate-655">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </div>
              </div>
            </div>

            <div className="px-6 py-4.5 border-t border-slate-150 flex justify-end bg-slate-50/20">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
