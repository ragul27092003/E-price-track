import React, { useState, useEffect, useRef, useMemo } from "react";

import { fetchReportPageData } from "../services/reportService";
import { fetchUsersNotificationData } from "../services/reportService";
import { fetchRandomProduct } from "../services/reportService";
import { fetchOverallStatistics } from "../services/dashboardService";
import { useStore, selectCurrentStoreId } from "@/store";
import { fetchCompetitors } from "../services/competitorsService";

// ─── Static Data ──────────────────────────────────────────────────────────────
const dailyActivities = [
  { task: "Product Feed Updation", status: "Daily" },
  { task: "Product Price Update", status: "Daily" },
  { task: "LSP and HSP Data Send", status: "Daily" },
  { task: "Product Price History", status: "Daily" },
  { task: "Price History Save", status: "Daily" },
  { task: "Email Notification Sent", status: "Daily" },
];

// Fallback palette (used when a slug has no color in competitors list)
const FALLBACK_PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#14b8a6",
  "#e11d48", "#0ea5e9", "#a855f7", "#22c55e", "#eab308",
];

// ─── Date Formatter ───────────────────────────────────────────────────────────
const formatShortDate = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
};

// ─── Price helpers ────────────────────────────────────────────────────────────
function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ""));
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function fmt(v) {
  if (v === null || v === undefined) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

// ─── Print Stylesheet ─────────────────────────────────────────────────────────
const printStyles = `
@media print {
  @page { size: A4 portrait; margin: 10mm 8mm; }

  html, body, #root {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    background: #ffffff !important;
  }

  main{
    background-color: white !important;
  }

  aside, header{
      display: none !important;
  }

  .top-users-container,
  .overflow-auto,
  .overflow-hidden,
  .overflow-x-auto,
  .overflow-y-auto {
    max-height: none !important;
    overflow: visible !important;
    scrollbar-width: auto !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-shadow: none !important;
  }

  .print-page {
    page-break-after: always;
    break-after: page;
    page-break-inside: auto;
    break-inside: auto;
  }
  .print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .print-center-page {
    display: flex !important;
    flex-direction: column;
    justify-content: center;
    min-height: 250mm;
  }

  .print-avoid-break,
  tr, thead, img, table, svg {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  thead { display: table-header-group; }

  .report-wrapper,
  .report-shell {
    margin: auto !important;
    border: 0 !important;
    background: #ffffff !important;
  }

  .top-users-container {
    max-height: 90mm !important;
    overflow: hidden !important;
    scrollbar-width: none !important;
  }
  .top-users-container::after {
    content: "";
    display: block;
    height: 8mm;
  }

  /* SVG chart — vector, always crisp */
  .price-history-svg-wrap {
    width: 100% !important;
    overflow: visible !important;
  }

  .price-history-svg-wrap svg {
    width: 100% !important;
    height: auto !important;
    display: block !important;
  }

  /* Allow this page to break across pages if needed */
  .print-chart-page {
    display: block !important;
    min-height: 0 !important;
  }
}
`;

// ─── Reusable Components ──────────────────────────────────────────────────────
const SectionHeader = ({ title, badge, action }) => (
  <div className="flex justify-between items-center mb-6">
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
        {title}
      </h2>
      {badge && (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
          {badge}
        </span>
      )}
    </div>
    {action}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700/50 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] ${className}`}
  >
    {children}
  </div>
);

const PrintPage = ({ children, center = false, className = "" }) => (
  <section className={`print-page ${center ? "print-center-page" : ""} ${className}`}>
    <div className="w-full mx-auto max-w-[1400px] print:max-w-none">{children}</div>
  </section>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SVG PRICE HISTORY CHART — Vector, print-perfect, no Chart.js
// (adapted from ProductHistory.jsx PriceChart)
// ═══════════════════════════════════════════════════════════════════════════════
function PriceHistorySVGChart({ history, competitors, visibleSlugs }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const chartRef = useRef(null);

  if (!history || !history.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm font-medium text-gray-400">
        No price history available
      </div>
    );
  }

  const svgW = 900;
  const svgH = 360;
  const pad = { top: 30, right: 70, bottom: 90, left: 80 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  // Gather all prices for range calculation
  const allPrices = [];
  history.forEach((h) => {
    const p = parsePrice(h.product_price);
    if (p !== null) allPrices.push(p);
    competitors.forEach((c) => {
      if (!visibleSlugs.has(c.slug)) return;
      const cp = parsePrice(h.competitors?.[c.slug]);
      if (cp !== null) allPrices.push(cp);
    });
  });

  if (!allPrices.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm font-medium text-gray-400">
        No price data in history
      </div>
    );
  }

  let dataMin = Math.min(...allPrices);
  let dataMax = Math.max(...allPrices);
  if (dataMin === dataMax) {
    dataMin = dataMin * 0.95;
    dataMax = dataMax * 1.05;
  }

  const range = dataMax - dataMin;
  const chartMin = Math.max(0, dataMin - range * 0.1);
  const chartMax = dataMax + range * 0.1;
  const span = chartMax - chartMin;

  const getX = (i) => pad.left + (plotW / Math.max(history.length - 1, 1)) * i;
  const getY = (v) => pad.top + ((chartMax - v) / span) * plotH;

  // Y ticks
  const yTickCount = 5;
  const rawTicks = Array.from(
    { length: yTickCount },
    (_, i) => chartMin + (span / (yTickCount - 1)) * i
  );
  const yTicks = [...new Set(rawTicks.map((t) => Math.round(t)))];

  const series = [
    {
      slug: "our_price",
      name: "Our Price",
      color: "#2563eb",
      values: history.map((h) => parsePrice(h.product_price)),
      isMain: true,
    },
    ...competitors
      .filter((c) => c.isActive !== false && visibleSlugs.has(c.slug))
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        color: c.color || "#94a3b8",
        values: history.map((h) => parsePrice(h.competitors?.[c.slug])),
        isMain: false,
      })),
  ];

  const buildPath = (values) => {
    let d = "";
    values.forEach((v, i) => {
      if (v === null) return;
      const cmd = d === "" ? "M" : "L";
      d += `${cmd}${getX(i)},${getY(v)} `;
    });
    return d.trim();
  };

  const buildAreaPath = (values) => {
    let d = "";
    let firstX = null, lastX = null;
    values.forEach((v, i) => {
      if (v === null) return;
      const x = getX(i);
      const y = getY(v);
      if (firstX === null) firstX = x;
      lastX = x;
      const cmd = d === "" ? "M" : "L";
      d += `${cmd}${x},${y} `;
    });
    if (d && firstX !== null) {
      d += `L${lastX},${pad.top + plotH} L${firstX},${pad.top + plotH} Z`;
    }
    return d.trim();
  };

  const handleMouseMove = (e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const scaleX = svgW / rect.width;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const mouseX = (clientX - rect.left) * scaleX;

    const stepX = plotW / Math.max(history.length - 1, 1);
    let index = Math.round((mouseX - pad.left) / stepX);
    index = Math.max(0, Math.min(index, history.length - 1));

    setHoverIdx(index);
  };

  return (
    <div
      className="relative w-full select-none price-history-svg-wrap"
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg
        ref={chartRef}
        viewBox={`0 0 ${svgW} ${svgH - 40}`}
        className="w-full h-auto"
        style={{ display: "block" }}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        <defs>
          <linearGradient id="mainAreaGradReports" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              y1={getY(tick)}
              x2={pad.left + plotW}
              y2={getY(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left - 12}
              y={getY(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
              fontWeight="600"
            >
              {fmt(tick)}
            </text>
          </g>
        ))}

        {/* X axis labels (rotated) */}
        {history.map((h, i) => {
          if (!h.display_date) return null;
          // const step = history.length > 31 ? Math.ceil(history.length / 15) : 1;
          // if (i % step !== 0 && i !== history.length - 1 && i !== 0) return null;

          return (
            <text
              key={i}
              transform={`translate(${getX(i)},${pad.top + plotH + 14}) rotate(45)`}
              textAnchor="start"
              fontSize="10"
              fill="#64748b"
              fontWeight="600"
            >
              {h.display_date}
            </text>
          );
        })}

        {/* Series lines */}
        {series.map((s) => {
          const dLine = buildPath(s.values);
          const dArea = s.isMain ? buildAreaPath(s.values) : "";
          if (!dLine) return null;

          return (
            <g key={s.slug}>
              {s.isMain && dArea && (
                <path d={dArea} fill="url(#mainAreaGradReports)" />
              )}
              <path
                d={dLine}
                fill="none"
                stroke={s.color}
                strokeWidth={s.isMain ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={s.isMain ? 1 : 0.75}
              />
              {hoverIdx !== null && s.values[hoverIdx] !== null && (
                <circle
                  cx={getX(hoverIdx)}
                  cy={getY(s.values[hoverIdx])}
                  r={s.isMain ? 5 : 4}
                  fill={s.isMain ? "#ffffff" : s.color}
                  stroke={s.color}
                  strokeWidth={2.5}
                />
              )}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <line
            x1={getX(hoverIdx)}
            y1={pad.top}
            x2={getX(hoverIdx)}
            y2={pad.top + plotH}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}

        {/* Axes base */}
        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={pad.left + plotW}
          y2={pad.top + plotH}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
      </svg>

      {/* Interactive tooltip (not printed) */}
      {hoverIdx !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white/95 p-2 md:p-3 shadow-xl backdrop-blur-md dark:border-gray-700 dark:bg-[#151a2a]/95 print:hidden"
          style={{
            left:
              hoverIdx > history.length / 2
                ? "auto"
                : `${(getX(hoverIdx) / svgW) * 100}%`,
            right:
              hoverIdx > history.length / 2
                ? `${100 - (getX(hoverIdx) / svgW) * 100}%`
                : "auto",
            top: "0px",
            marginLeft: hoverIdx > history.length / 2 ? "0" : "10px",
            marginRight: hoverIdx > history.length / 2 ? "10px" : "0",
            minWidth: "140px",
          }}
        >
          <div className="mb-2 border-b border-gray-100 pb-1 dark:border-gray-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {history[hoverIdx]?.display_date || "Date"}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {series.map((s) => {
              const val = s.values[hoverIdx];
              if (val === null || val === undefined) return null;
              return (
                <div
                  key={s.slug}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span
                      className={`text-[10px] truncate ${
                        s.isMain
                          ? "font-bold text-gray-900 dark:text-white"
                          : "font-medium text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {s.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] shrink-0 ${
                      s.isMain
                        ? "font-black text-blue-600 dark:text-blue-400"
                        : "font-bold text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {fmt(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Competitors = () => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const date = new Date();
  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const pad = (num) => String(num).padStart(2, "0");
  const currentmonth = months[istDate.getMonth()];
  const currentDate = `${pad(istDate.getDate())} ${currentmonth} ${istDate.getFullYear()}`;

  const [newproductcount, setnewproductCounts] = useState([]);
  const [EarlierTrendCount, setEarlierTrendCount] = useState([]);
  const [totalActiveUsers, setTotalactiveUsers] = useState([]);
  const [CurrentMonthUserCount, setCurrentMonthUserCount] = useState([]);
  const [UsersLog, setUsersLogHistory] = useState([]);
  const [overalldata, setoveralldata] = useState([]);
  const [UsersNotificationData, setUsersNotificationData] = useState([]);
  const [Storecompetitors, setStorecompetitors] = useState([]);
  const [RandomProductData, setRandomProductData] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [isCompetitorLoading, setCompetitorLoading] = useState(true);
  const [isRandomPDloading, setRandomPDloading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const activeShopName = useStore((s) => s.activeShopName) || "";
  const topUserRef = useRef(null);
  const [topUsersMaxHeight, setTopUsersMaxHeight] = useState(0);
  const [isPrint, setIsPrint] = useState(false);

  // ── before/after print handlers ─────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    let hadDark = false;

    const handleBeforePrint = () => {
      hadDark = root.classList.contains("dark");
      if (hadDark) root.classList.remove("dark");
      setIsPrint(true);
    };
    const handleAfterPrint = () => {
      if (hadDark) root.classList.add("dark");
      setIsPrint(false);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const competitorPrices = Object.values(RandomProductData?.CompetitorShowList || {}).map((comp) => ({
    name: comp.competitor_name,
    url: comp.competitor_producturl,
    logo: comp.competitor_logoimg,
    price: comp.competitor_price,
    pr_diff: comp.price_difference,
    isStock:
      comp.competitor_price !== "No Result" &&
      comp.competitor_price !== "Out Of Stock" &&
      comp.competitor_price !== "",
  }));

  const producthistory = RandomProductData?.ProductHistory30Days;

  const competitors = Storecompetitors.map((comp) => ({
    name: comp.name,
    slug: comp.slug,
    type: comp.mappingType,
    color: comp.color,
    logo: comp.logo,
    full_logo: comp.fullLogo,
    isActive: comp.isActive,
  }));

  const topUsers = UsersLog.map((user) => ({
    user: user.username,
    logins: `${user.logincount} Time`,
    initials: user.username.charAt(0).toUpperCase(),
  }));

  useEffect(() => {
    if (!topUserRef.current) return;
    const rowHeight = topUserRef.current.offsetHeight;
    setTopUsersMaxHeight(rowHeight * 3 + 16 * 2);
  }, [topUsers]);

  const priceNotifications = UsersNotificationData.filter(
    (user) => user.email_address !== "ajithajith33398@gmail.com"
  ).map((user) => ({
    email: user.email_address,
    count: user.notifycount,
  }));

  const topNotification = priceNotifications[0];

  // ── Data fetchers ───────────────────────────────────────────────────────────
  const reportPageDetails = async () => {
    try {
      const data = await fetchReportPageData();
      setnewproductCounts(data.newproductcount);
      setEarlierTrendCount(data.trendcountEarly);
      setTotalactiveUsers(data.totalusers);
      setUsersLogHistory(data.UsersLog);
      setCurrentMonthUserCount(data.CurrentMonthUser);
    } catch (err) {
      console.error("Failed to fetch competitor counts", err);
    }
  };

  const overalldashboardData = async () => {
    try {
      const data = await fetchOverallStatistics();
      setoveralldata(data);
    } catch (err) {
      console.error("Failed to fetch overalldashboard status", err);
    }
  };

  const competitorsdata = async () => {
    try {
      setCompetitorLoading(true);
      const data = await fetchCompetitors();
      setStorecompetitors(data);
    } catch (err) {
      console.error("Failed to fetch competitor counts", err);
    } finally {
      setCompetitorLoading(false);
    }
  };

  const usersNotificationCount = async () => {
    try {
      setNotificationLoading(true);
      const data = await fetchUsersNotificationData();
      setUsersNotificationData(data.UsersNotification);
    } catch (err) {
      console.error("Failed to fetch notification counts", err);
      setUsersNotificationData([]);
    } finally {
      setNotificationLoading(false);
    }
  };

  const RandomProduct = async () => {
    try {
      setRandomPDloading(true);
      const data = await fetchRandomProduct();
      setRandomProductData(data.data);
    } catch (err) {
      console.error("Failed to fetch notification counts", err);
    } finally {
      setRandomPDloading(false);
    }
  };

  // Single combined effect — no duplicate fetches
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      try {
        await Promise.allSettled([
          reportPageDetails(),
          overalldashboardData(),
          usersNotificationCount(),
          competitorsdata(),
          RandomProduct(),
        ]);
      } finally {
        if (!cancelled) {
          setIsDataReady(true);
          console.log("✅ ALL APIs done");
        }
      }
    };
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  let activeCompetitorCount;
  if (!isCompetitorLoading) {
    activeCompetitorCount = competitors.filter(
      (comp) => comp.isActive === true
    ).length;
  }

  const trendData = [
    { metric: "Easy Gain",      firstDay: EarlierTrendCount.varEasyGainCount,         currentDay: overalldata.varEasyGainCount,         isPositive: true  },
    { metric: "Positive Trend", firstDay: EarlierTrendCount.varPostiveTrendingCount,  currentDay: overalldata.varPostiveTrendingCount,  isPositive: true  },
    { metric: "Clever Moves",   firstDay: EarlierTrendCount.varCleverMoveCount,       currentDay: overalldata.varCleverMoveCount,       isPositive: true  },
    { metric: "Negative Trend", firstDay: EarlierTrendCount.varNegativeTrendingCount, currentDay: overalldata.varNegativeTrendingCount, isPositive: false },
    { metric: "Non Competitor", firstDay: EarlierTrendCount.varNonCompetitorCount,    currentDay: overalldata.varNonCompetitorCount,    isPositive: true  },
    { metric: "Neutral Trend",  firstDay: EarlierTrendCount.varEqualTrendingCount,    currentDay: overalldata.varEqualTrendingCount,    isPositive: true  },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTER — ProductHistory30Days → SVG chart shape
  // ═══════════════════════════════════════════════════════════════════════════
  const adaptedHistory = useMemo(() => {
    if (!Array.isArray(producthistory) || producthistory.length === 0) return [];
    return [...producthistory]
      .sort((a, b) => new Date(a.display_date) - new Date(b.display_date))
      .map((day) => ({
        display_date: formatShortDate(day.display_date),
        product_price: day.product_price,
        // Rename arrrank_price_by → competitors for SVG chart
        competitors: day.arrrank_price_by || {},
      }));
  }, [producthistory]);

  // Slugs that actually have price data across the history
  const chartCompetitors = useMemo(() => {
    if (!adaptedHistory.length) return [];

    const ourSlug = String(activeShopName || "").toLowerCase().replace(/\s+/g, "_");

    // Only keep competitors that appear at least once
    const presentSlugs = new Set();
    adaptedHistory.forEach((h) => {
      Object.entries(h.competitors || {}).forEach(([slug, val]) => {
        if (typeof val === "number" && val > 0) presentSlugs.add(slug);
      });
    });

    return competitors.filter(
      (c) =>
        c.isActive !== false &&
        presentSlugs.has(c.slug) &&
        c.slug !== ourSlug // exclude our own store (shown as "Our Price")
    );
  }, [adaptedHistory, competitors, activeShopName]);

  // All active slugs visible by default
  const allVisibleSlugs = useMemo(() => {
    return new Set(chartCompetitors.map((c) => c.slug));
  }, [chartCompetitors]);

  // ── Intercept Ctrl+P / Cmd+P — block print if data not ready ─────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPrintShortcut =
        (e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P");

      if (!isPrintShortcut) return;

      if (!isDataReady) {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⏳ Data is still loading...\n\nPlease wait for all data to load before printing."
        );
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isDataReady]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <div className="report-wrapper">
        <div className="report-shell p-4 bg-white dark:bg-[#0b101e] min-h-screen print:min-h-0 border-2 print:border-0 border-gray-200 dark:border-gray-800 text-slate-800 dark:text-slate-200 font-sans selection:bg-indigo-500/30">
          <div className="hidden print:flex justify-between mb-5"><img className="w-40 h-max" src="https://epricetrack.com/src/services/assets/main-logo.png" alt="" /><img className="w-40" src="https://www.eywamedia.com/assets/img/logo.png" alt="" /></div>
          {/* ══════════ PAGE 1 — Header + KPI + Trend Analysis ══════════ */}
          <PrintPage center className="mb-10 print:mb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 print-avoid-break">
              <div className="print:max-w-[70%]">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize mb-3 print:mb-6">
                  {activeShopName} Monthly Report{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {currentmonth} 2026
                  </span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  Product Monitoring &amp; Competitor Intelligence Summary
                </p>
              </div>

              <button
                className={`p-3 border-2 rounded-xl text-white print:hidden transition-colors ${
                  isDataReady
                    ? "bg-blue-600 border-blue-400 hover:bg-blue-700"
                    : "bg-gray-500 border-gray-400 cursor-not-allowed"
                }`}
                disabled={!isDataReady}
                onClick={() => window.print()}
              >
                {isDataReady ? "Print Report" : "Loading data..."}
              </button>

              <div className="flex flex-col items-end bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Generated Date
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {currentDate}
                </span>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight mb-6">
              Dashboard Overview
            </h2>

            <div className="grid grid-cols-1 print:grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:gap-3 mb-10 print:mb-6">
              {[
                { label: "Total Products",      value: overalldata.varActiveInactiveProductsCount, icon: "📦", color: "text-blue-600 dark:text-blue-400" },
                { label: "Completed Products",  value: overalldata.varCompletedProductCount,       icon: "📦", color: "text-blue-600 dark:text-blue-400" },
                { label: "New Products",        value: newproductcount,                            icon: "✨", color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Price Notifications", value: overalldata.varNotificationCounts,          icon: "🔔", color: "text-rose-600 dark:text-rose-400" },
                { label: "Competitors",         value: `${overalldata.varChoosedCompetitorCount}/${overalldata.varOursCompetitorCount}`, icon: "⚔️", color: "text-indigo-600 dark:text-indigo-400" },
              ].map((card, idx) => (
                <Card
                  key={idx}
                  className="print-avoid-break p-6 print:p-3 relative overflow-hidden group print:border-[1px] border-indigo-300 dark:hover:border-indigo-500/50 transition-colors"
                >
                  <div className="absolute print:hidden top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-4xl">{card.icon}</span>
                  </div>
                  <div className="flex flex-col items-start print:items-center">
                    <p className="text-xs print:text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">
                      {card.label}
                    </p>
                    <p className={`text-4xl print:text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

              <SectionHeader title="Trend Analysis Summary" />
              <div className="overflow-x-auto flex-1 border-2 rounded-lg border-slate-200">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 dark:text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">
                    <tr className="border-b-2 border-slate-200">
                      <th className="px-4 py-3 font-semibold rounded-tl-lg text-center">Metric</th>
                      <th className="px-4 py-3 font-semibold text-center">First Day</th>
                      <th className="px-4 py-3 font-semibold text-center rounded-tr-lg">Current Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {trendData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-300 text-center">{row.metric}</td>
                        <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-400">{row.firstDay}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`font-semibold ${row.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {row.currentDay}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </PrintPage>

          {/* ══════════ PAGE 2 — Daily Activities + User Activity ══════════ */}
          <PrintPage className="mb-10 print:mb-0">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight print:mt-6 mb-6">
              Daily and Users Activity Overview
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-1 gap-8 print:gap-6 items-stretch">
              <Card className="print-avoid-break p-6 flex flex-col">
                <SectionHeader title="Daily Activities" />
                <div className="space-y-4">
                  {dailyActivities.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center group">
                      <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.task}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="print-avoid-break p-6 flex-1 flex flex-col">
                <SectionHeader title="User Activity" />
                <div className="flex justify-between items-center mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div className="text-center w-1/2 border-r border-slate-200 dark:border-slate-700">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalActiveUsers}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Active Users</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{CurrentMonthUserCount}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">New Users</p>
                  </div>
                </div>

                <div
                  className="flex flex-wrap gap-x-2.5 gap-y-2.5 justify-center overflow-auto top-users-container"
                  style={{
                    scrollbarWidth: "none",
                    maxHeight: isPrint ? "none" : `${topUsersMaxHeight}px`,
                  }}
                >
                  {topUsers.map((user, idx) => (
                    <div
                      key={idx}
                      ref={idx === 0 ? topUserRef : null}
                      className="flex items-center justify-between gap-x-2 p-1.5 bg-indigo-100 rounded-full"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-blue-400 text-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                          {user.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {user.user}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 print:text-left">
                        <span className="text-green-600">Logged</span> {user.logins}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </PrintPage>

          {/* ══════════ PAGE 3 — Notification Overview ══════════ */}
          <PrintPage className="mb-10 print:mb-0">
            <div className="mb-10 print:mt-9 print-avoid-break">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight mb-6">
                Notification Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-2 gap-6">
                <Card className="print:hidden p-6 flex items-center justify-between bg-gradient-to-br from-orange-50 to-white dark:from-orange-500/10 dark:to-slate-800/50 border-orange-100 dark:border-orange-500/20">
                  <div>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 tracking-wider uppercase mb-1">
                      Total Notifications
                    </p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">
                      {overalldata.varNotificationCounts}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 text-xl">
                    🔔
                  </div>
                </Card>

                <Card className="print-avoid-break p-6 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-800/50 border-emerald-100 dark:border-emerald-500/20">
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase mb-1">
                      Top Recipient
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {notificationLoading ? "Loading..." : topNotification?.email || "No data"}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xl">
                    👑
                  </div>
                </Card>

                <Card className="print-avoid-break p-6 flex items-center justify-between bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-500/10 dark:to-slate-800/50 border-cyan-100 dark:border-cyan-500/20">
                  <div>
                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 tracking-wider uppercase mb-1">
                      Products Notified
                    </p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">
                      {notificationLoading ? "Loading..." : topNotification?.count || "No data"}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-500 text-xl">
                    📢
                  </div>
                </Card>
              </div>
            </div>

                <SectionHeader title="Price Notification Activities" />
                <div className="overflow-x-auto border-2 rounded-lg border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 dark:text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-center rounded-tl-lg">Email Address</th>
                        <th className="px-4 py-3 font-semibold text-center rounded-tr-lg">Notified Product Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {notificationLoading ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-700 text-center dark:text-slate-300">Loading...</td>
                          <td className="px-4 py-4 text-slate-700 text-center dark:text-slate-300">Loading...</td>
                        </tr>
                      ) : (
                        priceNotifications.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-4 text-center text-slate-700 dark:text-slate-300">{row.email}</td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                {row.count}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
          </PrintPage>

          {/* ══════════ PAGE 4 — Competitor Directory ══════════ */}
          <PrintPage className="mb-10 print:mb-0">
            <Card className="print-avoid-break mb-10 print:mb-0 print:mt-9 p-6 md:p-8 print:p-4">
              <SectionHeader
                title="Competitors Overview"
                badge={`${activeCompetitorCount} Active Competitors`}
              />

              {competitors.some((comp) => comp.type === "EAN") && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                    EAN Based Competitors
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {competitors.map(
                      (comp, idx) =>
                        comp.type === "EAN" &&
                        comp.isActive && (
                          <div
                            key={idx}
                            className="print-avoid-break flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors cursor-pointer group"
                          >
                            <img
                              src={`https://backend.epricetrack.com${comp.logo}`}
                              alt={comp.slug}
                              className="max-h-8"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {comp.name}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {competitors.some((comp) => comp.type === "NON_EAN") && (
                <div className="mt-8">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                    Non EAN Based Competitors
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {competitors.map(
                      (comp, idx) =>
                        comp.type === "NON_EAN" &&
                        comp.isActive && (
                          <div
                            key={idx}
                            className="print-avoid-break flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors cursor-pointer group"
                          >
                            <img
                              src={`https://backend.epricetrack.com${comp.logo}`}
                              alt={comp.slug}
                              className="max-h-8"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {comp.name}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}
            </Card>
          </PrintPage>

          {/* ══════════ PAGE 5 — Product Performance ══════════ */}
          <PrintPage>
            <Card className="print-avoid-break print:mt-9 overflow-hidden border-indigo-100 dark:border-indigo-500/20 shadow-lg shadow-indigo-500/5">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                  Product Overview
                </div>
                <button className="print:hidden bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-5 rounded-lg transition-all shadow-md shadow-indigo-500/20 active:scale-95">
                  {RandomProductData.product_movement}
                </button>
              </div>

              {isRandomPDloading ? (
                <p className="text-center p-3 text-orange-500 font-bold">Loading....</p>
              ) : (
                <div className="p-6 md:p-8 print:p-4 flex flex-col xl:flex-row gap-10 print:gap-6">
                  <div className="w-full xl:w-1/5 flex justify-center items-center">
                    <div className="w-full max-w-[200px] print:max-w-[300px] aspect-[3/4] print:aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
                      <img src={RandomProductData.product_image} alt="" />
                    </div>
                  </div>

                  <div className="w-full xl:w-2/5 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                      {RandomProductData.product_name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                      <span>Product Code: {RandomProductData.product_code}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Product EAN: {RandomProductData.product_ean_id}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: "WEB PRICE",     value: RandomProductData.product_price },
                        { label: "SAP PRICE",     value: RandomProductData.product_sap_price },
                        { label: "STORE PRICE",   value: RandomProductData.product_store_price },
                        { label: "RANK POSITION", value: RandomProductData.rank_pos, isRank: true },
                      ].map((stat, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50"
                        >
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                            {stat.label}
                          </p>
                          <p
                            className={`text-lg font-bold ${
                              stat.isRank
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {stat.label !== "RANK POSITION"
                              ? `₹ ${Number(stat.value).toLocaleString("en-IN")}`
                              : stat.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                          Lowest
                        </p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {RandomProductData.min_price_comp}{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ₹ {Number(RandomProductData.min_price).toLocaleString("en-IN")}
                          </span>
                        </p>
                      </div>
                      <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                          Highest
                        </p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {RandomProductData.max_price_comp}{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ₹ {Number(RandomProductData.max_price).toLocaleString("en-IN")}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full xl:w-2/5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-3">
                      {competitorPrices.map((comp, idx) => (
                        <div
                          key={idx}
                          className={`print-avoid-break p-3 rounded-xl border print:flex-row print:gap-x-3 print:items-center print:justify-evenly flex flex-col justify-center transition-colors ${
                            comp.isStock
                              ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20"
                              : "bg-rose-50/50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20"
                          }`}
                        >
                          <img
                            src={`https://backend.epricetrack.com${comp.logo}`}
                            className={`w-20 mb-3 print:mb-0 ${comp.isStock ? "grayscale-0" : "grayscale"}`}
                            alt={comp.name}
                          />
                          <p
                            className={`text-sm font-bold ${
                              comp.isStock
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {comp.isStock
                              ? `₹ ${Number(comp.price).toLocaleString("en-IN")}`
                              : "Out Of Stock"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </PrintPage>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PAGE 6 — Price History Chart (SVG, vector)                     */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <PrintPage className="mt-10 print:mt-0 print-chart-page">
            <Card className="print:mt-9 p-6 md:p-8 print:p-4">
              <SectionHeader
                title="Price History — Last 30 Days"
                badge={
                  adaptedHistory.length
                    ? `${chartCompetitors.length} Competitors Tracked`
                    : "No Data"
                }
              />

              {isRandomPDloading ? (
                <p className="text-center p-10 text-orange-500 font-bold">
                  Loading chart data....
                </p>
              ) : adaptedHistory.length === 0 ? (
                <p className="text-center p-10 text-slate-400 font-medium">
                  No price history available for this product.
                </p>
              ) : (
                <>
                  {/* Legend */}
                  <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: "#2563eb" }}
                      />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Our Price
                      </span>
                    </div>
                    {chartCompetitors.map((c) => (
                      <div key={c.slug} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: c.color || "#475e77" }}
                        />
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          {c.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* SVG Chart */}
                  <div className="price-history-svg-wrap w-full">
                    <PriceHistorySVGChart
                      history={adaptedHistory}
                      competitors={chartCompetitors}
                      visibleSlugs={allVisibleSlugs}
                    />
                  </div>
                </>
              )}
            </Card>
          </PrintPage>

        </div>
      </div>
    </>
  );
};

export default Competitors;