import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Skeleton from '../../components/common/Skeleton';
import {
  fetchCategories,
  fetchSubCategories,
  fetchDashboardKpis,
  fetchWonRateByCategory,
  fetchLeadVolumeByCategory,
  exportReport
} from '../../services/leadService';

function AdminDashboardSkeleton() {
  return (
    <div className="mt-4 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-64 bg-surface-container-highest rounded-lg mb-2"></div>
          <div className="h-4 w-96 bg-surface-container-highest rounded-lg"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-44 bg-surface-container-highest rounded-xl"></div>
          <div className="h-10 w-44 bg-surface-container-highest rounded-xl"></div>
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="glass-card p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-surface-container-highest rounded"></div>
          <div className="h-11 w-full bg-surface-container-highest rounded-xl"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-surface-container-highest rounded"></div>
          <div className="h-11 w-full bg-surface-container-highest rounded-xl"></div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-highest shrink-0"></div>
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-surface-container-highest rounded"></div>
              <div className="h-7 w-16 bg-surface-container-highest rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Widgets Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-[380px] flex flex-col space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant/10">
            <div className="h-6 w-56 bg-surface-container-highest rounded"></div>
            <div className="h-4 w-28 bg-surface-container-highest rounded"></div>
          </div>
          <div className="flex-1 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-surface-container-highest rounded"></div>
                  <div className="h-4 w-12 bg-surface-container-highest rounded"></div>
                </div>
                <div className="h-2.5 w-full bg-surface-container-highest rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 h-[380px] flex flex-col space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant/10">
            <div className="h-6 w-44 bg-surface-container-highest rounded"></div>
            <div className="h-4 w-28 bg-surface-container-highest rounded"></div>
          </div>
          <div className="flex-1 flex items-end justify-around gap-4 h-48 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-12 bg-surface-container-highest rounded-t-lg" style={{ height: `${i * 20 + 20}px` }}></div>
                <div className="h-3 w-16 bg-surface-container-highest rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  // Story-2 state
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [kpis, setKpis] = useState(null);
  const [wonRateData, setWonRateData] = useState([]);
  const [leadVolumeData, setLeadVolumeData] = useState([]);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/app/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  // Load active categories on mount
  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  // Handle category changes and cascading subcategory fetch
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

  // Fetch KPI statistics, Won-rate lists and lead volume data
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadDashboardData() {
      setKpisLoading(true);
      const params = {
        category_id: selectedCategory,
        sub_category_id: selectedSubCategory
      };
      try {
        const [kpiRes, wonRateRes, volumeRes] = await Promise.all([
          fetchDashboardKpis(params).catch(() => ({ success: false })),
          fetchWonRateByCategory(params).catch(() => ({ success: false })),
          fetchLeadVolumeByCategory(params).catch(() => ({ success: false }))
        ]);
        
        if (kpiRes.success) setKpis(kpiRes.data);
        if (wonRateRes.success) setWonRateData(wonRateRes.data || []);
        if (volumeRes.success) setLeadVolumeData(volumeRes.data || []);
      } catch (e) {
        console.error('Error loading dashboard metrics', e);
      } finally {
        setKpisLoading(false);
      }
    }
    loadDashboardData();
  }, [isAuthenticated, selectedCategory, selectedSubCategory]);

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

  if (!isAuthenticated || !user) return null;
  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="mt-4 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-md md:text-display-lg text-primary mb-1">
            Lead Segment Insights
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Filter lead performance and conversion statistics by business segment.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
        </div>
      </div>

      {/* Global Filter Bar */}
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Leads */}
        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-4">
          {kpisLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="h-6 w-20 bg-surface-container-highest rounded animate-pulse"></div>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-2xl">leaderboard</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Total Leads</h3>
            <p className="text-display-md font-display-md text-on-surface">{kpis?.total_leads ?? 0}</p>
          </div>
        </div>

        {/* KPI 2: Won Leads */}
        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-4">
          {kpisLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="h-6 w-20 bg-surface-container-highest rounded animate-pulse"></div>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-2xl">emoji_events</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Won Leads</h3>
            <p className="text-display-md font-display-md text-emerald-600">{kpis?.won ?? kpis?.won_leads ?? 0}</p>
          </div>
        </div>

        {/* KPI 3: Lost Leads */}
        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-4">
          {kpisLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="h-6 w-20 bg-surface-container-highest rounded animate-pulse"></div>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-2xl">cancel</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Lost Leads</h3>
            <p className="text-display-md font-display-md text-rose-600">{kpis?.lost ?? kpis?.lost_leads ?? 0}</p>
          </div>
        </div>

        {/* KPI 4: Conversion Rate */}
        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-4">
          {kpisLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="h-6 w-20 bg-surface-container-highest rounded animate-pulse"></div>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-2xl">percent</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-sm uppercase tracking-wider mb-0.5">Conversion Rate</h3>
            <p className="text-display-md font-display-md text-violet-600">{kpis?.conversion_rate ?? '0.00%'}</p>
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Won-Rate Widget */}
        <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm">
          {kpisLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-5 border-b border-outline-variant/10 pb-3">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Won-Rate by Business Category</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Won leads vs total closed outcomes per segment</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {wonRateData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
                <span className="material-symbols-outlined text-[48px] mb-2 text-outline">info</span>
                <p className="text-body-md font-medium">No closed leads data available</p>
              </div>
            ) : (
              wonRateData.map((item) => {
                const pct = parseFloat(item.win_rate || '0');
                return (
                  <div key={item.category_id} className="space-y-1.5">
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

        {/* Lead Volume Widget */}
        <div className="glass-card p-6 relative min-h-[380px] flex flex-col shadow-sm">
          {kpisLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            </div>
          )}
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

            {leadVolumeData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-10 opacity-70">
                <span className="material-symbols-outlined text-[48px] mb-2 text-outline">leaderboard</span>
                <p className="text-body-md font-medium">No lead volume data available</p>
              </div>
            ) : (
              <div className="flex items-end justify-around h-48 w-full gap-4 pt-4 border-b border-outline-variant/30">
                {leadVolumeData.map((item) => {
                  const maxVal = Math.max(...leadVolumeData.map(d => parseInt(d.lead_count || '0')), 1);
                  const pct = Math.max((parseInt(item.lead_count || '0') / maxVal) * 100, 8); // min 8% height so bar is visible
                  return (
                    <div
                      key={item.category_id}
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
      </div>
    </div>
  );
}
