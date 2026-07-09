import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchCategories,
  fetchSubCategories,
  fetchDashboardKpis,
  fetchCategoryVolume,
  fetchWonRateBySource,
  fetchAdminAtRisk,
  exportReport,
  fetchWonRateByCategory,
  fetchLeadVolumeByCategory,
  fetchAtRiskLeads
} from '../../services/leadService';

function AdminDashboardSkeleton() {
  return (
    <div className="mt-4 space-y-6 animate-pulse" data-testid="widget-skeleton">
      <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 w-full bg-gray-200 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-200 rounded-xl"></div>
        <div className="h-80 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Route protection
  const isAdmin = user?.role === 'Admin';

  // Filters
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  
  // Date Picker States
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });

  // Dashboard Data States (EPIC-6)
  const [kpis, setKpis] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState(false);

  const [categoryVolume, setCategoryVolume] = useState([]);
  const [categoryVolumeLoading, setCategoryVolumeLoading] = useState(true);
  const [categoryVolumeError, setCategoryVolumeError] = useState(false);

  const [wonRate, setWonRate] = useState([]);
  const [wonRateLoading, setWonRateLoading] = useState(true);
  const [wonRateError, setWonRateError] = useState(false);

  const [atRisk, setAtRisk] = useState(null);
  const [overdueDays, setOverdueDays] = useState(3);
  const [atRiskLoading, setAtRiskLoading] = useState(true);
  const [atRiskError, setAtRiskError] = useState(false);

  // Legacy Dashboard States (EPIC-3 & EPIC-4)
  const [legacyWonRate, setLegacyWonRate] = useState([]);
  const [legacyLeadVolume, setLegacyLeadVolume] = useState([]);
  const [legacyAtRiskLeads, setLegacyAtRiskLeads] = useState([]);
  const [legacyAtRiskTotal, setLegacyAtRiskTotal] = useState(0);
  const [legacyAtRiskLoading, setLegacyAtRiskLoading] = useState(false);
  const [legacyAtRiskError, setLegacyAtRiskError] = useState(false);

  const [hoveredBar, setHoveredBar] = useState(null);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load categories on mount
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    async function loadCats() {
      try {
        const res = await fetchCategories({ status: 'Active' });
        if (res.success) {
          setCategories(res.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCats();
  }, [isAuthenticated, isAdmin]);

  // Load cascading subcategories
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      setSelectedSubCategory('');
      return;
    }
    async function loadSubs() {
      try {
        const res = await fetchSubCategories(selectedCategory, { status: 'Active' });
        if (res.success) {
          setSubCategories(res.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadSubs();
    setSelectedSubCategory('');
  }, [selectedCategory]);

  // Main fetch wrapper (EPIC-6)
  const fetchKpisData = async () => {
    setKpisLoading(true);
    setKpisError(false);
    try {
      const params = {
        category_id: selectedCategory,
        sub_category_id: selectedSubCategory,
        from: appliedDateRange.from,
        to: appliedDateRange.to
      };
      const res = await fetchDashboardKpis(params);
      if (res.success) {
        setKpis(res.data);
      } else {
        setKpisError(true);
      }
    } catch (e) {
      setKpisError(true);
    } finally {
      setKpisLoading(false);
    }
  };

  const fetchCategoryVolumeData = async () => {
    setCategoryVolumeLoading(true);
    setCategoryVolumeError(false);
    try {
      const params = {
        category_id: selectedCategory,
        from: appliedDateRange.from,
        to: appliedDateRange.to
      };
      const res = await fetchCategoryVolume(params);
      if (res.success) {
        setCategoryVolume(res.data || []);
      } else {
        setCategoryVolumeError(true);
      }
    } catch (e) {
      setCategoryVolumeError(true);
    } finally {
      setCategoryVolumeLoading(false);
    }
  };

  const fetchWonRateData = async () => {
    setWonRateLoading(true);
    setWonRateError(false);
    try {
      const params = {
        from: appliedDateRange.from,
        to: appliedDateRange.to
      };
      const res = await fetchWonRateBySource(params);
      if (res.success) {
        setWonRate(res.data || []);
      } else {
        setWonRateError(true);
      }
    } catch (e) {
      setWonRateError(true);
    } finally {
      setWonRateLoading(false);
    }
  };

  const fetchAtRiskData = async () => {
    setAtRiskLoading(true);
    setAtRiskError(false);
    try {
      const params = {
        overdue_days: overdueDays,
        from: appliedDateRange.from,
        to: appliedDateRange.to
      };
      const res = await fetchAdminAtRisk(params);
      if (res.success) {
        setAtRisk(res.data);
      } else {
        setAtRiskError(true);
      }
    } catch (e) {
      setAtRiskError(true);
    } finally {
      setAtRiskLoading(false);
    }
  };

  // Fetch Legacy data for EPIC-3 & EPIC-4
  const fetchLegacyData = async () => {
    const params = {
      category_id: selectedCategory,
      sub_category_id: selectedSubCategory
    };
    try {
      const [wonRateRes, volumeRes] = await Promise.all([
        fetchWonRateByCategory(params).catch(() => ({ success: false })),
        fetchLeadVolumeByCategory(params).catch(() => ({ success: false }))
      ]);
      if (wonRateRes.success) setLegacyWonRate(wonRateRes.data || []);
      if (volumeRes.success) setLegacyLeadVolume(volumeRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLegacyAtRiskData = async () => {
    setLegacyAtRiskLoading(true);
    setLegacyAtRiskError(false);
    try {
      const res = await fetchAtRiskLeads(3);
      if (res.success) {
        setLegacyAtRiskLeads(res.data?.leads || []);
        setLegacyAtRiskTotal(res.data?.total_at_risk ?? 0);
      } else {
        setLegacyAtRiskError(true);
      }
    } catch (err) {
      setLegacyAtRiskError(true);
    } finally {
      setLegacyAtRiskLoading(false);
    }
  };

  // Trigger loads on filter/date range updates
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchKpisData();
      fetchCategoryVolumeData();
      fetchWonRateData();
      fetchLegacyData();
    }
  }, [isAuthenticated, isAdmin, selectedCategory, selectedSubCategory, appliedDateRange]);

  // Trigger at risk load when overdue days changes
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchAtRiskData();
      fetchLegacyAtRiskData();
    }
  }, [isAuthenticated, isAdmin, overdueDays, appliedDateRange]);

  // Handle Date range picker Apply
  const handleApplyDateRange = (e) => {
    e.preventDefault();
    setAppliedDateRange({ from: dateFrom, to: dateTo });
  };

  // Handle report exporting
  const handleExportReport = async (reportType) => {
    try {
      const params = {
        report: reportType,
        format: 'excel',
        category_id: selectedCategory,
        sub_category_id: selectedSubCategory
      };
      const blob = await exportReport(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export report failed', err);
    }
  };

  // Enforce access control
  if (!isAuthenticated || !user) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" data-testid="access-denied">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-red-600 text-5xl mb-3">gpp_maybe</span>
          <h1 className="text-headline-md font-headline-md text-red-900">Access Denied</h1>
          <p className="mt-2 text-body-md text-red-800">You do not have administrative privileges to view this dashboard.</p>
        </div>
      </div>
    );
  }

  if (kpisLoading && !kpis) {
    return <AdminDashboardSkeleton />;
  }

  // Determine win rate bar color
  const getSourceColor = (winRateStr) => {
    const val = parseFloat(winRateStr || '0');
    if (val >= 10) return 'bg-emerald-500';
    if (val >= 5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Header Section with Title, Export Buttons, and Date Picker */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
        <div>
          <h1 className="font-display-lg text-display-md md:text-display-lg text-primary mb-1">
            Lead Segment Insights
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Real-time aggregate conversion KPIs, volumes, and user follow-up metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleExportReport('category-breakdown')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-on-surface border border-outline-variant rounded-xl font-label-md text-label-md hover:bg-surface-container-low transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Segment Report
          </button>
          <button
            onClick={() => handleExportReport('lead-conversion')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl font-label-md text-label-md hover:bg-primary/95 transition-all duration-200 active:scale-95 shadow-sm hover:shadow-primary/25 hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px]">download_2</span>
            Export Conversion Report
          </button>

          {/* Date Range Picker form */}
          <form onSubmit={handleApplyDateRange} className="flex flex-wrap items-end gap-3 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-outline-variant/20 shadow-sm">
            <label className="flex flex-col gap-1 text-[11px] font-bold text-on-surface-variant">
              From Date
              <input
                type="date"
                aria-label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-xl border border-outline-variant bg-white px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-on-surface-variant">
              To Date
              <input
                type="date"
                aria-label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-xl border border-outline-variant bg-white px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </label>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-primary text-white text-label-md font-bold hover:bg-primary/95 transition-colors focus:ring-2 focus:ring-primary/20"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Segment Cascading Dropdowns */}
      <div className="glass-card p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 shadow-sm">
        <label className="flex flex-col gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-primary">category</span>
            Business Category
          </span>
          <select
            id="dashboard-category-filter"
            aria-label="Business Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-11 rounded-xl border border-outline-variant bg-white px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.category_name || cat.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
            Business Sub-Category
          </span>
          <select
            id="dashboard-subcategory-filter"
            aria-label="Business Sub-Category"
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            disabled={!selectedCategory}
            className="h-11 rounded-xl border border-outline-variant bg-white px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:bg-surface-container-low disabled:cursor-not-allowed"
          >
            <option value="">All Sub-Categories</option>
            {subCategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.sub_category_name || sub.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* KPI Cards Section */}
      {kpisError ? (
        <div className="p-6 border border-error/20 bg-error/5 text-error rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-3xl mb-1.5">error</span>
          <p className="font-semibold">Failed to load dashboard data</p>
          <button 
            onClick={fetchKpisData}
            className="mt-3 px-4 py-2 bg-error text-white rounded-xl text-label-sm font-bold shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Card 1: Total Leads */}
            <div className="glass-card p-4 relative overflow-hidden flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-sm" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">leaderboard</span>
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5 text-[11px]">Total Leads</h3>
                <p className="text-headline-md font-display-md text-on-surface">{kpis?.total_leads ?? 0}</p>
              </div>
            </div>

            {/* Card 2: Today's Followups */}
            <div 
              onClick={() => navigate('/admin/leads?followup=today')}
              className="glass-card p-4 relative overflow-hidden flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-sm cursor-pointer hover:border-primary/30" 
              role="status" 
              aria-live="polite"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5 text-[11px]">Today's Follow-ups</h3>
                <p className="text-headline-md font-display-md text-amber-700">{kpis?.today_followups ?? 0}</p>
              </div>
            </div>

            {/* Card 3: New Leads */}
            <div className="glass-card p-4 relative overflow-hidden flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-sm" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">fiber_new</span>
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5 text-[11px]">New</h3>
                <p className="text-headline-md font-display-md text-blue-600">{kpis?.new ?? 0}</p>
              </div>
            </div>

            {/* Card 4: Won Leads */}
            <div className="glass-card p-4 relative overflow-hidden flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-sm" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">emoji_events</span>
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5 text-[11px]">Won</h3>
                <p className="text-headline-md font-display-md text-emerald-600">{kpis?.won ?? 0}</p>
              </div>
            </div>

            {/* Card 5: Lost Leads */}
            <div className="glass-card p-4 relative overflow-hidden flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-sm" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">cancel</span>
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5 text-[11px]">Lost</h3>
                <p className="text-headline-md font-display-md text-rose-600">{kpis?.lost ?? 0}</p>
              </div>
            </div>

            {/* Card 6: Conversion Rate */}
            <div className="glass-card p-4 relative overflow-hidden flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-sm" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">percent</span>
              </div>
              <div>
                <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5 text-[11px]">Conversion Rate</h3>
                <p className="text-headline-md font-display-md text-violet-600">{kpis?.conversion_rate ?? '0.00%'}</p>
              </div>
            </div>
          </div>

          {/* Quality Breakdown Card */}
          <div className="glass-card p-5 rounded-2xl shadow-sm border border-outline-variant/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Lead Quality Breakdown</h4>
              <p className="text-body-sm text-on-surface-variant">Hot, Warm and Cold leads distribution</p>
            </div>
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="text-body-md text-on-surface font-semibold">Hot: <strong className="text-rose-600">{kpis?.hot_leads ?? 0}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-body-md text-on-surface font-semibold">Warm: <strong className="text-amber-600">{kpis?.warm_leads ?? 0}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-body-md text-on-surface font-semibold">Cold: <strong className="text-blue-600">{kpis?.cold_leads ?? 0}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widgets Grid (EPIC-6 Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Volume Widget (Grouped/Horizontal Bar Chart) */}
        <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">Category Volume</h3>
          <p className="text-xs text-on-surface-variant mb-6">Lead count distribution across parent and subcategories</p>
          
          {categoryVolumeLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : categoryVolumeError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-error p-4">
              <span className="material-symbols-outlined text-3xl mb-1">error</span>
              <p className="text-body-sm font-semibold">Failed to load category volume data</p>
              <button 
                onClick={fetchCategoryVolumeData}
                className="mt-3 px-3 py-1.5 bg-error text-white rounded-xl text-[11px] font-bold"
              >
                Retry
              </button>
            </div>
          ) : categoryVolume.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
              <span className="material-symbols-outlined text-[48px] mb-2 text-outline">bar_chart</span>
              <p className="text-body-md font-medium">No data available for this period</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start">
              <div 
                className="space-y-4 pr-2 max-h-[250px] overflow-y-auto"
                role="img" 
                aria-label="Category Volume Horizontal Bar Chart"
              >
                {categoryVolume.map((item, idx) => {
                  const maxVal = Math.max(...categoryVolume.map(d => Number(d.lead_count || 0)), 1);
                  const pct = Math.max((Number(item.lead_count || 0) / maxVal) * 100, 5);
                  return (
                    <div 
                      key={idx} 
                      className="space-y-1 group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBar({ name: `${item.category}/${item.sub_category}`, count: item.lead_count })}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <div className="flex justify-between text-body-sm font-medium">
                        <span className="text-on-surface truncate pr-2">{item.category} / {item.sub_category}</span>
                        <span className="text-primary font-bold">{item.lead_count}</span>
                      </div>
                      <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 group-hover:bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hoveredBar && (
                <div className="mt-4 p-2 bg-on-surface/95 text-white rounded-xl text-xs flex justify-between items-center max-w-xs border border-white/10 shadow-lg">
                  <span className="font-bold truncate mr-3">{hoveredBar.name}</span>
                  <span className="font-medium text-primary-fixed-dim">{hoveredBar.count} leads total</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Won Rate by Source Widget */}
        <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">Win Rate by Source</h3>
          <p className="text-xs text-on-surface-variant mb-6">Percentage of won outcomes per marketing channel</p>

          {wonRateLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : wonRateError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-error p-4">
              <span className="material-symbols-outlined text-3xl mb-1">error</span>
              <p className="text-body-sm font-semibold">Failed to load won rate by source data</p>
              <button 
                onClick={fetchWonRateData}
                className="mt-3 px-3 py-1.5 bg-error text-white rounded-xl text-[11px] font-bold"
              >
                Retry
              </button>
            </div>
          ) : wonRate.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
              <span className="material-symbols-outlined text-[48px] mb-2 text-outline">info</span>
              <p className="text-body-md font-medium">No closed leads for this period</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start">
              <div 
                className="space-y-4 pr-2 max-h-[250px] overflow-y-auto"
                role="img" 
                aria-label="Win Rate by Source color-coded Bar Chart"
              >
                {wonRate.map((item, idx) => {
                  const pct = parseFloat(item.win_rate || '0');
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-body-sm font-medium">
                        <span className="text-on-surface font-semibold">{item.source}</span>
                        <span className="font-bold text-on-surface-variant">{item.win_rate}</span>
                      </div>
                      <div className="h-3.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getSourceColor(item.win_rate)} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-on-surface-variant">
                        <span>TotalClosed: {item.total}</span>
                        <span>Won: {item.won} | Lost: {item.lost}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* At Risk Widget */}
        <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm border border-outline-variant/20 bg-white/40 xl:col-span-2">
          {atRiskLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : atRiskError ? (
            <div className="h-full flex flex-col items-center justify-center text-error p-4">
              <span className="material-symbols-outlined text-3xl mb-1">error</span>
              <p className="text-body-sm font-semibold">Failed to load at-risk leads</p>
              <button 
                onClick={fetchAtRiskData}
                className="mt-3 px-3 py-1.5 bg-error text-white rounded-xl text-[11px] font-bold"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant/10 pb-3 mb-5 gap-3">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    At Risk Leads: {atRisk?.total_at_risk ?? 0}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Leads with overdue next follow-up dates</p>
                </div>

                {/* Overdue threshold input dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-on-surface-variant">Threshold:</span>
                  <select
                    aria-label="Overdue threshold days"
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-outline-variant bg-white text-body-sm text-on-surface focus:outline-none"
                  >
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={10}>10 Days</option>
                  </select>
                </div>
              </div>

              {atRisk?.total_at_risk === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-emerald-600 font-bold">check_circle</span>
                  <p className="text-body-md font-medium text-center">No at-risk leads</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Breakdown section */}
                  {atRisk?.breakdown && atRisk.breakdown.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Breakdown by User</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {atRisk.breakdown.map((userBreak, index) => (
                          <div key={index} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                            <p className="text-body-sm font-bold text-on-surface">{userBreak.user_name || 'Unassigned'}</p>
                            <p className="text-body-md text-rose-600 font-extrabold mt-1">{userBreak.at_risk_count} Leads</p>
                            {userBreak.oldest_overdue_days && (
                              <p className="text-[10px] text-on-surface-variant mt-0.5">Oldest: {userBreak.oldest_overdue_days} days overdue</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overdue Leads Table */}
                  {atRisk?.leads && atRisk.leads.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Overdue Leads</h4>
                      <div className="overflow-hidden border border-outline-variant/20 rounded-xl bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm border-b border-outline-variant/10">
                            <tr>
                              <th className="p-3">Lead ID</th>
                              <th className="p-3">Company</th>
                              <th className="p-3">Assigned Owner</th>
                              <th className="p-3 text-right">Overdue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
                            {atRisk.leads.map((lead) => (
                              <tr 
                                key={lead.id} 
                                onClick={() => navigate(`/admin/leads/${lead.id || lead.lead_id}`)}
                                className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                              >
                                <td className="p-3 font-semibold text-primary">{lead.lead_id}</td>
                                <td className="p-3 truncate max-w-[150px]">{lead.company_name}</td>
                                <td className="p-3">{lead.assigned_to || 'Unassigned'}</td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className="text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {lead.days_overdue} days
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BACKWARD COMPATIBILITY ROW: Legacy EPIC-3 & EPIC-4 widgets */}
      <div className="border-t border-outline-variant/15 pt-8 mt-10 space-y-6">
        <h2 className="text-headline-sm font-semibold text-on-surface-variant">Segment & Follow-up Performance Summary</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Legacy Won-Rate by Business Category Widget */}
          <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-5 border-b border-outline-variant/10 pb-3">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Won-Rate by Business Category</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Won leads vs total closed outcomes per segment</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {legacyWonRate.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-outline">info</span>
                  <p className="text-body-md font-medium">No closed leads data available</p>
                </div>
              ) : (
                legacyWonRate.map((item) => {
                  const pct = parseFloat(item.win_rate || '0');
                  return (
                    <div key={item.category_id || item.id} className="space-y-1.5">
                      <div className="flex justify-between text-body-sm font-medium">
                        <span className="text-on-surface">{item.category_name}</span>
                        <span className="text-primary font-bold">{item.win_rate}</span>
                      </div>
                      <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-on-surface-variant opacity-80">
                        <span>Closed: {item.total_closed}</span>
                        <span>Won: {item.won} | Lost: {item.lost}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legacy Lead Volume by Category Widget */}
          <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-5 border-b border-outline-variant/10 pb-3">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Lead Volume by Category</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Total count distribution across segments</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end relative mt-6 min-h-[220px]">
              {hoveredBar && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-on-surface/95 backdrop-blur-[4px] text-surface text-xs rounded-xl px-3 py-2 shadow-xl z-20 pointer-events-none transition-all duration-200 border border-white/10 text-white">
                  <p className="font-bold text-center">{hoveredBar.name}</p>
                  <p className="text-center font-medium mt-0.5 text-primary-fixed-dim">{hoveredBar.count} leads</p>
                </div>
              )}
              {legacyLeadVolume.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-outline">leaderboard</span>
                  <p className="text-body-md font-medium">No lead volume data available</p>
                </div>
              ) : (
                <div className="flex items-end justify-around h-48 w-full gap-4 pt-4 border-b border-outline-variant/30">
                  {legacyLeadVolume.map((item) => {
                    const maxVal = Math.max(...legacyLeadVolume.map(d => parseInt(d.lead_count || '0')), 1);
                    const pct = Math.max((parseInt(item.lead_count || '0') / maxVal) * 100, 8);
                    return (
                      <div
                        key={item.category_id || item.id}
                        className="flex-1 flex flex-col items-center group cursor-pointer"
                        onMouseEnter={() => setHoveredBar({ name: item.category_name, count: item.lead_count })}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <div className="w-full relative flex justify-center">
                          <div
                            className="bg-gradient-to-t from-primary/30 to-primary/80 hover:from-primary/50 hover:to-primary rounded-t-lg transition-all duration-300 w-10 sm:w-16 group-hover:scale-x-105"
                            style={{ height: `${pct * 1.5}px` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-medium mt-2.5 truncate w-full text-center group-hover:text-primary transition-colors" title={item.category_name}>
                          {item.category_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Legacy At Risk Follow-ups Widget */}
          <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm border border-outline-variant/20 bg-white/40 xl:col-span-2">
            <div className="flex justify-between items-center mb-5 border-b border-outline-variant/10 pb-3">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                  At Risk Follow-ups
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-xs rounded-full">
                    {legacyAtRiskTotal}
                  </span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Leads overdue by 3 or more calendar days</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {legacyAtRiskLoading ? (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
                </div>
              ) : legacyAtRiskError ? (
                <div className="h-full flex flex-col items-center justify-center text-error p-4">
                  <span className="material-symbols-outlined text-3xl mb-1">error</span>
                  <p className="text-body-sm font-semibold">Failed to load at-risk leads</p>
                </div>
              ) : legacyAtRiskLeads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-emerald-600 font-bold">check_circle</span>
                  <p className="text-body-md font-medium text-center">No leads are currently at risk. All follow-ups are on track.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {legacyAtRiskLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      onClick={() => navigate(`/admin/leads/${lead.id || lead.lead_id}`)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/60 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-outline-variant/30 shadow-sm"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-on-surface font-semibold text-label-md truncate">
                          {lead.company_name}
                        </span>
                        <span className="text-on-surface-variant text-label-sm">
                          Owner: {lead.assigned_to || 'Unassigned'}
                        </span>
                      </div>
                      <span className="text-red-800 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                        {lead.days_overdue} days overdue
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
