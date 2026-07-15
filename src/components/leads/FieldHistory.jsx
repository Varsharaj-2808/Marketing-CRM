import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchFieldHistory, fetchAdminFieldHistory, exportFieldHistory } from '../../services/leadService';
import { toHumanReadableFieldName, formatChangedAt, truncateText } from '../../utils/fieldHistoryDisplay';
import SkeletonTable from '../common/SkeletonTable';

const PAGE_LIMIT = 20;

function SystemBadge() {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-label-sm font-label-sm cursor-default"
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      role="status"
      aria-label="System"
    >
      System
      {tooltipVisible && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-label-xs rounded-lg shadow-lg whitespace-nowrap z-10"
          role="tooltip"
        >
          This change was automatically performed by the system.
        </span>
      )}
    </span>
  );
}

function TruncatableCell({ value, fieldName, resolvers }) {
  const [expanded, setExpanded] = useState(false);
  if (value === null || value === undefined) return <span className="text-on-surface-variant/50">—</span>;
  let displayValue = String(value);
  if (resolvers && fieldName && resolvers[fieldName]) {
    const resolved = resolvers[fieldName](value);
    if (resolved) displayValue = resolved;
  }
  const { text, isTruncated, fullText } = truncateText(displayValue, 100);
  return (
    <span>
      {expanded ? fullText : text}
      {isTruncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-1 text-primary text-label-sm font-label-sm hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </span>
  );
}

function determineUniqueFieldNames(history) {
  const names = new Set();
  (history || []).forEach((entry) => {
    if (entry.field) names.add(entry.field);
  });
  return Array.from(names).sort();
}

export default function FieldHistory({ leadId, isAdminRoute, visible = false, valueResolvers = {} }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [history, setHistory] = useState([]);
  const [totalChanges, setTotalChanges] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const [fieldFilter, setFieldFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [exporting, setExporting] = useState(false);

  const loadedRef = useRef(false);

  const fetchData = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    setError(null);
    const fetcher = isAdminRoute ? fetchAdminFieldHistory : fetchFieldHistory;
    const params = { page: pageNum, limit: PAGE_LIMIT };
    if (fieldFilter) params.field = fieldFilter;
    try {
      const res = await fetcher(leadId, params);
      const data = res?.data || {};
      const mappedItems = (data.history || []).map((entry) => ({
        ...entry,
        field: entry.field || entry.field_name,
        changed_by: entry.changed_by_name
          ? { id: entry.changed_by, name: entry.changed_by_name }
          : entry.changed_by,
        source: entry.source || (entry.is_system_generated ? 'system' : 'user'),
      }));
      const total = data.total_changes || 0;
      const pagination = res?.pagination || {};
      const totalPages = pagination.total_pages || 1;

      if (append) {
        setHistory((prev) => [...prev, ...mappedItems]);
      } else {
        setHistory(mappedItems);
      }
      setTotalChanges(total);
      setHasMore(pageNum < totalPages);
      if (pageNum >= totalPages) {
        setAllLoaded(true);
      } else {
        setAllLoaded(false);
      }
      setPage(pageNum);
      loadedRef.current = true;
    } catch (err) {
      setError('Failed to load field history.');
    } finally {
      setLoading(false);
    }
  }, [leadId, isAdminRoute, fieldFilter]);

  useEffect(() => {
    if (visible && !loadedRef.current) {
      fetchData(1, false);
    }
  }, [visible, fetchData]);

  useEffect(() => {
    if (!loadedRef.current) return;
    setHistory([]);
    setPage(1);
    setHasMore(false);
    setAllLoaded(false);
    setTotalChanges(0);
    fetchData(1, false);
  }, [fieldFilter, fetchData]);

  function handleLoadMore() {
    if (!hasMore || loading) return;
    fetchData(page + 1, true);
  }

  function handleFieldFilterChange(newField) {
    if (newField === fieldFilter) return;
    setFieldFilter(newField);
  }

  function handleSourceFilterChange(newSource) {
    setSourceFilter(newSource);
  }

  async function handleExportCSV() {
    if (!isAdmin) return;
    setExporting(true);
    try {
      const blob = await exportFieldHistory(leadId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `field-history-${leadId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  }

  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.changed_at || 0).getTime();
    const dateB = new Date(b.changed_at || 0).getTime();
    return dateB - dateA;
  });

  const filteredHistory = sortedHistory.filter((entry) => {
    if (sourceFilter === 'user' && entry.source === 'system') return false;
    if (sourceFilter === 'system' && entry.source !== 'system') return false;
    return true;
  });

  const uniqueFieldNames = determineUniqueFieldNames(history);
  const showExportBtn = isAdmin;

  function handleRetry() {
    fetchData(1, false);
  }

  if (!loading && error) {
    return (
      <div className="text-center py-8" role="alert">
        <p className="font-body-md text-body-md text-error mb-3">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-label-sm hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {totalChanges > 0 && !loading && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-label-sm font-label-sm">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">history</span>
              Total Changes: {totalChanges}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showExportBtn && (
            <button
              onClick={handleExportCSV}
              disabled={exporting || loading}
              aria-label="Export CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/30 text-label-sm font-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {uniqueFieldNames.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="field-filter" className="text-label-sm text-on-surface-variant">Field:</label>
            <select
              id="field-filter"
              value={fieldFilter}
              onChange={(e) => handleFieldFilterChange(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-label-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">All Fields</option>
              {uniqueFieldNames.map((name) => (
                <option key={name} value={name}>{toHumanReadableFieldName(name)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 border border-outline-variant/30 rounded-lg p-0.5" role="group" aria-label="Source filter">
          <button
            onClick={() => handleSourceFilterChange('all')}
            className={`px-2.5 py-1 rounded-md text-label-sm font-label-sm transition-colors ${sourceFilter === 'all' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            aria-pressed={sourceFilter === 'all'}
          >
            All changes
          </button>
          <button
            onClick={() => handleSourceFilterChange('user')}
            className={`px-2.5 py-1 rounded-md text-label-sm font-label-sm transition-colors ${sourceFilter === 'user' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            aria-pressed={sourceFilter === 'user'}
          >
            User changes only
          </button>
          <button
            onClick={() => handleSourceFilterChange('system')}
            className={`px-2.5 py-1 rounded-md text-label-sm font-label-sm transition-colors ${sourceFilter === 'system' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            aria-pressed={sourceFilter === 'system'}
          >
            System changes only
          </button>
        </div>
      </div>

      {loading && history.length === 0 ? (
        <div className="glass-card overflow-hidden" role="status" aria-label="Loading field history">
          <SkeletonTable rows={4} cols={5} />
        </div>
      ) : filteredHistory.length === 0 && !loading ? (
        <div className="text-center py-12" role="status">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3" aria-hidden="true">history</span>
          <p className="font-body-md text-body-md text-on-surface-variant/70">
            No changes tracked yet
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table" aria-label="Field change history">
            <thead>
              <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
                <th scope="col" className="py-2.5 px-3 font-semibold">Field Name</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Old Value</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">New Value</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Changed By</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Changed At</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface">
              {filteredHistory.map((entry, idx) => (
                <tr key={entry.changed_at + entry.field + idx} className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors">
                  <td className="py-3 px-3 font-medium">{toHumanReadableFieldName(entry.field)}</td>
                  <td className="py-3 px-3 text-on-surface-variant max-w-[200px]">
                    <TruncatableCell value={entry.old_value} fieldName={entry.field} resolvers={valueResolvers} />
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant max-w-[200px]">
                    <TruncatableCell value={entry.new_value} fieldName={entry.field} resolvers={valueResolvers} />
                  </td>
                  <td className="py-3 px-3">
                    {entry.source === 'system' ? (
                      <SystemBadge />
                    ) : (
                      <span>{entry.changed_by?.name || entry.changed_by || ''}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                    {formatChangedAt(entry.changed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {allLoaded && history.length > 0 && !loading && (
        <p className="text-center text-label-sm text-on-surface-variant/50 mt-3">
          Showing all {totalChanges} change{totalChanges !== 1 ? 's' : ''}
        </p>
      )}

      {hasMore && !loading && (
        <div className="text-center pt-3">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all"
          >
            Load more
          </button>
        </div>
      )}

      {loading && history.length > 0 && (
        <div className="text-center py-3">
          <span className="text-label-sm text-on-surface-variant">Loading more...</span>
        </div>
      )}
    </div>
  );
}
