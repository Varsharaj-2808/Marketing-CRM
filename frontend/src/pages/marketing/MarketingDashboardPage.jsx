import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchMeDashboardCards,
  fetchMeConversionRate,
  fetchTodayFollowups
} from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function MarketingDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Role Security check
  const isME = user?.role === 'Marketing Executive';

  // KPI states
  const [cards, setCards] = useState(null);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState(false);

  // Conversion rate states
  const [conversion, setConversion] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(true);
  const [conversionError, setConversionError] = useState(false);

  // Follow-ups states
  const [followups, setFollowups] = useState([]);
  const [followupsPage, setFollowupsPage] = useState(1);
  const [followupsTotalPages, setFollowupsTotalPages] = useState(1);
  const [followupsLoading, setFollowupsLoading] = useState(true);
  const [followupsError, setFollowupsError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load KPI cards
  const loadCards = async () => {
    setCardsLoading(true);
    setCardsError(false);
    try {
      const res = await fetchMeDashboardCards();
      if (res.success) {
        setCards(res.data);
      } else {
        setCardsError(true);
      }
    } catch {
      setCardsError(true);
    } finally {
      setCardsLoading(false);
    }
  };

  // Load conversion rates
  const loadConversion = async () => {
    setConversionLoading(true);
    setConversionError(false);
    try {
      const res = await fetchMeConversionRate();
      if (res.success) {
        setConversion(res.data);
      } else {
        setConversionError(true);
      }
    } catch {
      setConversionError(true);
    } finally {
      setConversionLoading(false);
    }
  };

  // Load today's followups (initial or append)
  const loadFollowups = async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setFollowupsLoading(true);
      setFollowupsError(false);
    }
    try {
      const res = await fetchTodayFollowups({ page, limit: 20 });
      if (res.success) {
        const payload = res.data || [];
        const pag = res.pagination || { page: 1, total_pages: 1 };
        
        // Sort quality order: Hot -> Warm -> Cold
        const qualityOrder = { Hot: 1, Warm: 2, Cold: 3, High: 1, Medium: 2, Low: 3 };
        const sorted = [...payload].sort((a, b) => {
          const qA = qualityOrder[a.lead_quality || a.priority] || 99;
          const qB = qualityOrder[b.lead_quality || b.priority] || 99;
          return qA - qB;
        });

        if (append) {
          setFollowups(prev => [...prev, ...sorted]);
        } else {
          setFollowups(sorted);
        }
        setFollowupsPage(pag.page);
        setFollowupsTotalPages(pag.total_pages || pag.totalPages || 1);
      } else {
        setFollowupsError(true);
      }
    } catch {
      setFollowupsError(true);
    } finally {
      setFollowupsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isME) {
      loadCards();
      loadConversion();
      loadFollowups(1, false);
    }
  }, [isAuthenticated, isME]);

  const handleLoadMore = () => {
    if (followupsPage < followupsTotalPages) {
      loadFollowups(followupsPage + 1, true);
    }
  };

  // Enforce access control
  if (!isAuthenticated || !user) return null;
  if (!isME) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" data-testid="access-denied">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-red-600 text-5xl mb-3">gpp_maybe</span>
          <h1 className="text-headline-md font-headline-md text-red-900">Access Denied</h1>
          <p className="mt-2 text-body-md text-red-800">You do not have executive privileges to view this dashboard.</p>
        </div>
      </div>
    );
  }

  const getQualityBadge = (quality) => {
    const q = (quality || '').toLowerCase();
    if (q === 'hot' || q === 'high') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (q === 'warm' || q === 'medium') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="mt-4 space-y-6">
      <div className="border-b border-outline-variant/15 pb-4">
        <h1 className="font-display-lg text-display-md md:text-display-lg text-primary mb-1">
          Marketing Executive Dashboard
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Track your personal sales funnel, upcoming follow-ups, and closure performance.
        </p>
      </div>

      {/* ME KPI Cards Grid */}
      {cardsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl"></div>
          ))}
        </div>
      ) : cardsError ? (
        <div className="p-5 border border-error/20 bg-error/5 text-error rounded-2xl flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-3xl mb-1.5">error</span>
          <p className="font-semibold">Failed to load KPI card data</p>
          <button onClick={loadCards} className="mt-2 px-3 py-1.5 bg-error text-white rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: My Leads */}
          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 shadow-sm" role="status">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">contacts</span>
            </div>
            <div>
              <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">My Leads</h3>
              <p className="text-display-md font-display-md text-on-surface">{cards?.my_leads ?? 0}</p>
            </div>
          </div>

          {/* Card 2: Today's Follow-ups */}
          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 shadow-sm" role="status">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">notifications_active</span>
            </div>
            <div>
              <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Today's Follow-ups</h3>
              <p className="text-display-md font-display-md text-amber-700">{cards?.my_followups_today ?? 0}</p>
            </div>
          </div>

          {/* Card 3: Won Leads */}
          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 shadow-sm" role="status">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">thumb_up</span>
            </div>
            <div>
              <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Won Leads</h3>
              <p className="text-display-md font-display-md text-emerald-600">{cards?.my_won_leads ?? 0}</p>
            </div>
          </div>

          {/* Card 4: Lost Leads */}
          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 shadow-sm" role="status">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">thumb_down</span>
            </div>
            <div>
              <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Lost Leads</h3>
              <p className="text-display-md font-display-md text-rose-600">{cards?.my_lost_leads ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ME Conversion Rate Widget */}
        <div className="glass-card p-6 relative flex flex-col justify-start shadow-sm border border-outline-variant/15">
          {conversionLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : conversionError ? (
            <div className="h-full flex flex-col items-center justify-center text-error p-4">
              <span className="material-symbols-outlined text-3xl mb-1.5">error</span>
              <p className="font-semibold">Failed to load conversion stats</p>
              <button onClick={loadConversion} className="mt-2 px-3 py-1.5 bg-error text-white rounded-lg text-xs font-bold">Retry</button>
            </div>
          ) : (
            <div className="space-y-5">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Conversion Performance</h3>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-display-lg font-display-lg text-primary">{conversion?.conversion_rate ?? '0%'}</span>
                <span className="text-label-md font-bold text-on-surface-variant mt-1">Personal Win Rate</span>
              </div>
              <div className="space-y-2 border-t border-outline-variant/10 pt-4">
                <div className="flex justify-between text-body-md">
                  <span className="text-on-surface-variant">Won Leads:</span>
                  <span className="font-bold text-emerald-600">{conversion?.won ?? 0}</span>
                </div>
                <div className="flex justify-between text-body-md">
                  <span className="text-on-surface-variant">Lost Leads:</span>
                  <span className="font-bold text-rose-600">{conversion?.lost ?? 0}</span>
                </div>
                <div className="flex justify-between text-body-md">
                  <span className="text-on-surface-variant">Total Closed:</span>
                  <span className="font-bold text-on-surface">{conversion?.total_closed ?? 0}</span>
                </div>
              </div>
              {/* Progress bar visual indicator */}
              <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${parseFloat(conversion?.conversion_rate || '0')}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* ME Today's Follow-ups List */}
        <div className="glass-card p-6 relative lg:col-span-2 flex flex-col shadow-sm border border-outline-variant/15">
          <div className="border-b border-outline-variant/10 pb-3 mb-4 flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Today's Follow-ups Queue</h3>
            <button 
              onClick={() => loadFollowups(1, false)}
              className="p-1 text-primary rounded-lg hover:bg-primary/5 transition-colors"
              aria-label="Refresh today's follow-ups"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>

          {followupsLoading && followups.length === 0 ? (
            <div className="h-full flex items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : followupsError ? (
            <div className="p-5 border border-error/20 bg-error/5 text-error rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-3xl mb-1.5">error</span>
              <p className="font-semibold">Failed to load followups</p>
              <button 
                onClick={() => loadFollowups(1, false)} 
                className="mt-3 px-3 py-1.5 bg-error text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : followups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant opacity-75">
              <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2 font-bold">check_circle</span>
              <p className="text-body-md font-medium">No follow-ups due today</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {followups.map((lead) => (
                  <div 
                    key={lead.id}
                    onClick={() => navigate(`/marketing/leads/${lead.id || lead.lead_id}`)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/60 hover:bg-white transition-all cursor-pointer border border-outline-variant/10 shadow-sm hover:shadow"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-on-surface font-semibold text-label-md truncate">
                        {lead.company_name}
                      </span>
                      <span className="text-on-surface-variant text-label-sm">
                        Contact: {lead.contact_person}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant">
                        {new Date(lead.next_followup_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getQualityBadge(lead.lead_quality || lead.priority)}`}>
                        {lead.lead_quality || lead.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more pagination */}
              {followupsPage < followupsTotalPages && (
                <div className="flex justify-center mt-4 border-t border-outline-variant/10 pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded-xl text-label-sm font-semibold text-primary disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
