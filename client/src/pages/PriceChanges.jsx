// PriceChanges.jsx - Complete file with small coin transition loader (FIXED)
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, 
  ChevronDown, ChevronUp, Search, 
  Download, RefreshCw, Clock, 
  BarChart2, PieChart as PieChartIcon,
  ArrowUp, ArrowDown, Target,
  Calendar, Zap, DollarSign, 
  Activity, Award, Star, AlertCircle,
  ShoppingBag, LineChart, Sparkles
} from 'lucide-react';
import API from '../hooks/useApi';
import { fetchCompetitors } from "../services/competitorsService";
import { fetchCompetitorProducts } from "../services/competitorsService";

// Utility function
const formatPrice = (price) => {
  if (!price || price === "No Result" || price === "Out Of Stock" || isNaN(price) || price === 0) return "—";
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

// Status Badge
const StatusBadge = ({ status, size = 'sm' }) => {
  const configs = {
    increased: { 
      label: 'Increased', 
      color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-800/50',
      icon: <TrendingUp className="w-3 h-3" />
    },
    decreased: { 
      label: 'Decreased', 
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800/50',
      icon: <TrendingDown className="w-3 h-3" />
    },
    not_changed: { 
      label: 'Stable', 
      color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-700/50',
      icon: <Minus className="w-3 h-3" />
    }
  };
  const config = configs[status] || configs.not_changed;
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// Stat Card
const StatCard = ({ label, value, change, icon, color, subtitle, onClick, isActive, loading }) => {
  const colors = {
    blue: 'from-blue-50 to-blue-100/50 border-blue-200 text-blue-700',
    red: 'from-rose-50 to-rose-100/50 border-rose-200 text-rose-700',
    green: 'from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700',
    gray: 'from-slate-50 to-slate-100/50 border-slate-200 text-slate-700',
    amber: 'from-amber-50 to-amber-100/50 border-amber-200 text-amber-700',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700',
    rose: 'from-rose-50 to-rose-100/50 border-rose-200 text-rose-700',
    purple: 'from-purple-50 to-purple-100/50 border-purple-200 text-purple-700'
  };
  
  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-rose-100 text-rose-600',
    green: 'bg-emerald-100 text-emerald-600',
    gray: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-600',
    purple: 'bg-purple-100 text-purple-600'
  };
  
  const textColor = colors[color]?.split(' ')[2] || 'text-blue-700';
  const iconBg = iconColors[color] || iconColors.blue;
  
  const changeColor = change > 0 ? 'text-rose-600' : change < 0 ? 'text-emerald-600' : 'text-slate-400';
  const changeIcon = change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : null;
  
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors[color]?.split(' ')[0] || 'from-blue-50'} border p-4 shadow-sm transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''
      } ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
    >
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`p-1.5 rounded-lg ${iconBg}`}>
              {icon}
            </div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          </div>
          {change !== undefined && change !== null && !loading && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium ${changeColor}`}>
              {changeIcon}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <p className={`text-2xl font-bold ${textColor} mt-1 ${loading ? 'animate-pulse' : ''}`}>
          {loading ? '...' : value}
        </p>
        {subtitle && !loading && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

// Check icon
const Check = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 bg-gray-200 dark:bg-[#262c3d] rounded-xl"></div>
            <div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-[#262c3d] rounded mb-2"></div>
              <div className="h-3 w-20 bg-gray-200 dark:bg-[#262c3d] rounded"></div>
            </div>
          </div>
          <div className="h-6 w-20 bg-gray-200 dark:bg-[#262c3d] rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-16 bg-gray-200 dark:bg-[#262c3d] rounded-xl"></div>
          <div className="h-16 bg-gray-200 dark:bg-[#262c3d] rounded-xl"></div>
        </div>
        <div className="h-6 bg-gray-200 dark:bg-[#262c3d] rounded"></div>
      </div>
    ))}
  </div>
);

// No Products Found Component
const NoProductsFound = ({ message = "No products found matching your criteria" }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="bg-gray-100 dark:bg-[#1a1a2e] rounded-full p-6 mb-4">
      <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Products Available</h3>
    <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">{message}</p>
  </div>
);

// ============ SMALL COIN TRANSITION LOADER ============

const SmallCoinLoader = ({ text = 'Loading...', size = 'sm' }) => {
  const [isOldCoin, setIsOldCoin] = useState(true);
  const [showSparkle, setShowSparkle] = useState(false);

  const coinSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const labelSizes = {
    sm: 'text-[6px]',
    md: 'text-[8px]',
    lg: 'text-[10px]'
  };

  useEffect(() => {
    const flipInterval = setInterval(() => {
      setIsOldCoin(prev => !prev);
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 400);
    }, 1500);

    return () => clearInterval(flipInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        {/* Glow behind coin */}
        <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-700 ${
          isOldCoin 
            ? 'bg-amber-400/20 scale-75' 
            : 'bg-blue-400/30 scale-110'
        }`}></div>
        
        {/* Main Coin */}
        <div className={`relative ${coinSizes[size]}`}>
          <div 
            className={`w-full h-full rounded-full transition-all duration-700`}
            style={{ 
              perspective: '500px',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Old Coin - Front */}
            <div 
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center ${
                isOldCoin ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: isOldCoin ? 'rotateY(0deg)' : 'rotateY(180deg)',
                transition: 'transform 0.7s, opacity 0.7s'
              }}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-300/50 to-amber-500/50 flex items-center justify-center">
                <div className="absolute inset-2 rounded-full border-2 border-amber-200/30"></div>
                <span className={`text-amber-800 font-bold ${iconSizes[size]}`}>₹</span>
              </div>
            </div>

            {/* New Coin - Back */}
            <div 
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-indigo-400 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center ${
                isOldCoin ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: isOldCoin ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.7s, opacity 0.7s'
              }}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-300/50 to-indigo-500/50 flex items-center justify-center">
                <div className="absolute inset-2 rounded-full border-2 border-blue-200/30"></div>
                <span className={`text-blue-800 font-bold ${iconSizes[size]}`}>₹</span>
              </div>
            </div>
          </div>

          {/* Mini Sparkle Effect */}
          {showSparkle && (
            <div className="absolute -inset-3 flex items-center justify-center pointer-events-none">
              <div className="relative w-full h-full">
                {[...Array(6)].map((_, i) => {
                  const angle = (i / 6) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const x = 30 * Math.cos(rad);
                  const y = 30 * Math.sin(rad);
                  return (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-ping"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: 'translate(-50%, -50%)',
                        animationDuration: '0.4s',
                        opacity: 0
                      }}
                    />
                  );
                })}
                <Sparkles className={`absolute inset-0 m-auto ${iconSizes[size]} text-yellow-400 animate-pulse`} />
              </div>
            </div>
          )}
        </div>

        {/* Price labels */}
        <div className="mt-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className={`${labelSizes[size]} font-medium transition-all duration-500 ${
              isOldCoin ? 'text-amber-600 dark:text-amber-400 opacity-100' : 'text-amber-400 dark:text-amber-600 opacity-30'
            }`}>
              Old
            </span>
            <ArrowRight className={`w-2.5 h-2.5 transition-all duration-500 ${
              isOldCoin ? 'opacity-40' : 'opacity-100 text-blue-500'
            }`} />
            <span className={`${labelSizes[size]} font-medium transition-all duration-500 ${
              isOldCoin ? 'text-blue-400 dark:text-blue-600 opacity-30' : 'text-blue-600 dark:text-blue-400 opacity-100'
            }`}>
              New
            </span>
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <p className={`mt-2 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1`}>
        <span className="inline-flex gap-0.5">
          <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
        </span>
        {text}
        <span className="inline-flex gap-0.5">
          <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
        </span>
      </p>
    </div>
  );
};

// Small ArrowRight icon
const ArrowRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// ============ MAIN COMPONENT ============

const PriceChanges = () => {

  const [allCompetitors, setAllCompetitors] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [viewMode, setViewMode] = useState('cards');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [competitorChanging, setCompetitorChanging] = useState(false);

  // Load competitors on mount
  useEffect(() => {
    const loadCompetitors = async () => {
      try {
        const response = await fetchCompetitors();
        setAllCompetitors(response);
        if (response.length > 0) {
          const firstCompetitor = response[0].slug;
          setSelectedCompetitor(firstCompetitor);
          await loadProducts(1, limit, firstCompetitor, '', 'all');
        }
      } catch (err) {
        console.error('Error loading competitors:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadCompetitors();
  }, []);

  // Load products function
  const loadProducts = async (
    pageNum,
    limitNum,
    competitor,
    search,
    status
  ) => {
    setLoading(true);
    try {
      const response = await fetchCompetitorProducts({
        page: pageNum,
        limit: limitNum,
        competitor: competitor,
        search: search,
        status: status,
      });

      const products = response.products || response.data || response;
      setAllProducts(Array.isArray(products) ? products : []);
    } catch (err) {
      console.error('Error loading products:', err);
      setAllProducts([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Handle competitor change with loader
  const handleCompetitorChange = useCallback(async (competitorSlug) => {
    setCompetitorChanging(true);
    setSelectedCompetitor(competitorSlug);
    setCurrentPage(1);
    setSearchTerm('');
    setFilterStatus('all');
    
    try {
      await loadProducts(1, limit, competitorSlug, '', 'all');
    } finally {
      setCompetitorChanging(false);
    }
  }, [limit]);

  // Handle search with debounce
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      loadProducts(1, limit, selectedCompetitor, value, filterStatus);
    }, 500);
  }, [selectedCompetitor, limit, filterStatus]);

  // Handle filter change
  const handleFilterChange = useCallback((e) => {
    const value = e.target.value;
    setFilterStatus(value);
    setCurrentPage(1);
    loadProducts(1, limit, selectedCompetitor, searchTerm, value);
  }, [selectedCompetitor, limit, searchTerm]);

  // Get competitor stats
  const getCompetitorStats = useMemo(() => {
    let increased = 0, decreased = 0, stable = 0;
    let cheaper = 0, expensive = 0, match = 0;
    let totalProductsWithData = 0;

    allProducts.forEach(p => {
      const compData = p.competitor_data?.[selectedCompetitor];
      if (compData?.price && compData.price !== "Out Of Stock") {
        totalProductsWithData++;
        if (compData.status === 'increased') increased++;
        else if (compData.status === 'decreased') decreased++;
        else if (compData.status === 'not_changed') stable++;
        
        if (compData.price < p.product_price) cheaper++;
        else if (compData.price > p.product_price) expensive++;
        else if (compData.price === p.product_price) match++;
      }
    });
    
    const totalWithChanges = increased + decreased + stable;
    return {
      total: totalWithChanges,
      totalProducts: totalProductsWithData,
      increased, decreased, stable,
      cheaper, expensive, match
    };
  }, [allProducts, selectedCompetitor]);

  // Get top increasing and decreasing products
  const getTopChanges = useMemo(() => {
    const productsWithChanges = allProducts.filter(p => {
      const compData = p.competitor_data?.[selectedCompetitor];
      return compData?.changeValue && compData.changeValue > 0 && compData.price !== "Out Of Stock";
    });

    const sortedByChange = [...productsWithChanges]
      .filter(p => p.competitor_data?.[selectedCompetitor]?.status === 'increased')
      .sort((a, b) => {
        const changeA = a.competitor_data?.[selectedCompetitor]?.changeValue || 0;
        const changeB = b.competitor_data?.[selectedCompetitor]?.changeValue || 0;
        return changeB - changeA;
      });

    const topIncreasing = sortedByChange.slice(0, 5);

    const topDecreasing = [...productsWithChanges]
      .filter(p => p.competitor_data?.[selectedCompetitor]?.status === 'decreased')
      .sort((a, b) => {
        const changeA = a.competitor_data?.[selectedCompetitor]?.changeValue || 0;
        const changeB = b.competitor_data?.[selectedCompetitor]?.changeValue || 0;
        return changeA - changeB;
      })
      .slice(0, 5);

    return { topIncreasing, topDecreasing };
  }, [allProducts, selectedCompetitor]);

  // Chart data
  const increasingChartData = useMemo(() => {
    return getTopChanges.topIncreasing.map(p => ({
      name: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
      change: p.competitor_data?.[selectedCompetitor]?.changeValue || 0,
      price: p.product_price
    }));
  }, [getTopChanges, selectedCompetitor]);

  const decreasingChartData = useMemo(() => {
    return getTopChanges.topDecreasing.map(p => ({
      name: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
      change: p.competitor_data?.[selectedCompetitor]?.changeValue || 0,
      price: p.product_price
    }));
  }, [getTopChanges, selectedCompetitor]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.product_name?.toLowerCase().includes(search) ||
        p.product_brand?.toLowerCase().includes(search) ||
        p.product_code?.toLowerCase().includes(search) ||
        p.product_ean_id?.toLowerCase().includes(search)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        const compData = p.competitor_data?.[selectedCompetitor];
        if (!compData) return false;

        if (filterStatus === 'increased') return compData.status === 'increased';
        if (filterStatus === 'decreased') return compData.status === 'decreased';
        if (filterStatus === 'not_changed') return compData.status === 'not_changed';

        return true;
      });
    }

    return filtered;
  }, [allProducts, searchTerm, filterStatus, selectedCompetitor]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Top decreasing data for chart
  const topDecreasingData = useMemo(() => {
    return getTopChanges.topDecreasing.map(p => ({
      name: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
      change: p.competitor_data?.[selectedCompetitor]?.changeValue || 0,
      price: p.product_price
    }));
  }, [getTopChanges, selectedCompetitor]);

  // Export
  const exportData = () => {
    const headers = ['Product', 'Brand', 'Category', 'Your Price', 'Competitor Price', 'Old Price', 'Change', 'Status', 'Stock'];
    const rows = filteredProducts.map(p => {
      const compData = p.competitor_data?.[selectedCompetitor];
      return [
        p.product_name,
        p.product_brand,
        p.product_category,
        p.product_price,
        compData?.price || 'N/A',
        compData?.oldprice || 'N/A',
        compData?.changeValue || 0,
        compData?.status || 'N/A',
        compData?.stock == 1 ? 'In Stock' : 'Out Of Stock' || 'N/A'
      ];
    });
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price_changes_${selectedCompetitor}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-[#0b101e] dark:via-[#0f1629] dark:to-[#151a2a] flex items-center justify-center">
        <SmallCoinLoader text="Loading price data" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-[#0b101e] dark:via-[#0f1629] dark:to-[#151a2a]">
      {/* Competitor Change Loader - Small overlay */}
      {competitorChanging && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-[#151a2a] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-[#262c3d]">
            <SmallCoinLoader text="Switching competitor" size="md" />
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Price Change Monitor
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date().toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportData}
              className="px-4 py-2.5 bg-white dark:bg-[#151a2a] border border-gray-200 dark:border-[#262c3d] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a2e] transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Competitor Selector */}
        <div className="bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Select Competitor</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Compare prices with your competitors</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {allCompetitors.map((comp) => {
              const isActive = selectedCompetitor === comp.slug;
              return (
                <button
                  key={comp.id}
                  onClick={() => handleCompetitorChange(comp.slug)}
                  disabled={competitorChanging}
                  className={`
                    group relative px-5 py-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-3
                    ${competitorChanging ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                      : 'border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#0b101e] hover:border-blue-300 dark:hover:border-blue-700'
                    }
                  `}
                >
                  <img 
                    src={`${API.defaults.baseURL.replace(/\/api\/?$/, '')}${comp.logo}`} 
                    alt={comp.name} 
                    className={`h-5 w-auto transition-all ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} 
                  />
                  <span className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {comp.name}
                  </span>
                  {isActive && !competitorChanging && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                  {isActive && competitorChanging && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <div className="w-2 h-2 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
          <StatCard
            label="Total Changes"
            value={getCompetitorStats.total}
            icon={<Zap className="w-3.5 h-3.5" />}
            color="amber"
            subtitle={`${getCompetitorStats.increased} ↑ ${getCompetitorStats.decreased} ↓`}
            loading={competitorChanging}
          />
          <StatCard
            label="Increased"
            value={getCompetitorStats.increased}
            change={getCompetitorStats.total > 0 ? (getCompetitorStats.increased / getCompetitorStats.total * 100).toFixed(1) : 0}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            color="red"
            onClick={() => handleFilterChange({ target: { value: 'increased' } })}
            isActive={filterStatus === 'increased'}
            loading={competitorChanging}
          />
          <StatCard
            label="Decreased"
            value={getCompetitorStats.decreased}
            change={getCompetitorStats.total > 0 ? -(getCompetitorStats.decreased / getCompetitorStats.total * 100).toFixed(1) : 0}
            icon={<TrendingDown className="w-3.5 h-3.5" />}
            color="green"
            onClick={() => handleFilterChange({ target: { value: 'decreased' } })}
            isActive={filterStatus === 'decreased'}
            loading={competitorChanging}
          />
          <StatCard
            label="Stable"
            value={getCompetitorStats.stable}
            icon={<Minus className="w-3.5 h-3.5" />}
            color="gray"
            onClick={() => handleFilterChange({ target: { value: 'not_changed' } })}
            isActive={filterStatus === 'not_changed'}
            subtitle={`${getCompetitorStats.totalProducts} total`}
            loading={competitorChanging}
          />
          <StatCard
            label="Cheaper"
            value={getCompetitorStats.cheaper}
            icon={<ArrowDown className="w-3.5 h-3.5" />}
            color="emerald"
            loading={competitorChanging}
          />
          <StatCard
            label="Expensive"
            value={getCompetitorStats.expensive}
            icon={<ArrowUp className="w-3.5 h-3.5" />}
            color="rose"
            loading={competitorChanging}
          />
          <StatCard
            label="Price Match"
            value={getCompetitorStats.match}
            icon={<DollarSign className="w-3.5 h-3.5" />}
            color="blue"
            loading={competitorChanging}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Top Increasing */}
          <div className={`bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] shadow-sm overflow-hidden ${competitorChanging ? 'opacity-50' : ''}`}>
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Top Increasing
              </h3>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {increasingChartData.length}
              </span>
            </div>
            <div className="p-4 h-64">
              {increasingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={increasingChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                    <Tooltip 
                      formatter={(value) => formatPrice(value)}
                      contentStyle={{ backgroundColor: 'white', borderColor: '#E5E7EB', borderRadius: '8px' }}
                    />
                    <Bar dataKey="change" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  No increasing products
                </div>
              )}
            </div>
          </div>

          {/* Top Decreasing */}
          <div className={`bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] shadow-sm overflow-hidden ${competitorChanging ? 'opacity-50' : ''}`}>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Top Decreasing
              </h3>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {topDecreasingData.length}
              </span>
            </div>
            <div className="p-4 h-64">
              {topDecreasingData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDecreasingData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                    <Tooltip 
                      formatter={(value) => formatPrice(value)}
                      contentStyle={{ backgroundColor: 'white', borderColor: '#E5E7EB', borderRadius: '8px' }}
                    />
                    <Bar dataKey="change" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  No decreasing products
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary */}
          <div className={`bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] shadow-sm overflow-hidden ${competitorChanging ? 'opacity-50' : ''}`}>
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Quick Summary
              </h3>
            </div>
            <div className="p-4 h-64 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Highest Increase</span>
                  </div>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {increasingChartData.length > 0 ? formatPrice(increasingChartData[0]?.change) : '—'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Highest Decrease</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {topDecreasingData.length > 0 ? formatPrice(topDecreasingData[0]?.change) : '—'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Products</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {allProducts.length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Competitors</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {allCompetitors.length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Price Match</span>
                  </div>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {getCompetitorStats.match}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] p-4 mt-6 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={competitorChanging}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#262c3d] rounded-xl bg-gray-50 dark:bg-[#0b101e] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:opacity-50"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              disabled={competitorChanging}
              className="px-4 py-2.5 border border-gray-200 dark:border-[#262c3d] rounded-xl bg-white dark:bg-[#0b101e] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
            >
              <option value="all">All Status</option>
              <option value="increased">📈 Increased</option>
              <option value="decreased">📉 Decreased</option>
              <option value="not_changed">➖ Stable</option>
            </select>
            
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
              disabled={competitorChanging}
              className="px-4 py-2.5 border border-gray-200 dark:border-[#262c3d] rounded-xl bg-white dark:bg-[#0b101e] hover:bg-gray-50 dark:hover:bg-[#1a1a2e] transition-all flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
            >
              {viewMode === 'cards' ? 'List' : 'Cards'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex justify-between items-center mt-6 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{currentItems.length}</span> of{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredProducts.length}</span> products
            </span>
            {filterStatus !== 'all' && (
              <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
                {filterStatus}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-700 dark:text-gray-300">{currentPage}</span> of{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{totalPages}</span>
          </span>
        </div>

        {/* Products */}
        {loading ? (
          <LoadingSkeleton />
        ) : currentItems.length === 0 ? (
          <NoProductsFound />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentItems.map((product) => {
              const compData = product.competitor_data?.[selectedCompetitor];
              const isIncreased = compData?.status === 'increased';
              const isDecreased = compData?.status === 'decreased';
              const isStable = compData?.status === 'not changed';
              const isCheaper = compData?.price && compData.price !== "Out Of Stock" && compData.price < product.product_price;
              const isExpensive = compData?.price && compData.price !== "Out Of Stock" && compData.price > product.product_price;
              const isMatch = compData?.price && compData.price !== "Out Of Stock" && compData.price === product.product_price;
              const showOldPrice = compData?.oldprice && compData.oldprice !== "Out Of Stock";
              
              return (
                <div key={product._id} className="bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`h-1 ${isIncreased ? 'bg-rose-500' : isDecreased ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={product.product_image} 
                            alt={product.product_name} 
                            className="h-14 w-14 object-contain rounded-xl bg-gray-50 dark:bg-[#0b101e] p-1.5 border border-gray-200 dark:border-[#262c3d] hover:text-blue-600 cursor-pointer"
                            onClick={() => window.open(product.product_url, "_blank", "noopener,noreferrer")}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#151a2a] ${
                            product.product_stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></div>
                        </div>
                        <div>
                          <h3
                            className="font-semibold text-gray-800 dark:text-white line-clamp-1 hover:text-blue-600 cursor-pointer"
                            onClick={() => window.open(product.product_url, "_blank", "noopener,noreferrer")}
                          >
                            {product.product_name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.product_brand}</p>
                        </div>
                      </div>
                      <StatusBadge status={isIncreased ? 'increased' : isDecreased ? 'decreased' : 'not_changed'} size="lg" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Your Price</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(product.product_price)}</p>
                      </div>
                      
                      <div className={`p-3 rounded-xl ${
                        isCheaper ? 'bg-emerald-50 dark:bg-emerald-900/20' : 
                        isExpensive ? 'bg-rose-50 dark:bg-rose-900/20' :
                        isMatch ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-[#0b101e]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedCompetitor}</p>
                          {!isStable && !isIncreased && !isDecreased ? null : (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              isIncreased ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                              isDecreased ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : ''
                            }`}>
                              {isIncreased ? '↑' : isDecreased ? '↓' : ''} {formatPrice(Math.abs(compData?.changeValue || 0))}
                            </span>
                          )}
                        </div>
                        <p className={`text-xl font-bold ${
                          isCheaper ? 'text-emerald-600 dark:text-emerald-400' : 
                          isExpensive ? 'text-rose-600 dark:text-rose-400' :
                          isMatch ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {compData?.price ? formatPrice(compData.price) : '—'}
                        </p>
                        {showOldPrice && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(compData.oldprice)}
                            </span>
                            <span className="text-xs text-gray-400">(old)</span>
                          </div>
                        )}
                        {compData?.price && compData.price !== "Out Of Stock" && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-xs font-medium ${
                              isCheaper ? 'text-emerald-600 dark:text-emerald-400' : 
                              isExpensive ? 'text-rose-600 dark:text-rose-400' : 
                              isMatch ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                            }`}>
                              {isCheaper ? '↓' : isExpensive ? '↑' : '='} {formatPrice(Math.abs(compData.price - product.product_price))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-[#262c3d] pt-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${compData?.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          {compData?.stock > 0 ? '● In Stock' : '○ Out of Stock'}
                        </span>
                        <span className="w-px h-3 bg-gray-300 dark:bg-[#262c3d]"></span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{compData?.rating || 'N/A'}</span>
                          <span className="text-gray-400">({compData?.review || 0})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151a2a] rounded-2xl border border-gray-200 dark:border-[#262c3d] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#0b101e] border-b border-gray-200 dark:border-[#262c3d]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Your Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{selectedCompetitor}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Old Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Change</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#262c3d]">
                  {currentItems.map((product) => {
                    const compData = product.competitor_data?.[selectedCompetitor];
                    const isIncreased = compData?.status === 'increased';
                    const isDecreased = compData?.status === 'decreased';
                    
                    return (
                      <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a2e] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img src={product.product_image} alt={product.product_name} className="h-8 w-8 object-contain" />
                            <span className="text-sm font-medium text-gray-800 dark:text-white">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{product.product_brand}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-600 dark:text-blue-400">{formatPrice(product.product_price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-rose-600 dark:text-rose-400">{formatPrice(compData?.price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-400 line-through">
                          {compData?.oldprice && compData.oldprice !== "Out Of Stock" ? formatPrice(compData.oldprice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold">
                          <span className={isIncreased ? 'text-rose-600 dark:text-rose-400' : isDecreased ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}>
                            {compData?.changeValue ? formatPrice(Math.abs(compData.changeValue)) : '0'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={isIncreased ? 'increased' : isDecreased ? 'decreased' : 'not_changed'} />
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={compData?.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
                            {compData?.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || competitorChanging}
              className="px-4 py-2 border border-gray-200 dark:border-[#262c3d] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a2e] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={competitorChanging}
                  className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'border border-gray-200 dark:border-[#262c3d] hover:bg-gray-50 dark:hover:bg-[#1a1a2e]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || competitorChanging}
              className="px-4 py-2 border border-gray-200 dark:border-[#262c3d] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a2e] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceChanges;