import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchLeadHistory, fetchLeadById } from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import { getLeadField, toDisplayText } from '../../utils/leadDisplay';

const STATUS_MAP = {
  Won: 'converted',
  Lost: 'lost',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()] || 'Jan';
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

function getTimelineMeta(action) {
  const lower = (action || '').toLowerCase();
  if (lower.includes('created')) return { icon: 'add_circle', bg: 'bg-green-500/10', color: 'text-green-600' };
  if (lower.includes('status') || lower.includes('changed')) return { icon: 'sync', bg: 'bg-amber-500/10', color: 'text-amber-600' };
  if (lower.includes('note') || lower.includes('comment')) return { icon: 'note', bg: 'bg-blue-500/10', color: 'text-blue-600' };
  if (lower.includes('assign')) return { icon: 'assignment', bg: 'bg-purple-500/10', color: 'text-purple-600' };
  return { icon: 'history', bg: 'bg-primary/5', color: 'text-primary' };
}

const INITIAL_LOAD_COUNT = 5;
const LOAD_MORE_COUNT = 5;

export default function LeadHistory() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setVisibleCount(INITIAL_LOAD_COUNT);
      try {
        const leadRes = await fetchLeadById(leadId);
        const leadData = leadRes?.data || leadRes?.lead || leadRes || null;
        setLead(leadData);

        const historyRes = await fetchLeadHistory(leadId);
        const historyData = historyRes?.data || [];
        if (historyData.length > 0) {
          setTimeline(historyData);
        } else if (leadData?.createdAt) {
          const userName = typeof leadData.createdBy === 'object' ? leadData.createdBy?.name : leadData.createdBy;
          setTimeline([{
            action: 'Lead Created',
            message: 'Lead Created',
            user: userName || '',
            createdBy: leadData.createdBy,
            createdAt: leadData.createdAt,
            timestamp: leadData.createdAt,
          }]);
        }
      } catch {
        setError('Failed to load lead history.');
      } finally {
        setLoading(false);
      }
    }
    if (leadId) load();
  }, [leadId]);

  function handleLoadMore() {
    setVisibleCount((prev) => prev + LOAD_MORE_COUNT);
  }

  const sortedTimeline = [...timeline].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
    const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
  const visibleTimeline = sortedTimeline.slice(0, visibleCount);
  const hasMore = visibleCount < sortedTimeline.length;
  const leadStatus = getLeadField(lead, ['status'], '');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={() => navigate(`${location.pathname.startsWith('/admin') ? '/admin' : '/marketing'}/leads/${leadId}`)}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md mb-3"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Back to Lead Details
      </button>

      {loading ? (
        <LoadingSpinner text="Loading lead history..." />
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
          <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Lead History
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                {getLeadField(lead, ['leadId', 'lead_id', 'id'], `LD-${leadId}`)}
              </p>
            </div>
            {leadStatus && (
              <Badge variant={STATUS_MAP[leadStatus] || 'new'}>
                {leadStatus}
              </Badge>
            )}
          </div>

          {visibleTimeline.length > 0 ? (
            <div className="space-y-3">
              {visibleTimeline.map((entry, idx) => {
                const entryAction = toDisplayText(entry.action || entry.message || entry.description, 'Lead Updated');
                const entryUser = toDisplayText(entry.user || entry.createdBy, '');
                const entryTime = toDisplayText(entry.timestamp || entry.createdAt, '');
                const meta = getTimelineMeta(entryAction);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-white/30 rounded-xl border border-outline-variant/20"
                  >
                    <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined text-[18px] ${meta.color}`}>
                        {meta.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-on-surface">
                        {entryAction}
                      </p>
                      <p className="text-label-sm text-label-sm text-on-surface-variant/70 mt-0.5">
                        {entryUser && (
                          <>By: {entryUser}</>
                        )}
                        {entryTime && (
                          <> on {formatDate(entryTime)}</>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="text-center pt-2">
                  <button
                    onClick={handleLoadMore}
                    className="px-4 py-2 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">
                history
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                No history available for this lead.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
