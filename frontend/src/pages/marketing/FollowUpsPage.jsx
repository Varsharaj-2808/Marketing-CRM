import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchTodayFollowups, fetchOverdueFollowups } from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PRIORITY_COLORS = {
  Hot: 'bg-red-100 text-red-800 border-red-200',
  Warm: 'bg-amber-100 text-amber-800 border-amber-200',
  Cold: 'bg-blue-100 text-blue-800 border-blue-200',
};

function getPriorityBadge(quality) {
  return PRIORITY_COLORS[quality] || 'bg-gray-100 text-gray-800 border-gray-200';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [todayFollowups, setTodayFollowups] = useState([]);
  const [overdueFollowups, setOverdueFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [todayRes, overdueRes] = await Promise.all([
          fetchTodayFollowups(),
          fetchOverdueFollowups(),
        ]);
        setTodayFollowups(todayRes?.body?.data || todayRes?.data || []);
        setOverdueFollowups(overdueRes?.body?.data || overdueRes?.data || []);
      } catch {
        setError('Failed to load follow-ups. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleLeadClick(leadId) {
    const base = isAdmin ? '/admin' : '/marketing';
    navigate(`${base}/leads/${leadId}`);
  }

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner text="Loading follow-ups..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Follow-ups</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage and track your pending follow-up activities
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
          <p className="text-label-sm font-label-sm text-error">{error}</p>
        </div>
      )}

      <section className="glass-card rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
          Today's Follow-ups
        </h2>
        <p className="font-label-sm text-label-sm text-on-surface-variant/70 mb-4">
          {todayFollowups.length > 0
            ? `${todayFollowups.length} follow-up${todayFollowups.length > 1 ? 's' : ''} scheduled for today`
            : 'No follow-ups scheduled for today'}
        </p>

        {todayFollowups.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">event_available</span>
            <p className="font-body-md text-body-md text-on-surface-variant/70">All caught up! No follow-ups due today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayFollowups.map((fup) => (
              <button
                key={fup.id}
                onClick={() => handleLeadClick(fup.id)}
                className="w-full flex items-center gap-4 p-4 bg-white/30 rounded-xl border border-outline-variant/20 hover:bg-white/50 hover:border-primary/30 transition-all text-left"
              >
                <div className={`px-2.5 py-1 rounded-full border text-label-xs font-label-xs shrink-0 ${getPriorityBadge(fup.lead_quality)}`}>
                  {fup.lead_quality || 'N/A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-on-surface truncate">
                    {fup.company_name || 'Unknown Company'}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                    {fup.contact_person || '-'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {fup.next_followup_date ? formatDate(fup.next_followup_date) : '-'}
                  </p>
                  {fup.stage && (
                    <p className="text-label-xs font-label-xs text-on-surface-variant/50">{fup.stage}</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ef4444] via-[#f97316] to-[#f59e0b] bg-[length:200%_100%] animate-shimmer" />
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
          Overdue Follow-ups
        </h2>
        <p className="font-label-sm text-label-sm text-on-surface-variant/70 mb-4">
          {overdueFollowups.length > 0
            ? `${overdueFollowups.length} follow-up${overdueFollowups.length > 1 ? 's' : ''} past due`
            : 'No overdue follow-ups'}
        </p>

        {overdueFollowups.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">check_circle</span>
            <p className="font-body-md text-body-md text-on-surface-variant/70">No overdue follow-ups. Great job!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {overdueFollowups.map((fup) => (
              <button
                key={fup.id}
                onClick={() => handleLeadClick(fup.id)}
                className="w-full flex justify-between items-start gap-4 p-4 bg-red-50/30 rounded-xl border border-red-200/40 hover:bg-red-50/60 hover:border-red-300/60 transition-all text-left"
              >
                {/* Left section containing Warning icon, Overdue days, and Priority badge */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                    <span className="font-label-sm font-label-sm text-error">{fup.days_overdue}d</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full border text-label-xs font-label-xs shrink-0 ${getPriorityBadge(fup.lead_quality)}`}>
                    {fup.lead_quality || 'N/A'}
                  </div>
                </div>

                {/* Middle section containing Company and Contact name */}
                <div className="flex-grow min-w-0">
                  <p className="font-body-md text-body-md text-on-surface truncate">
                    {fup.company_name || 'Unknown Company'}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                    {fup.contact_person || '-'}
                  </p>
                </div>

                {/* Right section containing Date & Time and Lead Stage */}
                <div className="flex flex-col items-end text-right min-w-0">
                  <p className="font-label-sm text-label-sm text-error font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-none">
                    {fup.next_followup_date ? formatDate(fup.next_followup_date) : '-'}
                  </p>
                  {fup.stage && (
                    <p className="text-label-xs font-label-xs text-on-surface-variant/50 truncate w-full">
                      {fup.stage}
                    </p>
                  )}
                </div>

                {/* Chevron icon */}
                <span className="material-symbols-outlined text-outline self-center shrink-0">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
