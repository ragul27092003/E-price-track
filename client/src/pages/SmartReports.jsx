import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../store";
import { fetchSmartReportProducts, fetchSmartReportProductDetail, exportSmartReportProducts, fetchSmartReportTabCounts } from "../services/smartReportsService";
import { fetchCompetitors } from "../services/competitorsService";
import API from "../hooks/useApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ""));
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function isCompetitorOos(c) {
  if (
    String(c.stock).toLowerCase().includes("out of stock") ||
    String(c.stock) === "0"
  ) {
    return true;
  }
  return !!(c.is_listed && (c.price == null || c.price <= 0));
}

function fmt(v) {
  if (v === null || v === undefined) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function getCompPrices(product) {
  return (product.competitor_prices || [])
    .map((c) => ({ ...c, price: parsePrice(c.price) }))
    .filter((c) => c.price !== null);
}

function getListedCompetitors(product) {
  return (product.competitor_prices || [])
    .filter((c) => c.is_listed)
    .map((c) => ({ ...c, price: parsePrice(c.price) }));
}

// Match Products page export — Type A: single "Competitor Detail" column
function buildProductsTypeACompetitorDetail(product) {
  return (product.competitor_prices || [])
    .filter((c) => c.is_listed)
    .map((c) => {
      const outOfStock = isCompetitorOos(c);
      return outOfStock ? `${c.name} : Out Of Stock` : `${c.name} : ${c.price}`;
    })
    .join(", ");
}

// Match Products page export — Type B: one column per competitor slug
function buildProductsTypeBSlugMap(products, competitorMeta) {
  const slugMap = {};
  products.forEach((p) => {
    (p.competitor_prices || []).filter((c) => c.is_listed).forEach((c) => {
      if (!slugMap[c.slug]) {
        slugMap[c.slug] = competitorMeta?.[c.slug]?.name || c.name || c.slug;
      }
    });
  });
  return slugMap;
}

function buildProductsTypeBCompetitorMap(product) {
  const compMap = {};
  (product.competitor_prices || []).filter((c) => c.is_listed).forEach((c) => {
    compMap[c.slug] = isCompetitorOos(c)
      ? "Out Of Stock"
      : c.price;
  });
  return compMap;
}

function computeRank(product) {
  const ourPrice = parsePrice(product.product_price);
  if (ourPrice === null) return null;
  const compPrices = getCompPrices(product).map((c) => c.price);
  if (!compPrices.length) return 1;
  
  // Changed '<' to '<=' so tied competitors push our rank down to match the DB
  return compPrices.filter((p) => p <= ourPrice).length + 1;
}

function getMarketAvg(product) {
  const prices = getCompPrices(product).map((c) => c.price);
  if (!prices.length) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

function getLowestComp(product) {
  const comps = getCompPrices(product);
  if (!comps.length) return null;
  return comps.reduce((min, c) => (c.price < min.price ? c : min));
}

function marketStats(product) {
  const prices = (product.price_history_30days || [])
    .map((h) => (typeof h.product_price === "number" ? h.product_price : parseFloat(h.product_price)))
    .filter((v) => !isNaN(v) && v !== null);
  if (!prices.length) return { low: null, avg: null, high: null };
  return {
    low:  Math.min(...prices),
    high: Math.max(...prices),
    avg:  Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
  };
}

function priceGap(product) {
  const ourPrice = parsePrice(product.product_price);
  const { avg } = marketStats(product);
  if (avg === null || ourPrice === null) return null;
  return parseFloat(((ourPrice - avg) / avg * 100).toFixed(1));
}

const BRAND_COLORS = ["#1e40af", "#065f46", "#7c2d12", "#4c1d95", "#0e7490", "#92400e"];
function slugColor(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
  return BRAND_COLORS[h % BRAND_COLORS.length];
}

const COMP_COLORS = ["#dc2626", "#16a34a", "#d97706", "#9333ea", "#0891b2", "#be185d", "#65a30d"];

// ─── UI Components ────────────────────────────────────────────────────────────

function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a] text-lg">
        📦
      </div>
    );
  }
  return (
    <img
      src={src} alt={alt} onError={() => setErr(true)}
      className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-700/50 object-contain bg-slate-50 dark:bg-[#151a2a]"
    />
  );
}

function resolveLogoUrl(logo) {
  if (!logo) return null;
  if (logo.startsWith("blob:") || logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${API.defaults.baseURL.replace(/\/api\/?$/, '')}${logo}`;
}

function CompetitorLogo({ name = "", slug = "", logo = "" }) {
  const [imgErr, setImgErr] = useState(false);
  const bg = slugColor(slug || name);
  const label = (name || slug).slice(0, 8).toLowerCase();
  const logoSrc = resolveLogoUrl(logo);
  if (logoSrc && !imgErr) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <img src={logoSrc} alt={name} onError={() => setImgErr(true)} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="flex h-6 min-w-[52px] items-center justify-center rounded px-1 text-[8px] font-bold uppercase tracking-wider text-white shrink-0" style={{ backgroundColor: bg }}>
      {label}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function Sparkline({ data, width = 50, height = 18, color = "#3b82f6" }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="inline-block align-middle opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StockBadge({ stock }) {
  const qty = parseInt(stock, 10);
  const { label, dot } = isNaN(qty)
    ? { label: "Unknown", dot: "bg-slate-300" }
    : qty === 0
    ? { label: "Out of Stock", dot: "bg-rose-500" }
    : qty < 10
    ? { label: `Low (${qty})`, dot: "bg-amber-400" }
    : { label: `In Stock (${qty})`, dot: "bg-emerald-500" };
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function RankBadge({ rank, total }) {
  if (rank === null || rank === undefined) return null;
  const colors =
    rank === 1
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : rank === 2
      ? "bg-blue-100 text-blue-700 ring-blue-200"
      : "bg-rose-100 text-rose-700 ring-rose-200";
  const label = total ? `${rank}/${total}` : `#${rank}`;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${colors}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${accent || "text-slate-800 dark:text-white"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function PriceGapBadge({ value }) {
  if (value === null || value === undefined || value === 0) return null;
  const isNeg      = value < 0;
  const baseColors = isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const barColor   = isNeg ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className={`relative inline-flex items-center gap-1 rounded-full pr-3 pl-2 py-1 text-[11px] font-bold ${baseColors}`}>
      <svg
        className={`w-3 h-3 ${isNeg ? "text-emerald-500 rotate-180" : "text-amber-500"}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
      <div className={`w-0.5 h-3 opacity-30 ${barColor} mx-0.5 rounded-full`} />
      <span>{Math.abs(value)}% {isNeg ? "below" : "above"} market</span>
    </div>
  );
}

function CheaperByBadge({ amount }) {
  if (amount === null || amount === undefined) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-700">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {fmt(amount)} cheaper
    </div>
  );
}

function HigherByBadge({ amount, label = "higher" }) {
  if (amount === null || amount === undefined) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  const isGood = label === "higher";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${isGood ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700"}`}>
      <svg className={`w-3 h-3 ${isGood ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {fmt(Math.abs(amount))} {label}
    </div>
  );
}

// ─── Historical Price Chart ────────────────────────────────────────────────────

function fmtTick(v) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
}

function smoothPath(pts) {
  if (!pts || pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

function toHistoryTimestamp(row = {}) {
  const raw = row?.display_date || row?.date || "";
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? null : ts;
}

function getChronologicalHistory(priceHistory = [], days = 30) {
  const sliced = priceHistory.slice(-days);
  return [...sliced].sort((a, b) => {
    const ta = toHistoryTimestamp(a);
    const tb = toHistoryTimestamp(b);
    if (ta !== null && tb !== null) return ta - tb;
    return String(a?.display_date || "").localeCompare(String(b?.display_date || ""));
  });
}

function HistoricalPriceChart({ product, days, competitorMeta }) {
  const svgRef     = useRef(null);
  const wrapperRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [hoverContainerY, setHoverContainerY] = useState(0);

  const history = useMemo(() => {
    if (!product?.price_history_30days) return [];
    return getChronologicalHistory(product.price_history_30days, days);
  }, [product, days]);

  const slugs = useMemo(() => getCompPrices(product).map((c) => c.slug), [product]);

  const dataKeys = ["me", ...slugs];
  const colors   = ["#2B86C5", ...COMP_COLORS];
  const labels   = ["My Price", ...slugs.map((s) => competitorMeta?.[s]?.name || s)];

  const chartData = useMemo(() =>
    history.map((h) => {
      const row = { date: (h.display_date || "").slice(5) };
      row.me = parsePrice(h.product_price);
      slugs.forEach((s) => { row[s] = parsePrice(h.competitors?.[s]); });
      return row;
    }),
    [history, slugs]
  );

  const allVals = useMemo(
    () => chartData.flatMap((d) => dataKeys.map((k) => d[k])).filter((v) => v !== null),
    [chartData, dataKeys]
  );

  const PL = 62, PR = 12, PT = 12, PB = 26;
  const W  = 540, H = 220;
  const PW = W - PL - PR;   
  const PH = H - PT - PB;   

  const { yTicks, yMin, yMax } = useMemo(() => {
    if (!allVals.length) return { yTicks: [], yMin: 0, yMax: 1 };
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const span   = rawMax - rawMin || 1;
    const mag    = Math.pow(10, Math.floor(Math.log10(span / 4)));
    const step   = Math.ceil((span / 4) / mag) * mag;
    const yMinCalc   = Math.floor(rawMin / step) * step;
    const count  = Math.ceil((rawMax - yMinCalc) / step) + 1;
    const ticks  = Array.from({ length: Math.min(count, 6) }, (_, i) => yMinCalc + i * step);
    return { yTicks: ticks, yMin: yMinCalc, yMax: ticks[ticks.length - 1] };
  }, [allVals]);

  const yRange = yMax - yMin || 1;
  const getX = (i) => PL + (i / Math.max(chartData.length - 1, 1)) * PW;
  const getY = (v) => PT + PH - ((v - yMin) / yRange) * PH;

  const xTicks = useMemo(() => {
    const step = Math.max(Math.ceil(chartData.length / 7), 1);
    return chartData.map((d, i) => ({ i, date: d.date })).filter((_, i) => i % step === 0);
  }, [chartData]);

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg || !chartData.length) return;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (svgPt.x < PL || svgPt.x > W - PR) { setHoverIdx(null); return; }
    const idx = Math.round(((svgPt.x - PL) / PW) * (chartData.length - 1));
    setHoverIdx(Math.max(0, Math.min(chartData.length - 1, idx)));
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (wrapperRect) setHoverContainerY(e.clientY - wrapperRect.top);
  };

  if (!history.length || !allVals.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
        No price history available
      </div>
    );
  }

  const seriesPaths = dataKeys.map((key) => {
    const pts = chartData
      .map((d, i) => (d[key] !== null && d[key] !== undefined ? { x: getX(i), y: getY(d[key]) } : null))
      .filter(Boolean);
    return { key, pts, path: smoothPath(pts) };
  });

  const mePts   = seriesPaths[0].pts;
  const mePath  = seriesPaths[0].path;
  const areaPath = mePts.length > 1
    ? `${mePath} L${mePts[mePts.length - 1].x},${PT + PH} L${mePts[0].x},${PT + PH} Z`
    : "";

  const hovered = hoverIdx !== null ? chartData[hoverIdx] : null;
  const tooltipSvgX = hoverIdx !== null ? getX(hoverIdx) : 0;
  const tooltipLeftPct = (tooltipSvgX / W) * 100;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-3 flex flex-wrap gap-5">
        {dataKeys.map((k, i) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: colors[i] }}>
            {k === "me" ? (
              <span className="inline-block h-[3px] w-5 rounded-full" style={{ backgroundColor: colors[i] }} />
            ) : (
              <svg width="20" height="4" className="inline-block shrink-0">
                <line x1="0" y1="2" x2="20" y2="2" stroke={colors[i]} strokeWidth="2" strokeDasharray="5,3" />
              </svg>
            )}
            {labels[i]}
          </span>
        ))}
      </div>

      <div className="flex-1 relative w-full min-h-[180px]" ref={wrapperRef}>
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-3 py-2.5 text-[11px] min-w-[140px]"
            style={{
              left: `clamp(0px, calc(${tooltipLeftPct}% - 70px), calc(100% - 160px))`,
              top: `${hoverContainerY}px`,
              transform: "translateY(calc(-100% - 8px))",
            }}
          >
            <p className="font-bold text-slate-600 dark:text-slate-400 mb-1.5 border-b border-slate-100 dark:border-slate-700/50 pb-1">{hovered.date}</p>
            {dataKeys.map((k, i) => {
              const val = hovered[k];
              if (val === null || val === undefined) return null;
              return (
                <div key={k} className="flex items-center justify-between gap-3 mt-0.5">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
                    {labels[i]}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{fmt(val)}</span>
                </div>
              );
            })}
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="hpt-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2B86C5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2B86C5" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id="hpt-plot-clip">
              <rect x={PL} y={PT} width={PW} height={PH} />
            </clipPath>
          </defs>

          {yTicks.map((v) => {
            const y = getY(v);
            return (
              <g key={v}>
                <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={PL - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9.5" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                  {fmtTick(v)}
                </text>
              </g>
            );
          })}

          {xTicks.map(({ i, date }) => (
            <text key={i} x={getX(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#94a3b8" fontFamily="system-ui,sans-serif">
              {date}
            </text>
          ))}

          <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="#e2e8f0" strokeWidth="1" />

          {areaPath && (
            <path d={areaPath} fill="url(#hpt-area-grad)" clipPath="url(#hpt-plot-clip)" />
          )}

          {seriesPaths.map(({ key, path }, ki) =>
            path ? (
              <path
                key={key}
                d={path}
                fill="none"
                stroke={colors[ki]}
                strokeWidth={key === "me" ? 2.5 : 1.8}
                strokeDasharray={key === "me" ? undefined : "7,4"}
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#hpt-plot-clip)"
              />
            ) : null
          )}

          {hoverIdx !== null && hovered && (
            <g>
              <line x1={getX(hoverIdx)} y1={PT} x2={getX(hoverIdx)} y2={PT + PH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
              {dataKeys.map((key, ki) => {
                const val = hovered[key];
                if (val === null || val === undefined) return null;
                return (
                  <circle key={key} cx={getX(hoverIdx)} cy={getY(val)} r="4.5" fill={colors[ki]} stroke="#fff" strokeWidth="2" />
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// ─── Price Gap History Chart ──────────────────────────────────────────────────

function PriceGapChart({ product }) {
  const svgRef     = useRef(null);
  const wrapperRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [hoverContainerY, setHoverContainerY] = useState(0);

  const data = useMemo(() => {
    return getChronologicalHistory(product?.price_history_30days || [], 30).map((h) => {
      const ourPrice = parsePrice(h.product_price);
      const compPrices = Object.values(h.competitors || {})
        .map((v) => parsePrice(v))
        .filter((v) => v !== null);
      const avg = compPrices.length
        ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length
        : null;
      const gap = ourPrice !== null && avg !== null ? Math.round(ourPrice - avg) : null;
      return { date: (h.display_date || "").slice(5), gap };
    }).filter((d) => d.gap !== null);
  }, [product]);

  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">No gap data</div>;

  const PL = 48, PR = 12, PT = 16, PB = 20;
  const W = 320;
  const H = 140; 
  const PW = W - PL - PR;
  const PH = H - PT - PB;

  const rawMax = Math.max(...data.map((d) => Math.abs(d.gap)), 1);
  const span = rawMax || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(span)));
  const step = Math.ceil(span / mag) * mag;
  const maxAbs = step;

  const midY = PT + PH / 2;
  const getX = (i) => PL + (i / Math.max(data.length - 1, 1)) * PW;
  const getY = (v) => midY - (v / maxAbs) * (PH / 2);

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(d.gap)}`).join(" ");
  const yTicks = [maxAbs, 0, -maxAbs];

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg || !data.length) return;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (svgPt.x < PL || svgPt.x > W - PR) { setHoverIdx(null); return; }
    const idx = Math.round(((svgPt.x - PL) / PW) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (wrapperRect) setHoverContainerY(e.clientY - wrapperRect.top);
  };

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const tooltipSvgX = hoverIdx !== null ? getX(hoverIdx) : 0;
  const tooltipLeftPct = (tooltipSvgX / W) * 100;
  const areaPath = `${linePath} L${getX(data.length - 1)} ${midY} L${getX(0)} ${midY} Z`;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 relative w-full h-full min-h-[130px]" ref={wrapperRef}>
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-3 py-2.5 text-[11px] min-w-[130px]"
            style={{
              left: `clamp(0px, calc(${tooltipLeftPct}% - 65px), calc(100% - 130px))`,
              top: `${hoverContainerY}px`,
              transform: "translateY(calc(-100% - 8px))",
            }}
          >
            <p className="font-bold text-slate-600 dark:text-slate-400 mb-1.5 border-b border-slate-100 dark:border-slate-700/50 pb-1">{hovered.date}</p>
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <span className="text-slate-500 dark:text-slate-400">Gap vs Avg</span>
              <span className={`font-bold ${hovered.gap < 0 ? "text-emerald-600" : hovered.gap > 0 ? "text-rose-600" : "text-slate-600"}`}>
                {hovered.gap > 0 ? "+" : ""}{fmt(hovered.gap)}
              </span>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <clipPath id="pgc-above-zero"><rect x={PL} y={PT} width={PW} height={midY - PT} /></clipPath>
            <clipPath id="pgc-below-zero"><rect x={PL} y={midY} width={PW} height={PT + PH - midY} /></clipPath>
          </defs>

          {yTicks.map(v => (
            <g key={v}>
              <line x1={PL} y1={getY(v)} x2={W - PR} y2={getY(v)} stroke={v === 0 ? "#475569" : "#e2e8f0"} strokeWidth={v === 0 ? 2.5 : 1} strokeDasharray={v === 0 ? "" : "4,3"} />
              <text x={PL - 8} y={getY(v)} textAnchor="end" dominantBaseline="middle" fontSize="9.5" fill={v === 0 ? "#475569" : "#94a3b8"} fontFamily="system-ui,sans-serif" fontWeight={v === 0 ? "600" : "normal"}>
                {v > 0 ? `+${fmtTick(v)}` : v < 0 ? `-${fmtTick(Math.abs(v))}` : "0"}
              </text>
            </g>
          ))}

          <path d={areaPath} fill="rgba(239,68,68,0.18)" clipPath="url(#pgc-above-zero)" />
          <path d={areaPath} fill="rgba(34,197,94,0.18)" clipPath="url(#pgc-below-zero)" />
          <path d={linePath} fill="none" stroke="#2B86C5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) => <circle key={i} cx={getX(i)} cy={getY(d.gap)} r="2.5" fill="#2B86C5" stroke="#fff" strokeWidth="1" />)}

          {hoverIdx !== null && hovered && (
            <g>
              <line x1={getX(hoverIdx)} y1={PT} x2={getX(hoverIdx)} y2={PT + PH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
              <circle cx={getX(hoverIdx)} cy={getY(hovered.gap)} r="4.5" fill={hovered.gap < 0 ? "#16a34a" : "#dc2626"} stroke="#fff" strokeWidth="2" />
            </g>
          )}

          {data.map((d, i) => i % Math.max(Math.ceil(data.length / 5), 1) === 0 ? (
            <text key={i} x={getX(i)} y={H - 4} textAnchor="middle" fontSize="9.5" fill="#94a3b8" fontFamily="system-ui,sans-serif">{d.date}</text>
          ) : null)}
        </svg>
      </div>
    </div>
  );
}

// ─── Competitor Price Table ───────────────────────────────────────────────────

function CompetitorTable({ product, tab, competitorMeta }) {
  const ourPrice = parsePrice(product.product_price);
  const listedComps = getListedCompetitors(product);
  const comps = listedComps.filter((c) => c.price !== null);

 const allEntries = [
    { name: "My Price", slug: "me", price: ourPrice, isMe: true },
    ...listedComps.map((c) => ({
      ...c,
      name: competitorMeta?.[c.slug]?.name || c.name || c.slug,
      logo: competitorMeta?.[c.slug]?.logo || "",
      isMe: false,
    })),
  ]
    .sort((a, b) => {
      const aHasPrice = a.price !== null;
      const bHasPrice = b.price !== null;
      if (aHasPrice && !bHasPrice) return -1;
      if (!aHasPrice && bHasPrice) return 1;
      if (a.price !== b.price) return a.price - b.price;
      // Tie-breaker: Place competitors (isMe: false) before our store (isMe: true)
      return a.isMe ? 1 : -1;
    });

  const rank1Price = allEntries.find((entry) => entry.price !== null)?.price ?? null;
  const colLabel = tab === "Negative Trend" ? "Higher By" : tab === "Positive Trend" ? "Higher By" : tab === "Neutral Trend" ? "Price Status" : "Cheaper By";

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#151a2a] border-b border-slate-200 dark:border-slate-700">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Competitor</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Price</th>
            <th className="text-center px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Rank</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">{colLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {allEntries.map((entry, i) => {
            const rankNum = i + 1;
            let diffVal = null; let diffLabel = ""; let diffColor = "";

            if (entry.isMe) {
              if (tab === "Negative Trend" && rank1Price !== null) {
                diffVal = ourPrice - rank1Price;
                diffLabel = diffVal > 0 ? `${fmt(diffVal)} higher` : "—";
                diffColor = "text-rose-600";
              } else { diffLabel = "—"; }
            } else {
              if (entry.price === null) {
                diffLabel = "Out of Stock";
                diffColor = "text-slate-400";
              } else if (tab === "Positive Trend" || tab === "Easy Gain" || tab === "Neutral Trend" || tab === "Clever Move") {
                diffVal = entry.price - (ourPrice || 0);
                diffLabel = diffVal >= 0 ? `${fmt(diffVal)} higher` : `${fmt(Math.abs(diffVal))} lower`;
                diffColor = diffVal > 0 ? "text-sky-600" : "text-rose-600";
              } else if (tab === "Negative Trend") {
                diffVal = entry.price - (ourPrice || 0);
                diffLabel = diffVal >= 0 ? `${fmt(diffVal)} lower` : `${fmt(Math.abs(diffVal))} higher`;
                diffColor = diffVal >= 0 ? "text-emerald-600" : "text-rose-600";
              } else { diffLabel = "—"; }
            }

            return (
              <tr key={entry.slug} className={`transition-colors ${entry.isMe ? "bg-blue-50/60 dark:bg-blue-950/20 font-semibold" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {entry.isMe ? (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#2B86C5] text-[8px] font-bold text-white uppercase shrink-0">ME</div>
                        <span className="text-slate-800 dark:text-white">{entry.name}</span>
                      </>
                    ) : entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${entry.name}`}
                        className="inline-flex items-center gap-2 text-slate-800 dark:text-white hover:text-[#1e6191] dark:hover:text-blue-400 transition-colors"
                      >
                        <CompetitorLogo name={entry.name} slug={entry.slug} logo={entry.logo} />
                        <span>{entry.name}</span>
                      </a>
                    ) : (
                      <>
                        <CompetitorLogo name={entry.name} slug={entry.slug} logo={entry.logo} />
                        <span className="text-slate-800 dark:text-white">{entry.name}</span>
                      </>
                    )}
                    {rankNum === 1 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full px-1.5 py-0.5">Rank 1</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                  {entry.price === null ? (
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">Out of Stock</span>
                  ) : (
                    fmt(entry.price)
                  )}
                </td>
                <td className="px-4 py-3 text-center">{entry.price === null ? "—" : <RankBadge rank={rankNum} total={allEntries.length} />}</td>
                <td className={`px-4 py-3 text-right text-xs font-semibold ${diffColor}`}>{diffLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Header Metric Bar ────────────────────────────────────────────────────────

function HeaderMetrics({ product, tab }) {
  const ourPrice = parsePrice(product.product_price);
  const rank = computeRank(product);
  const rankTotal = getCompPrices(product).length + 1;
  const marketAvg = getMarketAvg(product);
  const lowestComp = getLowestComp(product);

  if (tab === "Non Competitors") {
    return (
      <div className="flex items-center flex-wrap gap-8">
        <MetricCard label="Current Price" value={fmt(ourPrice)} />
        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
        <div><p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Rank</p><RankBadge rank={1} total={1} /></div>
        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
        <div><p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Stock</p><StockBadge stock={product.product_stock} /></div>
      </div>
    );
  }

  const gap = priceGap(product);
  let extraLabel = "Cheaper By"; let extraContent = null;

  if (tab === "Easy Gain") {
    extraLabel = "Cheaper By"; extraContent = <CheaperByBadge amount={lowestComp ? lowestComp.price - ourPrice : null} />;
  }  else if (tab === "Clever Move") {
    // Calculates how much cheaper we are compared to the most expensive competitor
    const compPrices = getCompPrices(product).map((c) => c.price);
    const highestCompPrice = Math.max(...compPrices);
    
    extraLabel = "Cheaper By"; 
    extraContent = (
      <CheaperByBadge 
        amount={highestCompPrice && ourPrice !== null ? highestCompPrice - ourPrice : null} 
      />
    );
  } else if (tab === "Positive Trend") {
    extraLabel = "Higher By"; extraContent = <HigherByBadge amount={lowestComp && ourPrice !== null ? lowestComp.price - ourPrice : null} label="higher" />;
  }  else if (tab === "Neutral Trend") {
    extraLabel = "Price Status"; extraContent = <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-[12px] font-bold text-blue-700">Tied Price</span>;
  } else if (tab === "Negative Trend") {
    extraLabel = "Higher By"; extraContent = <HigherByBadge amount={lowestComp && ourPrice !== null ? ourPrice - lowestComp.price : null} label="above rank 1" />;
  }

  return (
    <div className="flex items-center flex-wrap gap-8">
      <MetricCard label="Current Price" value={fmt(ourPrice)} />
      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
      <MetricCard label="Market Average" value={fmt(marketAvg)} />
      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
      <div><p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">Price Gap</p><PriceGapBadge value={gap} /></div>
      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
      <div><p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">{extraLabel}</p>{extraContent}</div>
      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
      <div><p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Rank</p><RankBadge rank={rank} total={rankTotal} /></div>
      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
      <div><p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Stock</p><StockBadge stock={product.product_stock} /></div>
    </div>
  );
}

// ─── Sidebar Product Card ────────────────────────────────────────────────────

function SidebarProduct({ product, isSelected, onClick }) {
  const ourPrice = parsePrice(product.product_price);
  const rank = computeRank(product);
  const rankTotal = getCompPrices(product).length + 1;
  const sparkData = (product.price_history_30days || [])
    .map((h) => parsePrice(h.product_price))
    .filter((v) => v !== null)
    .slice(-10);

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all ${
        isSelected ? "bg-[#ebf5fb] dark:bg-blue-950/40 ring-1 ring-[#2B86C5]/30" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
      }`}
    >
      <ProductImage src={product.product_image} alt={product.product_name} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-[13px] truncate ${isSelected ? "text-[#1e6191] dark:text-blue-400" : "text-slate-800 dark:text-white"}`}>
          {product.product_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{product.product_ean_id}</p>
          {rank && <RankBadge rank={rank} total={rankTotal} />}
        </div>
        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">{fmt(ourPrice)}</p>
      </div>
      <Sparkline data={sparkData} color={isSelected ? "#2B86C5" : "#94a3b8"} />
    </button>
  );
}

// ─── Export Logic ───────────────────────────────────────────────────────────

function exportSmartReportCSV(products, tab, competitorMeta, exportType = "A") {
  const escape = (val) => {
    const s = String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const fmtNum = (v) => (v !== null && v !== undefined ? v : "");
  const isNonComp = tab === "Non Competitors";
  const gapColName = tab === "Negative Trend" ? "Higher By" : "Cheaper By";
  const storePriceLabel = exportType === "B" ? "Mrp Price" : "Store Price";

  const triggerDownload = (csv) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart_report_${tab.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  let slugMap = {};
  if (exportType === "B" && !isNonComp) {
    slugMap = buildProductsTypeBSlugMap(products, competitorMeta);
  }
  const bSlugs = Object.keys(slugMap);

  const headers = isNonComp
    ? ["Product Name", "Item Code", "Price", "Sap Price", storePriceLabel, "Brand", "Item Groups", "Market Low (30d)", "Market Avg (30d)", "Market High (30d)", "Stock"]
    : exportType === "B"
      ? ["Product Name", "Item Code", "Ranking Position", "Price", "Sap Price", storePriceLabel, gapColName, "Competitor Name", "Competitor Price", "Brand", "Item Groups", "Stock", ...bSlugs.map((s) => slugMap[s])]
      : ["Product Name", "Item Code", "Ranking Position", "Price", "Sap Price", storePriceLabel, gapColName, "Competitor Name", "Competitor Price", "Brand", "Item Groups", "Competitor Detail", "Stock"];

  const rows = products.map((p) => {
    const ourPrice = parsePrice(p.product_price);
    const rank = computeRank(p);
    const comps = getCompPrices(p);
    const rankTotal = comps.length + 1;
    const lowest = comps.length ? comps.reduce((min, c) => (c.price < min.price ? c : min)) : null;
    const lowestMeta = lowest ? (competitorMeta?.[lowest.slug] || {}) : {};
    const lowestName = lowest ? (lowestMeta.name || lowest.name || lowest.slug) : "";
    const pGroup = p.product_category ? p.product_category.split(">")[0].trim() : "";
    const sap = fmtNum(parsePrice(p.product_sap_price));
    const store = fmtNum(parsePrice(p.product_store_price));

    let gapAmount = "";
    if (lowest && ourPrice !== null) {
      gapAmount = tab === "Negative Trend" ? ourPrice - lowest.price : lowest.price - ourPrice;
    }

    const { low, avg, high } = isNonComp ? marketStats(p) : {};

    let row;
    if (isNonComp) {
      row = [p.product_name || "", p.product_ean_id || p.product_code || "", fmtNum(ourPrice), sap, store, p.product_brand || "", pGroup, fmtNum(low), fmtNum(avg), fmtNum(high), p.product_stock ?? ""];
    } else if (exportType === "B") {
      const compMap = buildProductsTypeBCompetitorMap(p);
      row = [p.product_name || "", p.product_ean_id || p.product_code || "", rank !== null ? `="${rank}/${rankTotal}"` : "", fmtNum(ourPrice), sap, store, fmtNum(gapAmount), lowestName, fmtNum(lowest?.price), p.product_brand || "", pGroup, p.product_stock ?? "", ...bSlugs.map((s) => compMap[s] ?? "Out Of Stock")];
    } else {
      const compDetail = buildProductsTypeACompetitorDetail(p);
      row = [p.product_name || "", p.product_ean_id || p.product_code || "", rank !== null ? `="${rank}/${rankTotal}"` : "", fmtNum(ourPrice), sap, store, fmtNum(gapAmount), lowestName, fmtNum(lowest?.price), p.product_brand || "", pGroup, compDetail, p.product_stock ?? ""];
    }
    return row.map(escape).join(",");
  });

  triggerDownload([headers.map(escape).join(","), ...rows].join("\r\n"));
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const TABS = ["Easy Gain", "Clever Move", "Non Competitors", "Positive Trend", "Neutral Trend", "Negative Trend"];
const PAGE_SIZE = 50;
const HISTORY_FILTERS = [
  { label: "Last 5 Days", value: 5 }, { label: "Last 7 Days", value: 7 },
  { label: "Last 10 Days", value: 10 }, { label: "Last 20 Days", value: 20 },
  { label: "Last 30 Days", value: 30 },
];

export default function SmartReports() {
  const location = useLocation();
  const { competitors, setCompetitors, activeStoreId, fetchMerchant } = useStore();
  const exportType = useStore((s) => s.exportType) || "A";
  const canExport  = useStore((s) => (s.user?.export_option ?? "yes") !== "no");

  const [activeTab, setActiveTab] = useState(location.state?.tab || "Easy Gain");
  const [selectedEan, setSelectedEan] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(30);

  const [listProducts, setListProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tabCounts, setTabCounts] = useState(() => Object.fromEntries(TABS.map((tab) => [tab, 0])));

  const sidebarRef = useRef(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (activeStoreId) {
      fetchMerchant(activeStoreId);
    }
    setTabCounts(Object.fromEntries(TABS.map((tab) => [tab, 0])));
    fetchSmartReportTabCounts()
      .then((data) => {
        if (data?.counts) setTabCounts(data.counts);
      })
      .catch(() => {});
    if (!competitors.length) {
      fetchCompetitors().then((data) => setCompetitors(data)).catch(() => {});
    }
  }, [activeStoreId]);

  useEffect(() => {
    let isMounted = true;
    const fetchId = ++fetchIdRef.current;

    const loadPage = async () => {
      setLoading(true);
      setListProducts([]);
      setPage(1);
      setHasMore(false);
      setSelectedEan(null);
      setSelectedProductDetail(null);

      try {
        const res = await fetchSmartReportProducts({
          tab: activeTab,
          page: 1,
          limit: PAGE_SIZE,
          search,
        });
        if (!isMounted || fetchId !== fetchIdRef.current) return;

        const data = res?.data || [];
        const fetchedTotal = res?.total ?? data.length;
        setListProducts(data);
        setTotal(fetchedTotal);
        if (res?.tabCounts) {
          setTabCounts(res.tabCounts);
        } else if (!search.trim()) {
          setTabCounts((prev) => ({ ...prev, [activeTab]: fetchedTotal }));
        }
        setHasMore(!!res?.hasMore);
        setPage(1);
        if (data.length) {
          setSelectedEan(data[0].product_ean_id);
        }
      } catch (err) {
        console.error("Error loading smart report products:", err);
        if (isMounted && fetchId === fetchIdRef.current) {
          setListProducts([]);
        }
      } finally {
        if (isMounted && fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };

    loadPage();
    if (sidebarRef.current) sidebarRef.current.scrollTop = 0;

    return () => { isMounted = false; };
  }, [activeTab, activeStoreId, search]);

  useEffect(() => {
    if (!selectedEan) {
      setSelectedProductDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    fetchSmartReportProductDetail(selectedEan)
      .then((data) => {
        if (!cancelled) setSelectedProductDetail(data);
      })
      .catch((err) => {
        console.error("Error loading product detail:", err);
        if (!cancelled) {
          const fallback = listProducts.find((p) => p.product_ean_id === selectedEan) || null;
          setSelectedProductDetail(fallback);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedEan]);

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await fetchSmartReportProducts({
        tab: activeTab,
        page: nextPage,
        limit: PAGE_SIZE,
        search,
      });
      const data = res?.data || [];
      setListProducts((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(!!res?.hasMore);
      if (search.trim()) {
        const fetchedTotal = res?.total ?? 0;
        setTotal(fetchedTotal);
      }
    } catch (err) {
      console.error("Error loading more smart report products:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setSearchInput("");
    setSearch("");
    if (sidebarRef.current) sidebarRef.current.scrollTop = 0;
  }, [activeTab]);

  const handleSidebarScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      loadMoreProducts();
    }
  };

  const competitorMeta = useMemo(() => Object.fromEntries((competitors || []).map((c) => [c.slug, c])), [competitors]);

  const selectedProduct = useMemo(() => {
    if (selectedProductDetail) return selectedProductDetail;
    if (!listProducts.length) return null;
    return listProducts.find((p) => p.product_ean_id === selectedEan) || listProducts[0];
  }, [selectedProductDetail, listProducts, selectedEan]);

  const displayTotal = search.trim() ? total : (tabCounts[activeTab] ?? total);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportSmartReportProducts({ tab: activeTab, search });
      exportSmartReportCSV(result.data || [], activeTab, competitorMeta, exportType);
    } catch (err) {
      console.error("Smart report export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b101e] text-slate-800 dark:text-white p-3 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Header Action Section Bar */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Smart Reports</h2>
            
            {/* Search Input Box Layout Container */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="flex w-full sm:max-w-xs items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40">
                <svg className="text-slate-400 shrink-0" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text" 
                  placeholder="Search product name, brand or code…" 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full border-0 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-400 bg-transparent"
                />
                {searchInput && (
                  <button onClick={() => setSearchInput("")} className="text-slate-400 hover:text-slate-600 shrink-0">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              {canExport && (search.trim() !== "" ? listProducts.length > 0 : tabCounts[activeTab] > 0) && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#226fa3] transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {exporting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  {exporting ? "Exporting…" : `Export ${activeTab}`}
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation header line */}
          <div className="mb-8 flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 gap-0 [scrollbar-width:none]">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-all relative flex shrink-0 items-center gap-2 mr-5 whitespace-nowrap ${
                  activeTab === tab ? "text-[#1e6191] dark:text-blue-400" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${activeTab === tab ? "bg-[#dbeafe] text-[#1e6191]" : "bg-slate-100 text-slate-500"}`}>
                  {tabCounts[tab]}
                </span>
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#2B86C5] rounded-t-md" />}
              </button>
            ))}
          </div>

          {loading && listProducts.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <svg className="animate-spin h-6 w-6 mr-3 text-[#2B86C5]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading products…
            </div>
          ) : listProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <p className="font-medium">No matching products found</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              {/* Left Paginated Scroll Sidebar */}
              <div
                ref={sidebarRef}
                onScroll={handleSidebarScroll}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151a2a] p-3 shadow-sm h-[680px] overflow-y-auto flex flex-col gap-1"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  {search.trim() !== ""
                    ? `${displayTotal} Match${displayTotal !== 1 ? "es" : ""}`
                    : `${displayTotal} Product${displayTotal !== 1 ? "s" : ""}`
                  }
                </p>

                {listProducts.map((p) => (
                  <SidebarProduct
                    key={p.product_ean_id || p.product_code || p._id}
                    product={p}
                    isSelected={selectedProduct?.product_ean_id === p.product_ean_id}
                    onClick={() => setSelectedEan(p.product_ean_id)}
                  />
                ))}

                {loadingMore && (
                  <div className="flex items-center justify-center py-4 text-slate-400">
                    <svg className="animate-spin h-5 w-5 mr-2 text-[#2B86C5]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading more…
                  </div>
                )}
              </div>

              {/* Right Side Metrics & Visualization Panel */}
              {selectedProduct && (
                <div className="space-y-5">
                  {detailLoading && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="animate-spin h-4 w-4 text-[#2B86C5]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading product details…
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <ProductImage src={selectedProduct.product_image} alt={selectedProduct.product_name} />
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{selectedProduct.product_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedProduct.product_brand} · EAN: {selectedProduct.product_ean_id || selectedProduct.product_code}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151a2a] p-3 md:p-5 shadow-sm">
                    <HeaderMetrics product={selectedProduct} tab={activeTab} />
                  </div>

                  {activeTab !== "Non Competitors" && getListedCompetitors(selectedProduct).length > 0 && (
                    <div className="overflow-x-auto rounded-xl">
                      <CompetitorTable product={selectedProduct} tab={activeTab} competitorMeta={competitorMeta} />
                    </div>
                  )}

                  <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    {/* Historical Trends Graph */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151a2a] p-3 md:p-5 shadow-sm flex flex-col min-h-[300px]">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Historical Price Trends</h3>
                        <select
                          value={historyDays}
                          onChange={(e) => setHistoryDays(Number(e.target.value))}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 outline-none"
                        >
                          {HISTORY_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 relative">
                        <HistoricalPriceChart product={selectedProduct} days={historyDays} competitorMeta={competitorMeta} />
                      </div>
                    </div>

                    {/* Price Gap History Graph */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151a2a] p-3 md:p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Price Gap History</h3>
                        <span className="text-[10px] text-slate-400">30 days · vs avg competitor</span>
                      </div>
                      <div className="flex-1 relative w-full flex items-center">
                        <PriceGapChart product={selectedProduct} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}