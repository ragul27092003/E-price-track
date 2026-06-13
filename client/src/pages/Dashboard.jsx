import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Package, CheckSquare, CheckCircle2, Clock, Bell,
  TrendingUp, Users, BarChart3, BarChart, Info,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { useStore, selectCurrentStoreId } from "@/store";
import { fetchCompetitorCountsData } from '../services/dashboardService';
import API from "../hooks/useApi"; // Ensure this matches your API hook path

// ─── animation presets ─────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── helpers ───────────────────────────────────────────────────────────────────
function parseSapTime(varEndTime) {
  if (!varEndTime) return { date: '--', time: '--' };
  const [date = '--', timeRaw = ''] = varEndTime.split(' ');
  const time = timeRaw.replace(/([AP]M)$/i, ' $1') || '--';
  return { date, time };
}

const fmtINR = (n) =>
  n != null ? Number(n).toLocaleString('en-IN') : '--';

const fmtCategory = (cat) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function extractRankData(doc) {
  if (!doc) return { date: '--', competitors: [] };
  return {
    date: doc.date || '--',
    competitors: doc.competitors || [],
  };
}

// Default colors for the pie chart slices
const CHART_COLORS = [
  "#0284c7", "#ea580c", "#16a34a", "#dc2626", 
  "#9333ea", "#ca8a04", "#475569", "#0d9488", 
  "#be123c", "#1d4ed8"
];

function KpiCard({ label, value, subtext, icon: Icon, color, bg, loading }) {
  return (
    <motion.div variants={itemVariants} className="bg-card rounded-xl p-5 card-shadow border border-border h-full hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      {/* Changed from <p> to <div> to allow custom layouts */}
      <div className="text-2xl font-bold text-foreground">
        {loading ? <span className="text-muted-foreground text-base animate-pulse">Loading…</span> : value}
      </div>
      <p className="text-sm font-semibold text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
      {subtext && <p className="text-[10px] text-muted-foreground mt-2 opacity-80">{subtext}</p>}
    </motion.div>
  );
}

function StatRow({ label, value, colorClass, isCurrency = false, percent = 100 }) {
  return (
    <div className="space-y-1.5 py-2">
      <div className="flex justify-between items-end">
        <span className="text-xl font-bold text-foreground">
          {isCurrency && <span className="text-sm mr-1">₹</span>}
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function TrendCard({ title, count, percent, total, progressColor, btnClass, titleColor, loading, onView }) {
  const pct = parseFloat(percent) || 0;
  return (
    <div className="bg-card rounded-xl p-4 card-shadow border border-border flex flex-col">
      <div className="flex justify-between items-start mb-1">
        <h4 className={`font-semibold text-sm leading-tight ${titleColor}`}>{title}</h4>
        <div className="text-right ml-2">
          <p className="text-2xl font-bold text-foreground leading-none">
            {loading
              ? <span className="text-base text-muted-foreground animate-pulse">…</span>
              : (count ?? '--')}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">of {total ?? '--'}</p>
        </div>
      </div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{percent ?? '0%'}</p>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${progressColor}`}
          style={{ width: pct > 0 ? `${Math.max(pct, 2)}%` : '0%' }}
        />
      </div>
      <button
        onClick={onView}
        className={`mt-auto w-full ${btnClass} text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 active:opacity-75`}
      >
        <Info className="h-3.5 w-3.5" />
        View
      </button>
    </div>
  );
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.04) return null; // Don't show labels for tiny slices
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};
// ─── Custom Pie Chart Tooltip ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1a1a1a] text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2 shadow-xl border border-[#333]">
        <span 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: data.color }}
        ></span>
        <span className="capitalize font-medium">{data.name}</span>
        <span className="font-bold">{data.displayPercent}%</span>
      </div>
    );
  }
  return null;
};

// ─── main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [hoveredComp, setHoveredComp] = useState(null);
  // Local state for the new Competitor Counts component
  const [compCounts, setCompCounts] = useState([]);
  const [compCountsLoading, setCompCountsLoading] = useState(true);

  const currentStoreId = useStore(selectCurrentStoreId);
  const showLsp        = useStore((s) => s.showLsp);
  const activeShopName = useStore((s) => s.activeShopName) || "Store";

  const {
    sapUpdateStatus, sapUpdateStatusLoading,
    overallStatistics, overallStatisticsLoading,
    rankAnalysis, rankAnalysisLoading,
    brandAnalyticsBrands, brandAnalyticsBrandsLoading,
    brandAnalyticsCategories, brandAnalyticsData, brandAnalyticsLoading,
    fetchSapUpdateStatus,
    fetchOverallStatistics,
    fetchRankAnalysis,
    fetchBrandAnalyticsBrands,
    fetchBrandAnalytics,
  } = useStore();

  useEffect(() => {
    fetchSapUpdateStatus();
    fetchOverallStatistics();
    fetchRankAnalysis();
    fetchBrandAnalyticsBrands();

   // Fetch the competitor counts for the list and pie chart
    const fetchCompetitorCounts = async () => {
      try {
        const data = await fetchCompetitorCountsData();
        setCompCounts(data);
      } catch (err) {
        console.error("Failed to fetch competitor counts", err);
      } finally {
        setCompCountsLoading(false);
      }
    };
    fetchCompetitorCounts();
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSelectedBrand('');
    setSelectedCategory('');
  }, [currentStoreId]);

  useEffect(() => {
    if (brandAnalyticsBrands.length > 0 && !selectedBrand) {
      const first = brandAnalyticsBrands[0];
      setSelectedBrand(first);
      fetchBrandAnalytics(first, '');
    }
  }, [brandAnalyticsBrands]);

  useEffect(() => {
    if (brandAnalyticsCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(brandAnalyticsCategories[0]);
    }
  }, [brandAnalyticsCategories]);

  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    setSelectedCategory('');
    fetchBrandAnalytics(brand, '');
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    fetchBrandAnalytics(selectedBrand, category);
  };

  // ── derived values ────────────────────────────────────────────────
  const sap = parseSapTime(sapUpdateStatus?.var_end_time);
  const stats = overallStatistics;
  const statsLoading = overallStatisticsLoading;

  const competitorValue = stats
    ? `${stats.varChoosedCompetitorCount ?? 0}/${stats.varCompetitorCount ?? 0}`
    : '--';

  const pd = brandAnalyticsData;
  const priceDiff = pd
    ? Math.abs((pd.cmp_product_price_average || 0) - (pd.product_price_average || 0))
    : null;

  const { date: rankDate, competitors: rankCompetitors } = extractRankData(rankAnalysis);

  const lspEntries = (showLsp && stats?.recent_lsp_hsp_data && typeof stats.recent_lsp_hsp_data === 'object')
    ? Object.entries(stats.recent_lsp_hsp_data).filter(([, v]) => v != null)
    : [];
  const hasLspData = lspEntries.length > 0;
  const lspDate    = stats?.lsp_hsp_date || '--';

  const goToReport = (tab) => navigate('/smart-reports', { state: { tab } });

  const total = stats?.varCompletedProductCount ?? '--';
  const trendCards = [
    { key: 'easyGain',  title: 'Easy Gain',      count: stats?.varEasyGainCount,        percent: stats?.varEasyGainPercent,        total, progressColor: 'bg-emerald-500', btnClass: 'bg-emerald-500 hover:bg-emerald-600', titleColor: 'text-amber-600',        onView: () => goToReport('Easy Gain')       },
    { key: 'clever',    title: 'Clever Move',     count: stats?.varCleverMoveCount,       percent: stats?.varCleverMovePercent,       total, progressColor: 'bg-amber-500',  btnClass: 'bg-amber-500 hover:bg-amber-600',   titleColor: 'text-amber-500',        onView: () => goToReport('Clever Move')     },
    { key: 'nonComp',   title: 'Non Competitors', count: stats?.varNonCompetitorCount,    percent: stats?.varNonCompetitorPercent,    total, progressColor: 'bg-rose-600',   btnClass: 'bg-rose-700 hover:bg-rose-800',    titleColor: 'text-muted-foreground', onView: () => goToReport('Non Competitors') },
    { key: 'posTrend',  title: 'Positive Trend',  count: stats?.varPostiveTrendingCount,  percent: stats?.varPostiveTrendingPercent,  total, progressColor: 'bg-emerald-500', btnClass: 'bg-emerald-500 hover:bg-emerald-600', titleColor: 'text-emerald-600',      onView: () => goToReport('Positive Trend')  },
    { key: 'neutTrend', title: 'Neutral Trend',   count: stats?.varEqualTrendingCount,    percent: stats?.varEqualTrendingPercent,    total, progressColor: 'bg-amber-500',  btnClass: 'bg-amber-500 hover:bg-amber-600',   titleColor: 'text-amber-500',        onView: () => goToReport('Neutral Trend')   },
    { key: 'negTrend',  title: 'Negative Trend',  count: stats?.varNegativeTrendingCount, percent: stats?.varNegativeTrendingPercent, total, progressColor: 'bg-red-500',    btnClass: 'bg-red-500 hover:bg-red-600',      titleColor: 'text-red-500',          onView: () => goToReport('Negative Trend')  },
  ];

  // Map API data into Pie Chart structure
  const totalCompetitorProducts = compCounts.reduce((acc, curr) => acc + curr.count, 0);
  const pieData = compCounts.map((comp, i) => ({
    name: comp.name,
    value: comp.count,
    color: comp.color || CHART_COLORS[i % CHART_COLORS.length],
    displayPercent: totalCompetitorProducts ? ((comp.count / totalCompetitorProducts) * 100).toFixed(1) : 0
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="bg-card border border-border p-6 space-y-6"
    >

      {/* ── header ── */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Eprice-Track analytics and competitor performance overview
          </p>
        </div>
      </motion.div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={`SAP : ${sap.date}`}
          value={sap.time}
          subtext={`${activeShopName.toUpperCase()} Price Last Updated On This App`}
          icon={Calendar} color="text-info" bg="bg-info/10"
          loading={sapUpdateStatusLoading}
        />
        <KpiCard
          label="Total Products"
          value={stats?.varActiveInactiveProductsCount ?? '--'}
          subtext="Analytics for total active & inactive products"
          icon={Package} color="text-foreground" bg="bg-secondary"
          loading={statsLoading}
        />
       <KpiCard
          label="Active Products"
          value={
            activeShopName?.toLowerCase() === 'nandilathgmart' ? (
              <div className="flex flex-col leading-tight gap-1 text-[22px]">
                <span>SAP : {stats?.activeliveProduct ?? '--'}</span>
                <span>WEB : {stats?.varTotalWebProductsCount ?? '--'}</span>
              </div>
            ) : (
              stats?.activeliveProduct ?? '--'
            )
          }
          subtext="Analytics for total products"
          icon={CheckSquare} color="text-primary" bg="bg-primary/10"
          loading={statsLoading}
        />
        <KpiCard
          label="Completed Products"
          value={stats?.varCompletedProductCount ?? '--'}
          subtext="Analytics for completed products"
          icon={CheckCircle2} color="text-foreground" bg="bg-foreground/10"
          loading={statsLoading}
        />
        <KpiCard
          label="Pending Products"
          value={stats?.varPendingProductCount ?? '--'}
          subtext="Analytics for pending products"
          icon={Clock} color="text-destructive" bg="bg-destructive/10"
          loading={statsLoading}
        />
        <KpiCard
          label="Price Notification"
          value={stats?.varNotificationCounts ?? '--'}
          subtext="Analytics for price notifications"
          icon={Bell} color="text-muted-foreground" bg="bg-secondary"
          loading={statsLoading}
        />
        <KpiCard
          label="Price Update Ratio"
          value={stats?.varPriceUpdatePercentage ?? '--'}
          subtext="Analytics for daily price update ratio"
          icon={TrendingUp} color="text-purple-500" bg="bg-purple-500/10"
          loading={statsLoading}
        />
        <KpiCard
          label="Competitors"
          value={competitorValue}
          subtext="Analytics for user selected competitors"
          icon={Users} color="text-indigo-500" bg="bg-indigo-500/10"
          loading={statsLoading}
        />
      </div>

      {/* ── Charts & Analytics Section (12 Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. Brand Analytics (Wider) */}
        <motion.div variants={itemVariants} className="lg:col-span-6 bg-card rounded-xl p-6 card-shadow border border-border flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg text-foreground">Brand Analytics</h3>
            </div>

            <div className="flex-col flex gap-3">
              <select
                className="bg-secondary text-sm rounded-md px-3 py-1.5 border-none outline-none"
                value={selectedBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                disabled={brandAnalyticsBrandsLoading}
              >
                {brandAnalyticsBrandsLoading
                  ? <option>Loading…</option>
                  : brandAnalyticsBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))
                }
              </select>

              <select
                className="bg-secondary text-sm rounded-md px-3 py-1.5 border-none outline-none"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={brandAnalyticsLoading || !brandAnalyticsCategories.length}
              >
                {brandAnalyticsCategories.length === 0
                  ? <option value=''>All Category</option>
                  : brandAnalyticsCategories.map((cat) => (
                    <option key={cat} value={cat}>{fmtCategory(cat)}</option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="space-y-4 flex-1 justify-center flex flex-col">
            {brandAnalyticsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse text-center py-6">Loading analytics…</p>
            ) : (
              <>
                <StatRow
                  label="Total Product Analyzed"
                  value={pd?.total_product_analyzed_count ?? '--'}
                  colorClass="bg-blue-200"
                  percent={pd?.total_product_analyzed_process_bar ?? 100}
                />
                <StatRow
                  label="Rank1 Product Count For Total Product"
                  value={pd?.cheapest_product_count ?? '--'}
                  colorClass="bg-purple-200"
                  percent={pd?.cheapest_product_process_bar ?? 100}
                />
                <StatRow
                  label="Higher by Average Price Difference"
                  value={pd?.higherby_expansive_average ?? '--'}
                  colorClass="bg-orange-200"
                  isCurrency
                  percent={100}
                />
                <StatRow
                  label={`${activeShopName.toUpperCase()} Average Price Across the Product`}
                  value={pd ? fmtINR(pd.product_price_average) : '--'}
                  colorClass="bg-green-500"
                  isCurrency
                  percent={pd?.product_price_process_bar ?? 100}
                />
                <StatRow
                  label="Competitor's Average Price Across the Product"
                  value={pd ? fmtINR(pd.cmp_product_price_average) : '--'}
                  colorClass="bg-blue-500"
                  isCurrency
                  percent={pd?.cmp_product_price_process_bar ?? 100}
                />
              </>
            )}
          </div>
        </motion.div>

        {/* 2. Competitor Products Count List */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bg-card rounded-xl p-0 card-shadow border border-border flex flex-col overflow-hidden">
          <div className="bg-[#48b2ad] px-4 py-3">
            <h3 className="text-white font-semibold text-center text-[15px]">Competitor Products Count</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-border p-2">
            {compCountsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse p-4 text-center">Loading...</p>
            ) : compCounts.map((comp) => {
              const isDimmed = hoveredComp && hoveredComp !== comp.name;
              
              return (
                <div 
                  key={comp.name} 
                  onMouseEnter={() => setHoveredComp(comp.name)}
                  onMouseLeave={() => setHoveredComp(null)}
                  className={`flex justify-between items-center px-3 py-3 rounded-lg cursor-pointer transition-all duration-300 ${
                    hoveredComp === comp.name ? 'bg-secondary/80 scale-[1.02] shadow-sm' : 'hover:bg-secondary/50'
                  } ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border border-slate-100 overflow-hidden shrink-0">
                      <img 
                        src={comp.logo} 
                        alt={comp.name} 
                        className="max-w-full max-h-full object-contain" 
                        onError={(e) => e.target.style.display='none'} 
                      />
                    </div>
                    <span className="text-sm text-foreground font-medium capitalize">{comp.name}</span>
                  </div>
                  <span className="bg-[#48b2ad] text-white text-[11px] tracking-wide font-bold px-2 py-1 rounded-sm min-w-[36px] text-center">
                    {comp.count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

      {/* 3. Overall Statistics Donut Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bg-card rounded-xl p-6 card-shadow border border-border flex flex-col items-center justify-center">
          <div className="w-full flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Overall Statistics</h3>
          </div>

          <div className="flex-1 w-full min-h-[250px] flex items-center justify-center">
            {compCountsLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse">Loading Chart...</div>
            ) : pieData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No Competitor Data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    dataKey="value"
                    stroke="none"
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {pieData.map((entry, i) => {
                      const isDimmed = hoveredComp && hoveredComp !== entry.name;
                      return (
                        <Cell 
                          key={i} 
                          fill={entry.color} 
                          opacity={isDimmed ? 0.25 : 1}
                          style={{ cursor: 'pointer', transition: 'opacity 0.3s ease', outline: 'none' }}
                          onMouseEnter={() => setHoveredComp(entry.name)}
                          onMouseLeave={() => setHoveredComp(null)}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Interactive Bottom Legend */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 w-full px-2">
            {pieData.map((seg) => {
              const isDimmed = hoveredComp && hoveredComp !== seg.name;
              return (
                <div 
                  key={seg.name} 
                  onMouseEnter={() => setHoveredComp(seg.name)}
                  onMouseLeave={() => setHoveredComp(null)}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity duration-300 ${
                    isDimmed ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[11px] text-muted-foreground truncate capitalize">{seg.name}</span>
                  <span className="text-[11px] font-semibold ml-auto">{seg.displayPercent}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>

      {/* ── Rank & Trend Analysis Section ── */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4 items-start">

        {/* RANK1 / LSP Panel — independent fixed-height column */}
        <div className="w-full lg:w-56 shrink-0 bg-card rounded-xl overflow-hidden card-shadow border border-border">
          {hasLspData ? (
            <>
              <div className="bg-indigo-500 px-4 py-3">
                <p className="text-white font-bold text-sm tracking-wide">LSP: {lspDate}</p>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {lspEntries.map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-foreground font-medium">{name}</span>
                    <span className="bg-secondary text-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[32px] text-center">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="bg-teal-500 px-4 py-3">
                <p className="text-white font-bold text-sm tracking-wide">
                  {rankAnalysisLoading ? 'RANK1: Loading…' : `RANK1: ${rankDate}`}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {rankAnalysisLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse p-4">Loading…</p>
                ) : rankCompetitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No data</p>
                ) : (
                  rankCompetitors.map((comp) => (
                    <div key={comp.name} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-sm text-foreground font-medium">{comp.name}</span>
                      <span className="bg-secondary text-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[32px] text-center">
                        {comp.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Trend Cards — independent 2×3 grid */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4">
          {trendCards.map((card) => (
            <TrendCard key={card.key} {...card} loading={statsLoading} />
          ))}
        </div>

      </motion.div>
    </motion.div>
  );
}