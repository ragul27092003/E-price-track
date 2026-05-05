import { useState, useEffect, useMemo, useRef } from "react";
import { useStore } from "../store";
import { fetchProducts } from "../services/productsService";
import { fetchCompetitors } from "../services/competitorsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
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

function computeRank(product) {
  const ourPrice = parsePrice(product.product_price);
  if (ourPrice === null) return null;
  const compPrices = getCompPrices(product).map((c) => c.price);
  if (!compPrices.length) return 1;
  return compPrices.filter((p) => p < ourPrice).length + 1;
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

function getOurPriceStats(product) {
  const prices = (product.price_history_30days || [])
    .map((h) => parsePrice(h.product_price))
    .filter((v) => v !== null);
  if (!prices.length) {
    const p = parsePrice(product.product_price);
    return { low: p, avg: p, high: p };
  }
  return {
    low: Math.min(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    high: Math.max(...prices),
  };
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

// High-contrast palette for chart lines — each hue is visually distinct
const COMP_COLORS = ["#dc2626", "#16a34a", "#d97706", "#9333ea", "#0891b2", "#be185d", "#65a30d"];

// ─── Tab filter functions ─────────────────────────────────────────────────────

const TAB_FILTERS = {
  "Easy Gain": (p) => computeRank(p) === 1 && getCompPrices(p).length > 0,
  "Clever Move": (p) => {
    const ourPrice = parsePrice(p.product_price);
    const comps = getCompPrices(p);
    if (!comps.length || ourPrice === null) return false;
    return comps.some((c) => Math.abs(c.price - ourPrice) / Math.max(ourPrice, 1) < 0.01);
  },
  "Non Competitors": (p) => getCompPrices(p).length === 0,
  "Positive Trend": (p) => {
    if (computeRank(p) !== 1) return false;
    const ourPrice = parsePrice(p.product_price);
    const low = getLowestComp(p);
    if (!low || ourPrice === null) return false;
    return (low.price - ourPrice) / ourPrice > 0.05;
  },
  "Neutral Trend": (p) => {
    if (computeRank(p) !== 1) return false;
    const ourPrice = parsePrice(p.product_price);
    const low = getLowestComp(p);
    if (!low || ourPrice === null) return false;
    const marginPct = (low.price - ourPrice) / ourPrice;
    return marginPct >= 0 && marginPct <= 0.05;
  },
  "Negative Trend": (p) => {
    const r = computeRank(p);
    return r !== null && r >= 2;
  },
};

// ─── UI Components ────────────────────────────────────────────────────────────

function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-lg">
        📦
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 object-contain bg-slate-50"
    />
  );
}

function CompetitorLogo({ name = "", slug = "", logo = "" }) {
  const [imgErr, setImgErr] = useState(false);
  const bg = slugColor(slug || name);
  const label = (name || slug).slice(0, 8).toLowerCase();
  if (logo && !imgErr) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded overflow-hidden border border-slate-200 bg-white shrink-0">
        <img
          src={`http://localhost:5100${logo}`}
          alt={name}
          onError={() => setImgErr(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-6 min-w-[52px] items-center justify-center rounded px-1 text-[8px] font-bold uppercase tracking-wider text-white shrink-0"
      style={{ backgroundColor: bg }}
    >
      {label}
    </div>
  );
}

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
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function RankBadge({ rank }) {
  if (rank === null || rank === undefined) return null;
  const colors =
    rank === 1
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : rank === 2
      ? "bg-blue-100 text-blue-700 ring-blue-200"
      : "bg-rose-100 text-rose-700 ring-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${colors}`}>
      #{rank}
    </span>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${accent || "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function PriceGapBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400">No data</span>;
  }
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
  if (amount === null || amount === undefined) return <span className="text-xs text-slate-400">—</span>;
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
  if (amount === null || amount === undefined) return <span className="text-xs text-slate-400">—</span>;
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

// Compact tick formatter: ₹1.2L / ₹14.9k / ₹999
function fmtTick(v) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
}

// Smooth bezier path through points [{x,y}]
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

function HistoricalPriceChart({ product, days, competitorMeta }) {
  const svgRef  = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const history = useMemo(() => {
    if (!product?.price_history_30days) return [];
    return product.price_history_30days.slice(-days);
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

  // Chart geometry constants (viewBox units)
  const PL = 62, PR = 12, PT = 12, PB = 26;
  const W  = 540, H = 220;
  const PW = W - PL - PR;   // plot width
  const PH = H - PT - PB;   // plot height

  // Y-axis nice ticks
  const { yTicks, yMin, yMax } = useMemo(() => {
    if (!allVals.length) return { yTicks: [], yMin: 0, yMax: 1 };
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const span   = rawMax - rawMin || 1;
    const mag    = Math.pow(10, Math.floor(Math.log10(span / 4)));
    const step   = Math.ceil((span / 4) / mag) * mag;
    const yMin   = Math.floor(rawMin / step) * step;
    const count  = Math.ceil((rawMax - yMin) / step) + 1;
    const ticks  = Array.from({ length: Math.min(count, 6) }, (_, i) => yMin + i * step);
    return { yTicks: ticks, yMin, yMax: ticks[ticks.length - 1] };
  }, [allVals]);

  const yRange = yMax - yMin || 1;
  // Plain functions — called only during render, no stale-closure risk
  const getX = (i) => PL + (i / Math.max(chartData.length - 1, 1)) * PW;
  const getY = (v) => PT + PH - ((v - yMin) / yRange) * PH;

  // X-axis ticks: at most 7
  const xTicks = useMemo(() => {
    const step = Math.max(Math.ceil(chartData.length / 7), 1);
    return chartData.map((d, i) => ({ i, date: d.date })).filter((_, i) => i % step === 0);
  }, [chartData]);

  // Mouse → hovered index via SVG coordinate transform
  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg || !chartData.length) return;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (svgPt.x < PL || svgPt.x > W - PR) { setHoverIdx(null); return; }
    const idx = Math.round(((svgPt.x - PL) / PW) * (chartData.length - 1));
    setHoverIdx(Math.max(0, Math.min(chartData.length - 1, idx)));
  };

  if (!history.length || !allVals.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No price history available
      </div>
    );
  }

  // Build paths for each series
  const seriesPaths = dataKeys.map((key) => {
    const pts = chartData
      .map((d, i) => (d[key] !== null && d[key] !== undefined ? { x: getX(i), y: getY(d[key]) } : null))
      .filter(Boolean);
    return { key, pts, path: smoothPath(pts) };
  });

  // Area under "My Price"
  const mePts   = seriesPaths[0].pts;
  const mePath  = seriesPaths[0].path;
  const areaPath = mePts.length > 1
    ? `${mePath} L${mePts[mePts.length - 1].x},${PT + PH} L${mePts[0].x},${PT + PH} Z`
    : "";

  // Tooltip data for hovered index
  const hovered = hoverIdx !== null ? chartData[hoverIdx] : null;
  // Position tooltip: keep it from going off screen
  const tooltipSvgX = hoverIdx !== null ? getX(hoverIdx) : 0;
  const tooltipLeftPct = (tooltipSvgX / W) * 100;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Legend */}
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

      {/* Chart wrapper */}
      <div className="flex-1 relative w-full min-h-[180px]">

        {/* Hover tooltip (HTML overlay) */}
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2.5 text-[11px] min-w-[140px]"
            style={{
              left: `clamp(0px, calc(${tooltipLeftPct}% - 70px), calc(100% - 160px))`,
              top: "4px",
            }}
          >
            <p className="font-bold text-slate-600 mb-1.5 border-b border-slate-100 pb-1">{hovered.date}</p>
            {dataKeys.map((k, i) => {
              const val = hovered[k];
              if (val === null || val === undefined) return null;
              return (
                <div key={k} className="flex items-center justify-between gap-3 mt-0.5">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
                    {labels[i]}
                  </span>
                  <span className="font-bold text-slate-800">{fmt(val)}</span>
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
            {/* Clip so lines don't overflow into the axis padding */}
            <clipPath id="hpt-plot-clip">
              <rect x={PL} y={PT} width={PW} height={PH} />
            </clipPath>
          </defs>

          {/* ── Y-axis grid lines + labels ── */}
          {yTicks.map((v) => {
            const y = getY(v);
            return (
              <g key={v}>
                <line
                  x1={PL} y1={y} x2={W - PR} y2={y}
                  stroke="#e2e8f0" strokeWidth="1"
                />
                <text
                  x={PL - 6} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize="9.5" fill="#94a3b8" fontFamily="system-ui,sans-serif"
                >
                  {fmtTick(v)}
                </text>
              </g>
            );
          })}

          {/* ── X-axis labels ── */}
          {xTicks.map(({ i, date }) => (
            <text
              key={i}
              x={getX(i)} y={H - 6}
              textAnchor="middle"
              fontSize="9.5" fill="#94a3b8" fontFamily="system-ui,sans-serif"
            >
              {date}
            </text>
          ))}

          {/* ── Left axis border ── */}
          <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="#e2e8f0" strokeWidth="1" />

          {/* ── Area fill under My Price ── */}
          {areaPath && (
            <path d={areaPath} fill="url(#hpt-area-grad)" clipPath="url(#hpt-plot-clip)" />
          )}

          {/* ── Series lines ── */}
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

          {/* ── Hover crosshair + dots ── */}
          {hoverIdx !== null && hovered && (
            <g>
              <line
                x1={getX(hoverIdx)} y1={PT}
                x2={getX(hoverIdx)} y2={PT + PH}
                stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"
              />
              {dataKeys.map((key, ki) => {
                const val = hovered[key];
                if (val === null || val === undefined) return null;
                return (
                  <circle
                    key={key}
                    cx={getX(hoverIdx)} cy={getY(val)}
                    r="4.5"
                    fill={colors[ki]}
                    stroke="#fff" strokeWidth="2"
                  />
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
  const data = useMemo(() => {
    return (product?.price_history_30days || []).map((h) => {
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

  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No gap data</div>;

  const W = 240;
  const H = 80;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.gap)), 1) * 1.1;
  const midY = H / 2;
  const getX = (i) => (i / Math.max(data.length - 1, 1)) * W;
  const getY = (v) => midY - (v / maxAbs) * midY;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(d.gap)}`).join(" ");

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path
            d={`${linePath} L${W} ${midY} L0 ${midY} Z`}
            fill="rgba(239,246,255,0.8)"
          />
          <line x1={0} y1={midY} x2={W} y2={midY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
          <path d={linePath} fill="none" stroke="#2B86C5" strokeWidth="2" />
          {data.map((d, i) => (
            <circle key={i} cx={getX(i)} cy={getY(d.gap)} r="2.5" fill="#2B86C5" stroke="#fff" strokeWidth="1" />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {data.map((d, i) =>
          i % Math.max(Math.ceil(data.length / 5), 1) === 0 ? <span key={i}>{d.date}</span> : null
        )}
      </div>
    </div>
  );
}

// ─── Inventory Forecast (dummy data) ─────────────────────────────────────────

const INVENTORY_DATA = [
  { m: "Jan", cur: 80, pred: 90 }, { m: "Feb", cur: 60, pred: 75 },
  { m: "Mar", cur: 90, pred: 85 }, { m: "Apr", cur: 70, pred: 80 },
  { m: "May", cur: 50, pred: 70 }, { m: "Jun", cur: 85, pred: 95 },
  { m: "Jul", cur: 75, pred: 88 }, { m: "Aug", cur: 65, pred: 80 },
];

function InventoryForecast() {
  const W = 240; const H = 100;
  const maxV = 150;
  const bw = W / INVENTORY_DATA.length;
  const bw2 = bw * 0.35;
  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-2 flex gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />Current</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />Predicted</span>
      </div>
      <div className="flex-1 relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {INVENTORY_DATA.map((d, i) => {
            const x = i * bw + bw * 0.1;
            return (
              <g key={d.m}>
                <rect x={x} y={H - (d.cur / maxV) * H} width={bw2} height={(d.cur / maxV) * H} fill="#60a5fa" rx="2" />
                <rect x={x + bw2 + 2} y={H - (d.pred / maxV) * H} width={bw2} height={(d.pred / maxV) * H} fill="#34d399" rx="2" />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {INVENTORY_DATA.map((d) => <span key={d.m}>{d.m}</span>)}
      </div>
    </div>
  );
}

// ─── Competitor Price Table ───────────────────────────────────────────────────

function CompetitorTable({ product, tab, competitorMeta }) {
  const ourPrice = parsePrice(product.product_price);
  const comps = getCompPrices(product);

  const allEntries = [
    { name: "My Price", slug: "me", price: ourPrice, isMe: true },
    ...comps.map((c) => ({
      ...c,
      name: competitorMeta?.[c.slug]?.name || c.name || c.slug,
      logo: competitorMeta?.[c.slug]?.logo || "",
      isMe: false,
    })),
  ]
    .filter((e) => e.price !== null)
    .sort((a, b) => a.price - b.price);

  const rank1Price = allEntries[0]?.price;

  const colLabel =
    tab === "Negative Trend"
      ? "Higher By"
      : tab === "Positive Trend"
      ? "Higher By"
      : tab === "Neutral Trend"
      ? "Price Diff"
      : "Cheaper By";

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Competitor</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Price</th>
            <th className="text-center px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Rank</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">{colLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allEntries.map((entry, i) => {
            const rankNum = i + 1;
            let diffVal = null;
            let diffLabel = "";
            let diffColor = "";

            if (entry.isMe) {
              if (tab === "Negative Trend" && rank1Price !== null) {
                diffVal = ourPrice - rank1Price;
                diffLabel = diffVal > 0 ? `${fmt(diffVal)} higher` : "—";
                diffColor = "text-rose-600";
              } else {
                diffLabel = "—";
              }
            } else {
              if (tab === "Positive Trend" || tab === "Easy Gain" || tab === "Neutral Trend" || tab === "Clever Move") {
                diffVal = entry.price - (ourPrice || 0);
                diffLabel = diffVal >= 0 ? `${fmt(diffVal)} higher` : `${fmt(Math.abs(diffVal))} lower`;
                diffColor = diffVal > 0 ? "text-sky-600" : "text-rose-600";
              } else if (tab === "Negative Trend") {
                diffVal = entry.price - (ourPrice || 0);
                diffLabel = diffVal >= 0 ? `${fmt(diffVal)} lower` : `${fmt(Math.abs(diffVal))} higher`;
                diffColor = diffVal >= 0 ? "text-emerald-600" : "text-rose-600";
              } else {
                diffLabel = "—";
              }
            }

            return (
              <tr
                key={entry.slug}
                className={`transition-colors ${entry.isMe ? "bg-blue-50/60 font-semibold" : "hover:bg-slate-50"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {entry.isMe ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-[#2B86C5] text-[8px] font-bold text-white uppercase shrink-0">
                        ME
                      </div>
                    ) : (
                      <CompetitorLogo name={entry.name} slug={entry.slug} logo={entry.logo} />
                    )}
                    <span className="text-slate-800">{entry.name}</span>
                    {rankNum === 1 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">Rank 1</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(entry.price)}</td>
                <td className="px-4 py-3 text-center">
                  <RankBadge rank={rankNum} />
                </td>
                <td className={`px-4 py-3 text-right text-xs font-semibold ${diffColor}`}>
                  {diffLabel}
                </td>
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
  const marketAvg = getMarketAvg(product);
  const lowestComp = getLowestComp(product);
  const { low, avg, high } = getOurPriceStats(product);

  if (tab === "Non Competitors") {
    return (
      <div className="flex items-center flex-wrap gap-8">
        <MetricCard label="Current Price" value={fmt(ourPrice)} />
        <div className="h-10 w-px bg-slate-200" />
        <MetricCard label="Low (30d)" value={fmt(low)} accent="text-emerald-600" />
        <div className="h-10 w-px bg-slate-200" />
        <MetricCard label="Average (30d)" value={fmt(avg)} />
        <div className="h-10 w-px bg-slate-200" />
        <MetricCard label="High (30d)" value={fmt(high)} accent="text-rose-600" />
        <div className="h-10 w-px bg-slate-200" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Stock</p>
          <StockBadge stock={product.product_stock} />
        </div>
      </div>
    );
  }

  // All tabs except Non Competitors share the same Price Gap badge
  const gap = priceGap(product);

  let extraLabel = "Cheaper By";
  let extraContent = null;

  if (tab === "Easy Gain") {
    extraLabel = "Cheaper By";
    const cheaperBy = lowestComp ? lowestComp.price - ourPrice : null;
    extraContent = <CheaperByBadge amount={cheaperBy} />;
  } else if (tab === "Clever Move") {
    extraLabel = "Cheaper By";
    const cleverRank = computeRank(product);
    const cheaperBy = cleverRank === 1
      ? 1
      : lowestComp ? ourPrice - lowestComp.price + 1 : null;
    extraContent = <CheaperByBadge amount={cheaperBy} />;
  } else if (tab === "Positive Trend") {
    extraLabel = "Higher By";
    const higherBy = lowestComp && ourPrice !== null ? lowestComp.price - ourPrice : null;
    extraContent = <HigherByBadge amount={higherBy} label="higher" />;
  } else if (tab === "Neutral Trend") {
    extraLabel = "Price Diff";
    const diff = lowestComp && ourPrice !== null ? lowestComp.price - ourPrice : null;
    extraContent = <CheaperByBadge amount={diff} />;
  } else if (tab === "Negative Trend") {
    extraLabel = "Higher By";
    const higherBy = lowestComp && ourPrice !== null ? ourPrice - lowestComp.price : null;
    extraContent = <HigherByBadge amount={higherBy} label="above rank 1" />;
  }

  return (
    <div className="flex items-center flex-wrap gap-8">
      <MetricCard label="Current Price" value={fmt(ourPrice)} />
      <div className="h-10 w-px bg-slate-200" />
      <MetricCard label="Market Average" value={fmt(marketAvg)} />
      <div className="h-10 w-px bg-slate-200" />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Price Gap</p>
        <PriceGapBadge value={gap} />
      </div>
      <div className="h-10 w-px bg-slate-200" />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{extraLabel}</p>
        {extraContent}
      </div>
      <div className="h-10 w-px bg-slate-200" />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Rank</p>
        <RankBadge rank={rank} />
      </div>
      <div className="h-10 w-px bg-slate-200" />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Stock</p>
        <StockBadge stock={product.product_stock} />
      </div>
    </div>
  );
}

// ─── Sidebar Product Card ────────────────────────────────────────────────────

function SidebarProduct({ product, isSelected, onClick, tab }) {
  const ourPrice = parsePrice(product.product_price);
  const rank = computeRank(product);
  const sparkData = (product.price_history_30days || [])
    .map((h) => parsePrice(h.product_price))
    .filter((v) => v !== null)
    .slice(-10);

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all ${
        isSelected ? "bg-[#ebf5fb] ring-1 ring-[#2B86C5]/30" : "hover:bg-slate-100"
      }`}
    >
      <ProductImage src={product.product_image} alt={product.product_name} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-[13px] truncate ${isSelected ? "text-[#1e6191]" : "text-slate-800"}`}>
          {product.product_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-slate-500">{product.product_ean_id}</p>
          {rank && <RankBadge rank={rank} />}
        </div>
        <p className="text-[12px] font-bold text-slate-700 mt-0.5">{fmt(ourPrice)}</p>
      </div>
      <Sparkline data={sparkData} color={isSelected ? "#2B86C5" : "#94a3b8"} />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ["Easy Gain", "Clever Move", "Non Competitors", "Positive Trend", "Neutral Trend", "Negative Trend"];
const HISTORY_FILTERS = [
  { label: "Last 5 Days", value: 5 },
  { label: "Last 7 Days", value: 7 },
  { label: "Last 10 Days", value: 10 },
  { label: "Last 20 Days", value: 20 },
  { label: "Last 30 Days", value: 30 },
];

export default function SmartReports() {
  const { products, productsLoading, productsError, setProducts, setProductsLoading, setProductsError, competitors, setCompetitors } = useStore();
  const [activeTab, setActiveTab] = useState("Easy Gain");
  const [selectedEan, setSelectedEan] = useState(null);
  const [historyDays, setHistoryDays] = useState(30);

  useEffect(() => {
    if (!products.length) {
      setProductsLoading(true);
      fetchProducts()
        .then((data) => {
          setProducts(data);
          setProductsLoading(false);
        })
        .catch((e) => {
          setProductsError(e?.message || "Failed to load products");
          setProductsLoading(false);
        });
    }
    if (!competitors.length) {
      fetchCompetitors()
        .then((data) => setCompetitors(data))
        .catch(() => {});
    }
  }, []);

  const competitorMeta = useMemo(
    () => Object.fromEntries((competitors || []).map((c) => [c.slug, c])),
    [competitors]
  );

  const tabProducts = useMemo(
    () => (products || []).filter(TAB_FILTERS[activeTab] || (() => false)),
    [products, activeTab]
  );

  const selectedProduct = useMemo(() => {
    if (!tabProducts.length) return null;
    return tabProducts.find((p) => p.product_ean_id === selectedEan) || tabProducts[0];
  }, [tabProducts, selectedEan]);

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedEan(null);
  }, [activeTab]);

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((tab) => [tab, (products || []).filter(TAB_FILTERS[tab] || (() => false)).length])
      ),
    [products]
  );

  return (
    <div className="min-h-screen bg-white text-slate-800 p-6 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="mb-5 text-2xl font-bold text-slate-800">Smart Reports</h2>

          {/* Tab Navigation */}
          <div className="mb-8 flex flex-wrap gap-6 border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                  activeTab === tab ? "text-[#1e6191]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
                {tabCounts[tab] > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${activeTab === tab ? "bg-[#dbeafe] text-[#1e6191]" : "bg-slate-100 text-slate-500"}`}>
                    {tabCounts[tab]}
                  </span>
                )}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#2B86C5] rounded-t-md" />
                )}
              </button>
            ))}
          </div>

          {/* Loading / Error */}
          {productsLoading && (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <svg className="animate-spin h-6 w-6 mr-3 text-[#2B86C5]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading products…
            </div>
          )}

          {productsError && !productsLoading && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">{productsError}</div>
          )}

          {!productsLoading && !productsError && (
            <div key={activeTab} className="animate-in fade-in slide-in-from-right-4 duration-500">
              {tabProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <svg className="h-12 w-12 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
                  </svg>
                  <p className="font-medium">No products in this category</p>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                  {/* Left: Product Sidebar */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm h-[680px] overflow-y-auto flex flex-col gap-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                      {tabProducts.length} Product{tabProducts.length !== 1 ? "s" : ""}
                    </p>
                    {tabProducts.map((p) => (
                      <SidebarProduct
                        key={p.product_ean_id}
                        product={p}
                        isSelected={selectedProduct?.product_ean_id === p.product_ean_id}
                        onClick={() => setSelectedEan(p.product_ean_id)}
                        tab={activeTab}
                      />
                    ))}
                  </div>

                  {/* Right: Detail Panel */}
                  {selectedProduct && (
                    <div className="space-y-5">
                      {/* Product Title */}
                      <div className="flex items-center gap-4">
                        <ProductImage src={selectedProduct.product_image} alt={selectedProduct.product_name} />
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{selectedProduct.product_name}</h3>
                          <p className="text-sm text-slate-500">{selectedProduct.product_brand} · EAN: {selectedProduct.product_ean_id}</p>
                        </div>
                      </div>

                      {/* Header Metrics */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                        <HeaderMetrics product={selectedProduct} tab={activeTab} />
                      </div>

                      {/* Competitor Table (not for Non Competitors tab) */}
                      {activeTab !== "Non Competitors" && getCompPrices(selectedProduct).length > 0 && (
                        <CompetitorTable
                          product={selectedProduct}
                          tab={activeTab}
                          competitorMeta={competitorMeta}
                        />
                      )}

                      {/* Charts Row */}
                      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                        {/* Historical Price Trends */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm flex flex-col min-h-[300px]">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800">Historical Price Trends</h3>
                            <select
                              value={historyDays}
                              onChange={(e) => setHistoryDays(Number(e.target.value))}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-300"
                            >
                              {HISTORY_FILTERS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 relative">
                            <HistoricalPriceChart
                              product={selectedProduct}
                              days={historyDays}
                              competitorMeta={competitorMeta}
                            />
                          </div>
                        </div>

                        {/* Right column charts */}
                        <div className="flex flex-col gap-5">
                          {/* Inventory Forecast */}
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm flex flex-col min-h-[180px]">
                            <h3 className="mb-3 text-sm font-bold text-slate-800">Inventory Forecast</h3>
                            <div className="flex-1 relative w-full min-h-[100px]">
                              <InventoryForecast />
                            </div>
                          </div>

                          {/* Price Gap History */}
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm flex flex-col min-h-[160px]">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold text-slate-800">Price Gap History</h3>
                              <span className="text-[10px] text-slate-400">30 days · vs avg competitor</span>
                            </div>
                            <div className="flex-1 relative w-full min-h-[80px]">
                              <PriceGapChart product={selectedProduct} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
