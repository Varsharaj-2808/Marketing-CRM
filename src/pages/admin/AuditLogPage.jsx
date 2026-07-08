import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuditLogEntries, exportAuditLog } from '../../services/leadService';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';

const PAGE_SIZE = 10;

const ACTION_OPTIONS = [
  '',
  'CREATED',
  'UPDATED',
  'DEACTIVATED',
  'ACTIVATED',
  'DELETED',
  'ASSIGNED',
  'REASSIGNED',
  'CLOSED',
  'REOPENED',
  'lead.status_changed',
  'lead.field_updated',
];

function AuditLogSkeleton() {
  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <Skeleton width="40px" height="10px" rounded />
            <Skeleton width="12px" height="12px" />
            <Skeleton width="100px" height="10px" rounded />
          </div>
          <Skeleton width="160px" height="26px" rounded className="mb-1" />
          <Skeleton width="280px" height="14px" rounded />
        </div>
        <Skeleton width="100px" height="36px" rounded />
      </div>
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <Skeleton width="80px" height="20px" rounded />
        </div>
        <SkeletonTable rows={6} cols={7} />
      </div>
    </div>
  );
}

function getActionBadge(action) {
  if (action?.includes('CREATED')) return 'bg-emerald-500/10 text-emerald-600';
  if (action?.includes('UPDATED')) return 'bg-primary/10 text-primary';
  if (action?.includes('DEACTIVATED')) return 'bg-error-container text-on-error-container';
  if (action?.includes('ACTIVATED')) return 'bg-emerald-500/10 text-emerald-600';
  if (action?.includes('DELETED')) return 'bg-red-100 text-red-600';
  if (action?.includes('ASSIGNED') || action?.includes('REASSIGNED')) return 'bg-amber-100 text-amber-700';
  if (action?.includes('CLOSED')) return 'bg-purple-100 text-purple-700';
  if (action?.includes('REOPENED')) return 'bg-blue-100 text-blue-700';
  return 'bg-surface-container-high text-on-surface-variant';
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [auditLog, setAuditLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [userIdFilter, setUserIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const params = { page, page_size: PAGE_SIZE };
    if (userIdFilter) params.user_id = userIdFilter;
    if (actionFilter) params.action = actionFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const res = await fetchAuditLogEntries(params);
    const data = res?.data || [];
    const pagination = res?.pagination || {};
    setAuditLog(data);
    setTotal(pagination.total_records || pagination.total || data.length);
    setLoading(false);
  }, [page, userIdFilter, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportAuditLog({ user_id: userIdFilter, action: actionFilter, date_from: dateFrom, date_to: dateTo });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // fallback
    } finally {
      setExporting(false);
    }
  }

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Audit Logs</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">Audit Logs</h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Track all activities, including account creation, updates, and status changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/30 text-label-sm font-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label htmlFor="filter-user" className="block text-label-xs text-on-surface-variant mb-1">Employee ID</label>
          <input
            id="filter-user"
            value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); handleFilterChange(); }}
            placeholder="Filter by Employee ID..."
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none w-44"
          />
        </div>
        <div>
          <label htmlFor="filter-action" className="block text-label-xs text-on-surface-variant mb-1">Action</label>
          <select
            id="filter-action"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); handleFilterChange(); }}
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.filter(Boolean).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-from" className="block text-label-xs text-on-surface-variant mb-1">From</label>
          <input
            id="filter-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="block text-label-xs text-on-surface-variant mb-1">To</label>
          <input
            id="filter-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
            className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        {(userIdFilter || actionFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setUserIdFilter(''); setActionFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="px-3 py-2 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
          <h4 className="font-headline-md text-headline-md text-on-surface">Activity Feed</h4>
          {!loading && (
            <span className="text-label-sm text-on-surface-variant">
              {total} total entr{total === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
        {loading ? (
          <AuditLogSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Resource</th>
                  <th className="py-2.5 px-3 font-semibold">Resource ID</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Details</th>
                  <th className="py-2.5 px-3 font-semibold">IP Address</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface">
                {auditLog.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                      <p className="font-label-md">No audit entries yet</p>
                      <p className="text-label-sm mt-1">Activities will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  auditLog.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => navigate(`/admin/audit-logs/${entry.id}`)}
                      className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${getActionBadge(entry.action)}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant">{entry.resource || entry.resource_type || '-'}</td>
                      <td className="py-3 px-3 font-semibold text-on-surface">{entry.resource_id || entry.resourceId || '-'}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{entry.user_name || entry.email || entry.user || '-'}</td>
                      <td className="py-3 px-3 text-on-surface-variant max-w-[200px] truncate">{entry.details || '-'}</td>
                      <td className="py-3 px-3 text-on-surface-variant font-mono text-label-sm">{entry.ip_address || entry.ip || '-'}</td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">{new Date(entry.created_at || entry.createdAt || entry.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant/10 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-label-md disabled:opacity-30 hover:bg-surface-container-high transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-label-md disabled:opacity-30 hover:bg-surface-container-high transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
