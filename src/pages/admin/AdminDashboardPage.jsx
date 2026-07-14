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

// Determine win rate bar color
const getSourceColor = (winRateStr) => {
  const val = parseFloat(winRateStr || '0');
  if (val >= 10) return 'bg-emerald-500';
  if (val >= 5) return 'bg-amber-500';
  return 'bg-rose-500';
};

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
  const [applying, setApplying] = useState(false);
  const [exporting, setExporting] = useState(null);

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
      const load = async () => {
        try {
          await Promise.all([
            fetchKpisData(),
            fetchCategoryVolumeData(),
            fetchWonRateData(),
            fetchLegacyData()
          ]);
        } finally {
          setApplying(false);
        }
      };
      load();
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
    setApplying(true);
    setAppliedDateRange({ from: dateFrom, to: dateTo });
  };

  const handleResetDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setApplying(true);
    setAppliedDateRange({ from: '', to: '' });
  };

  // Handle report exporting
  const handleExportReport = async (reportType) => {
    setExporting(reportType);
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
    } finally {
      setExporting(null);
    }
  };

  // Enforce access control
  if (!isAuthenticated || !user) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" data-testid="access-denied">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-red-500 mb-4 animate-bounce">gpp_maybe</span>
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 text-sm mb-6">You need Admin privileges to access this page.</p>
          <button onClick={() => navigate('/app/login')} className="px-6 py-2.5 bg-primary text-white rounded-xl font-label-md text-label-md hover:bg-primary-hover active:scale-95 transition-all">Go to Login</button>
        </div>
      </div>
    );
  }

  if (kpisLoading && categoryVolumeLoading && wonRateLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Lead Segment Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Real-time aggregate conversion KPIs, volumes, and user follow-up metrics.
          </p>
        </div>

        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
          {/* Export buttons container aligned nicely */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleExportReport('category-breakdown')}
              disabled={exporting !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs transition-all duration-150 active:scale-[0.98] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'category-breakdown' ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Export Segment Report</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleExportReport('lead-conversion')}
              disabled={exporting !== null}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container shadow-xs transition-all duration-150 active:scale-[0.98] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'lead-conversion' ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">download_2</span>
                  <span>Export Conversion Report</span>
                </>
              )}
            </button>
          </div>

          {/* Date Range Picker form */}
          <form onSubmit={handleApplyDateRange} className="flex flex-wrap items-end gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</span>
              <input
                type="date"
                aria-label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
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
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</span>
              <input
                type="date"
                aria-label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
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
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={applying}
              className="h-9 px-4 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {applying ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Applying...</span>
                </>
              ) : (
                'Apply'
              )}
            </button>
            <button
              type="button"
              onClick={handleResetDateRange}
              disabled={applying || (!dateFrom && !dateTo && !appliedDateRange.from && !appliedDateRange.to)}
              className="h-9 px-4 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              Reset
            </button>
          </form>
        </div>
      </div>

      {/* Segment Cascading Dropdowns */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-5 shadow-sm glass-card">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[16px] text-primary">category</span>
            Business Category
          </span>
          <select
            id="dashboard-category-filter"
            aria-label="Business Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.category_name || cat.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
            Business Sub-Category
          </span>
          <select
            id="dashboard-subcategory-filter"
            aria-label="Business Sub-Category"
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            disabled={!selectedCategory}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
        <div className="p-6 border border-red-200 bg-red-50 text-red-800 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-3xl mb-1.5">error</span>
          <p className="font-semibold">Failed to load dashboard data</p>
          <button 
            onClick={fetchKpisData}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-lg text-xs font-bold shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Card 1: Total Leads */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden flex items-center gap-3 hover:border-slate-300 shadow-xs transition-all duration-200 glass-card" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">leaderboard</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-[10px] truncate">Total Leads</h3>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{kpis?.total_leads ?? 0}</p>
              </div>
            </div>

            {/* Card 2: Today's Followups */}
            <div 
              onClick={() => navigate('/admin/leads?followup=today')}
              className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden flex items-center gap-3 hover:border-amber-300 shadow-xs cursor-pointer transition-all duration-200 glass-card" 
              role="status" 
              aria-live="polite"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-[10px] truncate">Today's Follow-ups</h3>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{kpis?.today_followups ?? 0}</p>
              </div>
            </div>

            {/* Card 3: New Leads */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden flex items-center gap-3 hover:border-blue-300 shadow-xs transition-all duration-200 glass-card" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-150 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">fiber_new</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-[10px] truncate">New</h3>
                <p className="text-lg font-bold text-indigo-600 mt-0.5">{kpis?.new ?? 0}</p>
              </div>
            </div>

            {/* Card 4: Won Leads */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden flex items-center gap-3 hover:border-emerald-300 shadow-xs transition-all duration-200 glass-card" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">emoji_events</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-[10px] truncate">Won</h3>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">{kpis?.won ?? 0}</p>
              </div>
            </div>

            {/* Card 5: Lost Leads */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden flex items-center gap-3 hover:border-red-300 shadow-xs transition-all duration-200 glass-card" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-650 border border-red-150 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">cancel</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-[10px] truncate">Lost</h3>
                <p className="text-lg font-bold text-red-650 mt-0.5">{kpis?.lost ?? 0}</p>
              </div>
            </div>

            {/* Card 6: Conversion Rate */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 relative overflow-hidden flex items-center gap-3 hover:border-purple-300 shadow-xs transition-all duration-200 glass-card" role="status" aria-live="polite">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 border border-purple-150 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">percent</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-[10px] truncate">Conversion Rate</h3>
                <p className="text-lg font-bold text-purple-600 mt-0.5">{kpis?.conversion_rate ?? '0.00%'}</p>
              </div>
            </div>
          </div>

          {/* Quality Breakdown Card */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Lead Quality Breakdown</h4>
              <p className="text-xs text-slate-500">Hot, Warm and Cold leads distribution</p>
            </div>
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-sm text-slate-700 font-medium">Hot: <strong className="text-red-600">{kpis?.hot_leads ?? 0}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-sm text-slate-700 font-medium">Warm: <strong className="text-amber-600">{kpis?.warm_leads ?? 0}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-sm text-slate-700 font-medium">Cold: <strong className="text-blue-600">{kpis?.cold_leads ?? 0}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widgets Grid (EPIC-6 Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Volume Widget (Grouped/Horizontal Bar Chart) */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl relative min-h-[380px] flex flex-col shadow-sm glass-card">
          <h3 className="text-base font-semibold text-slate-900 mb-0.5">Category Volume</h3>
          <p className="text-xs text-slate-500 mb-6">Lead count distribution across parent and subcategories</p>
          
          {categoryVolumeLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : categoryVolumeError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-red-600 p-4">
              <span className="material-symbols-outlined text-3xl mb-1">error</span>
              <p className="text-sm font-semibold">Failed to load category volume data</p>
              <button 
                onClick={fetchCategoryVolumeData}
                className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : categoryVolume.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10 opacity-70">
              <span className="material-symbols-outlined text-[48px] mb-2 text-outline">bar_chart</span>
              <p className="text-sm font-semibold">No data available for this period</p>
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
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800 truncate pr-2">{item.category} / {item.sub_category}</span>
                        <span className="text-primary font-bold">{item.lead_count}</span>
                      </div>
                      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
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
                <div className="mt-4 p-2 bg-slate-900 text-white rounded-lg text-xs flex justify-between items-center max-w-xs border border-slate-850 shadow-lg">
                  <span className="font-bold truncate mr-3">{hoveredBar.name}</span>
                  <span className="font-medium text-blue-200">{hoveredBar.count} leads total</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Win Rate by Source Widget */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl relative min-h-[380px] flex flex-col shadow-sm glass-card">
          <h3 className="text-base font-semibold text-slate-900 mb-0.5">Win Rate by Source</h3>
          <p className="text-xs text-slate-500 mb-6">Percentage of won outcomes per marketing channel</p>

          {wonRateLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : wonRateError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-red-600 p-4">
              <span className="material-symbols-outlined text-3xl mb-1">error</span>
              <p className="text-sm font-semibold">Failed to load won rate by source data</p>
              <button 
                onClick={fetchWonRateData}
                className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : wonRate.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10 opacity-70">
              <span className="material-symbols-outlined text-[48px] mb-2 text-outline">info</span>
              <p className="text-sm font-semibold">No closed leads for this period</p>
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
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{item.source}</span>
                        <span className="font-bold text-slate-600">{item.win_rate}</span>
                      </div>
                      <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getSourceColor(item.win_rate)} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
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
        <div className="bg-white border border-slate-200 p-6 rounded-xl relative min-h-[380px] flex flex-col shadow-sm lg:col-span-2 glass-card">
          {atRiskLoading ? (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          ) : atRiskError ? (
            <div className="h-full flex flex-col items-center justify-center text-red-600 p-4">
              <span className="material-symbols-outlined text-3xl mb-1">error</span>
              <p className="text-sm font-semibold">Failed to load at-risk leads</p>
              <button 
                onClick={fetchAtRiskData}
                className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    At Risk Leads: {atRisk?.total_at_risk ?? 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Leads with overdue next follow-up dates</p>
                </div>

                {/* Overdue threshold input dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Threshold:</span>
                  <select
                    aria-label="Overdue threshold days"
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(e.target.value)}
                    className="h-8 pl-2 pr-8 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
                  >
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={10}>10 Days</option>
                  </select>
                </div>
              </div>

              {atRisk?.total_at_risk === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-emerald-600 font-bold">check_circle</span>
                  <p className="text-sm font-semibold text-center">No at-risk leads</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Breakdown section */}
                  {atRisk?.breakdown && atRisk.breakdown.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Breakdown by User</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {atRisk.breakdown.map((userBreak, index) => (
                          <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                            <p className="text-xs font-bold text-slate-800">{userBreak.user_name || 'Unassigned'}</p>
                            <p className="text-sm text-red-600 font-extrabold mt-1">{userBreak.at_risk_count} Leads</p>
                            {userBreak.oldest_overdue_days && (
                              <p className="text-[10px] text-slate-400 mt-0.5">Oldest: {userBreak.oldest_overdue_days} days overdue</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overdue Leads Table */}
                  {atRisk?.leads && atRisk.leads.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Leads</h4>
                      <div className="overflow-hidden border border-slate-200 rounded-lg bg-white shadow-inner">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                            <tr>
                              <th className="p-3 font-semibold">Lead ID</th>
                              <th className="p-3 font-semibold">Company</th>
                              <th className="p-3 font-semibold">Assigned Owner</th>
                              <th className="p-3 font-semibold text-right">Overdue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {atRisk.leads.map((lead) => (
                              <tr 
                                key={lead.id} 
                                onClick={() => navigate(`/admin/leads/${lead.id || lead.lead_id}`)}
                                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                              >
                                <td className="p-3 font-semibold text-primary">{lead.lead_id}</td>
                                <td className="p-3 truncate max-w-[150px]">{lead.company_name}</td>
                                <td className="p-3">{lead.assigned_to || 'Unassigned'}</td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-xs font-bold">
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
      <div className="border-t border-slate-250 pt-8 mt-10 space-y-6">
        <h2 className="text-base font-bold text-slate-700 uppercase tracking-wider">Segment & Follow-up Performance Summary</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Legacy Won-Rate by Business Category Widget */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl relative min-h-[380px] flex flex-col shadow-sm glass-card">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Won-Rate by Business Category</h3>
                <p className="text-xs text-slate-500 mt-0.5">Won leads vs total closed outcomes per segment</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {legacyWonRate.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-outline">info</span>
                  <p className="text-sm font-medium">No closed leads data available</p>
                </div>
              ) : (
                legacyWonRate.map((item) => {
                  const pct = parseFloat(item.win_rate || '0');
                  return (
                    <div key={item.category_id || item.id} className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-slate-800">{item.category_name}</span>
                        <span className="text-primary font-bold">{item.win_rate}</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-505"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-550">
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
          <div className="bg-white border border-slate-200 p-6 rounded-xl relative min-h-[380px] flex flex-col shadow-sm glass-card">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Lead Volume by Category</h3>
                <p className="text-xs text-slate-500 mt-0.5">Total count distribution across segments</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end relative mt-6 min-h-[220px]">
              {hoveredBar && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-20 pointer-events-none transition-all duration-200 border border-slate-850">
                  <p className="font-bold text-center">{hoveredBar.name}</p>
                  <p className="text-center font-medium mt-0.5 text-blue-200">{hoveredBar.count} leads</p>
                </div>
              )}
              {legacyLeadVolume.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-outline">leaderboard</span>
                  <p className="text-sm font-medium">No lead volume data available</p>
                </div>
              ) : (
                <div className="flex items-end justify-around h-48 w-full gap-4 pt-4 border-b border-slate-200">
                  {legacyLeadVolume.map((item) => {
                    const maxVal = Math.max(...legacyLeadVolume.map(d => parseInt(d.lead_count || '0')), 1);
                    const pct = Math.max((parseInt(item.lead_count || '0') / maxVal) * 105, 8);
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
                        <span className="text-[10px] text-slate-500 font-semibold mt-2.5 truncate w-full text-center group-hover:text-primary transition-colors" title={item.category_name}>
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
          <div className="bg-white border border-slate-200 p-6 rounded-xl relative min-h-[380px] flex flex-col shadow-sm lg:col-span-2 glass-card">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  At Risk Follow-ups
                  <span className="px-2 py-0.5 bg-red-100 text-red-850 font-bold text-xs rounded-full">
                    {legacyAtRiskTotal}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Leads overdue by 3 or more calendar days</p>
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
                  <p className="text-xs font-semibold">Failed to load at-risk leads</p>
                </div>
              ) : legacyAtRiskLeads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-70">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-emerald-600 font-bold">check_circle</span>
                  <p className="text-sm font-semibold text-center">No leads are currently at risk. All follow-ups are on track.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {legacyAtRiskLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      onClick={() => navigate(`/admin/leads/${lead.id || lead.lead_id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer border border-slate-150 shadow-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-slate-800 font-bold text-xs truncate">
                          {lead.company_name}
                        </span>
                        <span className="text-slate-500 text-[10px] mt-0.5">
                          Owner: {lead.assigned_to || 'Unassigned'}
                        </span>
                      </div>
                      <span className="text-red-750 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
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
