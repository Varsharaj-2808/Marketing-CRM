import { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/userService';
import Skeleton from '../../components/common/Skeleton';
import SkeletonTable from '../../components/common/SkeletonTable';

const PAGE_SIZE = 10;

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
        <SkeletonTable rows={6} cols={5} />
      </div>
    </div>
  );
}

function getActionBadge(action) {
  if (action.includes('CREATED')) return 'bg-emerald-500/10 text-emerald-600';
  if (action.includes('UPDATED')) return 'bg-primary/10 text-primary';
  if (action.includes('DEACTIVATED')) return 'bg-error-container text-on-error-container';
  if (action.includes('ACTIVATED')) return 'bg-emerald-500/10 text-emerald-600';
  return 'bg-surface-container-high text-on-surface-variant';
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [auditLog, setAuditLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const params = { page, pageSize: PAGE_SIZE };
    if (userIdFilter) params.user_id = userIdFilter;
    const res = await userService.getAuditLog(params);
    if (res.success) {
      setAuditLog(res.data);
      setTotal(res.pagination.total);
    }
    setLoading(false);
  }, [page, userIdFilter]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            Track all user management activities, including account creation, updates, and status changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
            placeholder="Filter by Employee ID..."
            className="w-48 bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
          <span className="text-label-sm text-on-surface-variant">
            {total} total entr{total === 1 ? 'y' : 'ies'}
          </span>
        </div>
      </div>

      <div className="glass-card overflow-hidden mb-6">
        <div className="p-5 border-b border-outline-variant/10">
          <h4 className="font-headline-md text-headline-md text-on-surface">Activity Feed</h4>
        </div>
        {loading ? (
          <AuditLogSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Target</th>
                  <th className="py-2.5 px-3 font-semibold">Performed By</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface">
                {auditLog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                      <p className="font-label-md">No audit entries yet</p>
                      <p className="text-label-sm mt-1">User management actions will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  auditLog.map((entry) => (
                    <tr key={entry.id} className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors">
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${getActionBadge(entry.action)}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-on-surface">{entry.resourceId || entry.user_id?.slice(0, 8)}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{entry.email}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-3 text-on-surface-variant max-w-[200px]">{entry.details}</td>
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
