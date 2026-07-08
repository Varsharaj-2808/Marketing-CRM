import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogEntries, exportAuditLog } from '../../services/leadService';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';
import Toast from '../../components/common/Toast';

const PAGE_SIZE = 10;

const ACTION_OPTIONS = [
  '',
  'lead.assigned',
  'user.role_changed',
  'user.deactivated',
  'user.activated',
  'lead.status_changed',
  'lead.field_updated'
];

function AuditLogSkeleton() {
  return (
    <div className="mt-4">
      <div className="glass-card overflow-hidden mb-6">
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
        setAuditLog(res.data || []);
        const pagination = res.pagination || {};
        setTotal(pagination.total_records || res.data?.length || 0);
      } else {
        setError('Failed to load audit logs. Please try again later.');
      }
    } catch (err) {
      if (err?.status === 400 || err?.payload?.message?.includes('date')) {
        setDateError('Invalid date format. Use YYYY-MM-DD');
      } else {
        setError('Failed to load audit logs. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, activeFilters]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 0;

  const handleApplyFilters = () => {
    setPage(1);
    setActiveFilters({ actor, action_type: actionType, from, to });
  };

  const handleResetFilters = () => {
    setActor('');
    setActionType('');
    setFrom('');
    setTo('');
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

      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Audit Logs</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">Audit Logs</h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Track and trace system-wide user actions and lead modifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/30 text-label-sm font-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Date error banner */}
      {dateError && (
        <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container border border-error/10 font-body-md flex items-center gap-2">
          <span className="material-symbols-outlined">warning</span>
          <span>{dateError}</span>
        </div>
      )}

      {/* General error banner */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container border border-error/10 font-body-md flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filters Form */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label htmlFor="filter-actor" className="block text-label-xs text-on-surface-variant mb-1 font-semibold">Actor</label>
          <input
            id="filter-actor"
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Filter by Actor..."
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none w-44"
          />
        </div>
        <div>
          <label htmlFor="filter-action-type" className="block text-label-xs text-on-surface-variant mb-1 font-semibold">Action Type</label>
          <label htmlFor="filter-action-type" className="sr-only">Action</label>
          <select
            id="filter-action-type"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          >
            <option value="">All Action Types</option>
            {ACTION_OPTIONS.filter(Boolean).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-from" className="block text-label-xs text-on-surface-variant mb-1 font-semibold">From Date</label>
          <label htmlFor="filter-from" className="sr-only">From</label>
          <input
            id="filter-from"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="block text-label-xs text-on-surface-variant mb-1 font-semibold">To Date</label>
          <label htmlFor="filter-to" className="sr-only">To</label>
          <input
            id="filter-to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-primary text-white rounded-xl text-label-sm font-label-sm shadow hover:bg-primary-hover transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Table Card */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
          <h4 className="font-headline-md text-headline-md text-on-surface">Activity Feed</h4>
          {!loading && !error && (
            <span className="text-label-sm text-on-surface-variant">
              {total} total entries
            </span>
          )}
        </div>
        {loading ? (
          <AuditLogSkeleton />
        ) : error ? (
          <div className="py-10 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl mb-2 text-error block">error</span>
            <p className="font-label-md">Failed to load data</p>
          </div>
        ) : auditLog.length === 0 ? (
          <div className="py-10 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
            <p className="font-label-md">No audit log entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                  <th className="py-2.5 px-3 font-semibold">Seq</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Actor</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Action Type</th>
                  <th className="py-2.5 px-3 font-semibold">Entity Affected</th>
                  <th className="py-2.5 px-3 font-semibold">Entity ID</th>
                  <th className="py-2.5 px-3 font-semibold">Result</th>
                  <th className="py-2.5 px-3 font-semibold">IP Address</th>
                  <th className="py-2.5 px-3 font-semibold">Actions/Details</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface">
                {auditLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <td className="py-3 px-3 font-semibold">{entry.seq || '-'}</td>
                    <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                      {entry.created_at || entry.timestamp || entry.createdAt
                        ? new Date(entry.created_at || entry.timestamp || entry.createdAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {entry.actor?.name || (typeof entry.actor === 'string' ? entry.actor : '') || entry.user_name || entry.email || entry.user || '-'}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {entry.actor?.role || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-primary">{entry.action_type || entry.action || '-'}</span>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {entry.entity_affected || entry.entity || entry.resource || entry.resource_type || '-'}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant font-mono">
                      {entry.entity_id || entry.entityId || entry.resource_id || entry.resourceId || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {entry.result === 'success' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-xs font-semibold bg-emerald-500/10 text-emerald-600">
                          success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-xs font-semibold bg-surface-container-high text-on-surface-variant">
                          {entry.result || '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant font-mono text-label-sm">
                      {entry.ip_address || entry.ip || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="px-2.5 py-1 text-label-xs font-label-xs text-primary hover:bg-primary/10 rounded-lg border border-primary/20 transition-all"
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

        {/* Pagination */}
        {!loading && !error && totalPages >= 1 && (
          <div className="p-4 border-t border-outline-variant/10 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-label-md disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-container-high transition-colors"
              >
                Previous Page
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-label-md disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-container-high transition-colors"
              >
                Next Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden rounded-3xl p-6 md:p-8 relative shadow-2xl bg-white border border-outline-variant/30">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
            
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface">Audit Log Detail</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 font-body-md text-on-surface">
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-outline-variant/10">
                <span className="text-label-sm font-semibold text-on-surface-variant">Actor:</span>
                <span className="col-span-2 font-semibold">
                  {selectedEntry.actor?.name || selectedEntry.actor || '-'} ({selectedEntry.actor?.role || '-'})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-outline-variant/10">
                <span className="text-label-sm font-semibold text-on-surface-variant">Action Type:</span>
                <span className="col-span-2 text-primary font-bold">
                  {selectedEntry.action_type || selectedEntry.action || '-'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-outline-variant/10">
                <span className="text-label-sm font-semibold text-on-surface-variant">IP Address:</span>
                <span className="col-span-2 font-mono">{selectedEntry.ip_address || selectedEntry.ip || '-'}</span>
              </div>
              
              <div className="mt-4">
                <span className="text-label-sm font-semibold text-on-surface-variant block mb-2">Raw Details:</span>
                <div className="bg-surface-container-low p-4 rounded-xl font-mono text-label-sm overflow-x-auto max-h-48 border border-outline-variant/20 whitespace-pre">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm rounded-xl transition-colors"
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
