import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { fetchCompetitors } from '../services/competitorsService';
import { fetchProducts, fetchProductsMeta } from '../services/productsService';
import API from '../hooks/useApi';

// ─── Shared Helpers ───────────────────────────────────────────────────────────
const resolveLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
  return `${API.defaults.baseURL.replace(/\/api\/?$/, '')}${logo}`;
};

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

function marketStats(product) {
  const prices = (product.price_history_30days || [])
    .map((h) => (typeof h.product_price === "number" ? h.product_price : parseFloat(h.product_price)))
    .filter((v) => !isNaN(v) && v !== null);

  if (!prices.length) return { low: null, avg: null, high: null };
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  return { low, avg, high };
}

function trendFor(product, slug) {
  return (product.price_history_30days || [])
    .map((h) => h.competitors?.[slug])
    .filter((v) => v !== null && v !== undefined)
    .slice(-7);
}

function priceGap(product) {
  const ourPrice = parsePrice(product.product_price);
  const { avg } = marketStats(product);
  if (avg === null || ourPrice === null) return null;
  return parseFloat((((ourPrice - avg) / avg) * 100).toFixed(1));
}

const BRAND_COLORS = ["#1e40af", "#065f46", "#7c2d12", "#4c1d95", "#064e3b", "#1c1917"];
function slugColor(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
  return BRAND_COLORS[h % BRAND_COLORS.length];
}

// ─── Export Function ──────────────────────────────────────────────────────────
function exportToCSV(products, exportType = "A", competitorMeta = {}) {
  const escape = (val) => { const s = String(val ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };

  const triggerDownload = (csv) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competitor_products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const headers = ["Product Name", "Item Code", "Ranking Position", "Competing With", "Price", "SAP Price", "Store Price", "Item Groups", "Competitor Detail"];
  const rows = products.map((p) => {
    const compDetail = (p.competitor_prices || []).map((c) => {
      const outOfStock = c.price === null || c.price === undefined || c.stock === 0;
      return outOfStock ? `${c.name} : Out Of Stock` : `${c.name} : ${c.price}`;
    }).join(" | ");
    return [
      p.product_name || "", p.product_code || p.product_ean_id || "",
      p.user_notification_data?.rank_pos || p.rank_by || "", p.user_notification_data?.Competing_with ?? "",
      p.product_price ?? "", p.product_sap_price ?? "", p.product_store_price ?? "",
      p.product_item_group || p.product_category || "", compDetail,
    ].map(escape).join(",");
  });
  triggerDownload([headers.map(escape).join(","), ...rows].join("\r\n"));
}

// ─── Table UI Components ──────────────────────────────────────────────────────
function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a] text-lg shadow-sm">📦</div>
    );
  }
  return <img src={src} alt={alt} onError={() => setErr(true)} className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-700/50 object-contain shadow-sm bg-slate-50 dark:bg-[#151a2a]" />;
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
  return <div className="flex h-6 min-w-[52px] items-center justify-center rounded px-1 text-[8px] font-bold uppercase tracking-wider text-white shrink-0" style={{ backgroundColor: bg }}>{label}</div>;
}

function TableSparkline({ data, width = 50, height = 20, color = "#3b82f6" }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="inline-block align-middle opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RankBadge({ product }) {
  const rank = product.user_notification_data?.rank_pos || product.rank_by;
  if (!rank) return <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>;
  let displayRank = rank;
  if (!String(rank).includes('/')) {
    const active = (product.competitor_prices || []).filter(
      (c) => c.price !== null && !String(c.stock).toLowerCase().includes('out of stock') && String(c.stock) !== '0'
    ).length;
    displayRank = `${rank}/${active + 1}`;
  }
  const numRank = parseInt(rank, 10);
  let colorClass = "bg-slate-100 text-slate-700 dark:text-slate-300 dark:text-slate-600";
  if (numRank === 1) colorClass = "bg-emerald-100 text-emerald-700";
  else if (numRank === 2) colorClass = "bg-blue-100 text-blue-700";
  else if (numRank > 2) colorClass = "bg-rose-100 text-rose-700";
  return <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${colorClass}`}>{displayRank}</span>;
}

function PriceGapBadge({ value, ean }) {
  const navigate = useNavigate();

  const hasData = value !== null && value !== undefined;
  
  // Convert value to a strict number and safely check if it is 0
  const numericValue = Number(value);
  const isZero  = hasData && (numericValue === 0 || isNaN(numericValue)); 
  const isNeg   = hasData && numericValue < 0;
  
  const baseColors = isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const barColor   = isNeg ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Percentage badge — only show when data exists AND it is NOT exactly 0 */}
      {hasData && !isZero && (
        <div className={`relative inline-flex items-center gap-1 rounded-full pr-3 pl-2 py-1 text-[11px] font-bold ${baseColors}`}>
          <svg
            className={`w-3 h-3 ${isNeg ? "text-emerald-500 rotate-180" : "text-amber-500"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <div className={`w-0.5 h-3 opacity-30 ${barColor} mx-0.5 rounded-full`} />
          <span>{Math.abs(numericValue)}% {isNeg ? "below" : "above"} market</span>
        </div>
      )}

      {/* History shortcut links — Always show if EAN exists */}
      {ean && (
        <div className="flex items-center mt-0.5 bg-white dark:bg-[#151a2a] rounded-full border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden w-fit transition-all hover:shadow-md hover:border-slate-300">
          <button
            onClick={() => navigate(`/product-history?ean=${ean}&range=7`)}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border-r border-slate-200 dark:border-slate-700/60"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" />
            </svg>
            7 DAYS
          </button>
          <button
            onClick={() => navigate(`/product-history?ean=${ean}&range=30`)}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="3">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            30 DAYS
          </button>
        </div>
      )}
    </div>
  );
}

function MarketCap({ low, avg, high }) {
  const fmt = (v) => (v !== null ? `₹${v.toLocaleString("en-IN")}` : "—");
  return (
    <div className="flex items-center gap-8">
      <div><span className="text-[11px] text-slate-500">Low</span><br /><span className="font-bold text-slate-800 dark:text-white">{fmt(low)}</span></div>
      <div className="relative"><span className="text-[11px] text-slate-500">Average</span><br /><span className="font-bold text-slate-800 dark:text-white">{avg !== null ? `Avg: ₹${avg.toLocaleString("en-IN")}` : "—"}</span></div>
      <div><span className="text-[11px] text-slate-500">High</span><br /><span className="font-bold text-slate-800 dark:text-white">{fmt(high)}</span></div>
    </div>
  );
}

function MarketGapCell({ product, competitorMeta }) {
  const ourPrice = parsePrice(product.product_price);
  if (ourPrice === null) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;
  const active = (product.competitor_prices || []).map((c) => ({ ...c, price: parsePrice(c.price) })).filter((c) => c.price !== null && !String(c.stock).toLowerCase().includes('out of stock') && String(c.stock) !== '0');
  if (!active.length) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;
  const lowest = active.reduce((min, c) => (c.price < min.price ? c : min));
  const compName = competitorMeta?.[lowest.slug]?.name || lowest.name || lowest.slug;
  const gap = ourPrice - lowest.price;
  const fmtAmt = (v) => `₹${Math.abs(v).toLocaleString("en-IN")}`;

  if (gap === 0) return (<div className="flex flex-col gap-1"><span className="inline-flex text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 w-fit">Same price</span><span className="text-[10px] text-slate-400 mt-0.5">{fmtAmt(lowest.price)} ({compName}) = {fmtAmt(ourPrice)} mine</span></div>);
  if (gap > 0) return (<div className="flex flex-col gap-1"><span className="inline-flex text-[11px] font-bold text-rose-600 bg-rose-50 rounded-full px-2.5 py-1 w-fit">↑ {fmtAmt(gap)} higher</span><span className="text-[10px] text-slate-400 mt-0.5">{fmtAmt(lowest.price)} ({compName}) vs {fmtAmt(ourPrice)} mine</span></div>);
  return (<div className="flex flex-col gap-1"><span className="inline-flex text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 w-fit">↓ {fmtAmt(-gap)} cheaper</span><span className="text-[10px] text-slate-400 mt-0.5">{fmtAmt(lowest.price)} ({compName}) vs {fmtAmt(ourPrice)} mine</span></div>);
}

function CompetitorPrices({ product, competitorMeta }) {
  const listed = (product.competitor_prices || []).filter(c => c.is_listed);
  if (listed.length === 0) {
    const { low, avg, high } = marketStats(product);
    return <MarketCap low={low} avg={avg} high={high} />;
  }
  const sorted = [...listed].sort((a, b) => {
    const aOos = a.price === null || String(a.stock).toLowerCase().includes('out of stock') || String(a.stock) === '0';
    const bOos = b.price === null || String(b.stock).toLowerCase().includes('out of stock') || String(b.stock) === '0';
    if (!aOos && bOos) return -1;
    if (aOos && !bOos) return 1;
    if (!aOos && !bOos) return a.price - b.price;
    return 0;
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {sorted.map((c) => {
        const meta = competitorMeta?.[c.slug] || {};
        const isOos = c.price === null || String(c.stock).toLowerCase().includes('out of stock') || String(c.stock) === '0';
        return (
          <div key={c.slug} className={`flex items-center gap-2 ${isOos ? 'opacity-60 grayscale' : ''}`}>
            <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
            {isOos ? (
              <span className="font-bold text-slate-400 text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Out of Stock</span>
            ) : (
              <><span className="font-bold text-slate-800 dark:text-white text-[13px]">₹{c.price.toLocaleString("en-IN")}</span><TableSparkline data={trendFor(product, c.slug)} color="#0ea5e9" /></>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductCell({ product }) {
  return (
    <div className="flex items-center gap-4">
      <ProductImage src={product.product_image} alt={product.product_name} />
      <div>
        <p className="font-bold text-slate-800 dark:text-white text-[13px]">{product.product_name || "Unnamed Product"}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {product.product_brand && <span>{product.product_brand} · </span>}
          {product.product_ean_id || product.product_code || product._id}
        </p>
      </div>
    </div>
  );
}

function webPriceColorClass(rank) {
  const n = parseInt(rank, 10);
  if (!rank || isNaN(n)) return "text-slate-700 dark:text-slate-300";
  if (n === 1) return "text-emerald-600";
  if (n === 2) return "text-yellow-500";
  if (n === 3) return "text-orange-500";
  return "text-rose-600";
}

function PriceCell({ product }) {
  const web = parsePrice(product.product_price);
  const store = parsePrice(product.product_store_price);
  const sap = parsePrice(product.product_sap_price);
  const rank = product.user_notification_data?.rank_pos ?? product.rank_by;
  const fmt = (v) => v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";
  return (
    <div className="flex flex-col gap-1.5 min-w-[110px]">
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold text-slate-400 uppercase">Web</span><span className={`text-[12px] font-bold ${webPriceColorClass(rank)}`}>{fmt(web)}</span></div>
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold text-slate-400 uppercase">Store</span><span className="text-[12px] font-bold text-blue-600">{fmt(store)}</span></div>
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold text-slate-400 uppercase">SAP</span><span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{fmt(sap)}</span></div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, itemsOnPage, totalItems, onPageChange }) {
  if (totalPages <= 1 && (!itemsOnPage || itemsOnPage === 0)) return null;
  const ITEMS_PER_PAGE = 20;
  const windowSize = 5;
  const windowStart = currentPage < 5 ? 1 : currentPage - 4;
  const windowEnd = Math.min(windowStart + windowSize - 1, totalPages);
  const adjustedStart = Math.max(1, windowEnd - windowSize + 1);

  const pages = [];
  for (let i = adjustedStart; i <= windowEnd; i++) pages.push(i);

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = startItem + (itemsOnPage || 0) - 1;
  const formattedTotal = (totalItems || 0).toLocaleString("en-IN");
  const displayString = itemsOnPage > 0 ? `showing ${startItem}-${endItem} of ${formattedTotal} items` : `showing 0 items`;

  const pageBtn = (p) => (
    <button key={p} onClick={() => onPageChange(p)} className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${p === currentPage ? "bg-[#2B86C5] text-white border border-[#2B86C5]" : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151a2a]"}`}>
      {p}
    </button>
  );

  return (
    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#0b101e] px-5 py-3">
      <p className="text-[11px] font-medium text-slate-500 lowercase tracking-wide">{displayString}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 disabled:opacity-40 transition-colors">‹</button>
        {adjustedStart > 1 && <>{pageBtn(1)}<span className="px-1 text-slate-400">…</span></>}
        {pages.map((p) => pageBtn(p))}
        {windowEnd < totalPages && <><span className="px-1 text-slate-400">…</span>{pageBtn(totalPages)}</>}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 disabled:opacity-40 transition-colors">›</button>
      </div>
    </div>
  );
}

// ─── Filter Dropdown Component ────────────────────────────────────────────────
function FilterSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef(null);

  const ALL_LABEL = `All ${label}s`;
  const matched = ["", ...(options || []).filter((o) => o.toLowerCase().includes(query.toLowerCase()))];

  const commit = (val) => { onChange(val); setOpen(false); setQuery(""); setCursor(-1); };

  const handleKey = (e) => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, matched.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (cursor >= 0) commit(matched[cursor]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };

  const displayValue = open ? query : (value || "");
  const placeholder = value ? value : ALL_LABEL;

  return (
    <div className="relative flex-1 min-w-[140px] sm:min-w-[160px] max-w-full sm:max-w-[220px]">
      <p className="mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white dark:bg-slate-800 px-3 py-2.5 shadow-sm cursor-text ${open ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200 dark:border-slate-700"}`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          className="w-full border-0 bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400 min-w-0"
        />
        {value && (
          <button onMouseDown={(e) => { e.stopPropagation(); commit(""); }} className="shrink-0 text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onMouseDown={() => { setOpen(false); setQuery(""); }} />
          <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
            {matched.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No matches</p>
            ) : (
              matched.map((opt, i) => (
                <button
                  key={opt || "__all__"}
                  onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${i === cursor ? "bg-blue-50 text-blue-700" : opt === value ? "bg-slate-50 font-medium text-slate-800" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                >
                  {opt || ALL_LABEL}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Market Competitors Layout Components ──────────────────────────────────────
const generateTrend = (seed, delta) => {
  const normalizedSeed = Math.max(1, seed || 1);
  const base = 30 + ((normalizedSeed * 7919) % 40); 
  const isNeg = String(delta || '').includes('-');
  const deltaNum = parseFloat(String(delta || '0').replace('%', '')) || 0;
  const isFlat = deltaNum === 0 || !seed;
  const trendStrength = Math.min(Math.abs(deltaNum) / 100, 3) * 0.5;
  
  return Array.from({ length: 7 }, (_, i) => {
    if (isFlat) return 50;
    const noise = (((seed || 1) * (i + 3)) % 20) - 10;
    const trend = isNeg ? -i * trendStrength - (i * i) * 0.1 : i * trendStrength + (i * i) * 0.05;
    return Math.max(10, Math.min(90, base + noise + trend));
  });
};

const AreaSparkline = ({ productsTracked, avgPriceDelta }) => {
  const points = generateTrend(productsTracked, avgPriceDelta);
  const w = 100, h = 30;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`);
  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `M ${coords[0]} L ${coords.join(' L ')} L ${w},${h} L 0,${h} Z`;
  const isNeg = String(avgPriceDelta || '').includes('-');
  const line = isNeg ? '#ef5350' : '#1976d2';
  const fill = isNeg ? '#ffebee' : '#e3f2fd';
  return (
    <div className="w-[120px] h-[35px] flex items-end">
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={areaD} fill={fill} fillOpacity="0.6" />
        <path d={pathD} fill="none" stroke={line} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const CompetitorRow = ({ data, onClick }) => {
  const isNegDelta = String(data.avgPriceDelta).includes('-');
  const isOffline = !data.isActive;
  const logoUrl = resolveLogoUrl(data.logo);

  return (
    <div className="group relative">
      <div onClick={() => !isOffline && onClick(data)} className={`flex flex-col sm:flex-row sm:items-center p-4 border rounded-lg mb-3 transition-all duration-150 shadow-sm gap-3 sm:gap-0 ${isOffline ? 'bg-gray-100 border-gray-200 dark:border-slate-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-slate-800 border-blue-200 cursor-pointer hover:shadow-md hover:bg-blue-50 dark:hover:bg-slate-700'}`}>
        <div className="flex items-center gap-4 w-full sm:w-[45%]">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm" style={{ backgroundColor: data.color || '#475e77' }}>
            {logoUrl ? <img src={logoUrl} alt={data.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} /> : <span className="text-[12px] font-bold text-white uppercase">{data.name.substring(0, 2).toUpperCase()}</span>}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-bold truncate ${isOffline ? 'text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-white'}`}>{data.name}</span>
            {isOffline ? <span className="mt-0.5 w-fit bg-gray-200 text-gray-500 rounded px-1.5 py-0.5 text-[9px] font-black uppercase">Offline</span> : <span className="sm:hidden text-[10px] text-blue-500 font-medium">Tap to view products</span>}
          </div>
        </div>
        <div className="flex items-center justify-between sm:contents w-full border-t sm:border-none pt-2 sm:pt-0">
          <div className="sm:w-[20%] flex flex-col sm:block">
            <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Avg Delta</span>
            <span className={`text-sm font-black ${isOffline ? 'text-gray-300' : isNegDelta ? 'text-red-600' : 'text-green-600'}`}>{isNegDelta ? '▼' : '▲'} {data.avgPriceDelta || '+0.0%'}</span>
          </div>
          <div className="sm:w-[20%] flex flex-col sm:block text-right sm:text-left">
            <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Tracking</span>
            <span className={`text-sm font-bold sm:font-medium ${isOffline ? 'text-gray-300' : 'text-gray-800 dark:text-white'}`}>{data.productsTracked ?? 0} <span className="text-[10px] sm:text-sm uppercase sm:normal-case">Items</span></span>
          </div>
          <div className="hidden sm:flex sm:w-[15%] justify-end pr-2">
            {!isOffline && <span className="text-xl font-light text-blue-300 group-hover:translate-x-1 transition-transform">›</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const MarketCompetitor = () => {
  const competitors = useStore((s) => s.competitors);
  const setCompetitors = useStore((s) => s.setCompetitors);
  const competitorsLoading = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const activeStoreId = useStore((s) => s.activeStoreId);

  // Meta data for dropdowns
  const productsMeta = useStore((s) => s.productsMeta);
  const setProductsMeta = useStore((s) => s.setProductsMeta);

  // Build the competitorMeta map needed by the Product Table components
  const competitorMeta = {};
  competitors.forEach((c) => {
    competitorMeta[c.slug] = { isActive: c.isActive, logo: c.logo || "", name: c.name };
  });

  // State for product display
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [competitorProducts, setCompetitorProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Filter & Pagination State
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadCompetitors = async () => {
    setCompetitorsLoading(true);
    try {
      const data = await fetchCompetitors();
      setCompetitors(data || []);
    } catch (err) {
      console.error('MarketCompetitor: failed to fetch competitors', err);
    } finally {
      setCompetitorsLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitors();
    fetchProductsMeta().then(setProductsMeta).catch(() => {});
  }, [activeStoreId]);

  const loadCompetitorProducts = async (competitor, page = 1) => {
    setProductsLoading(true);
    try {
      const response = await fetchProducts({
        page,
        limit: 20,
        competitorSlug: competitor.slug,
        search: search || undefined,
        brand: brandFilter || undefined,
        category: catFilter || undefined,
        rank: rankFilter || undefined,
        itemGroup: itemGroupFilter || undefined,
      });
      const rows = Array.isArray(response) ? response : (response?.data || []);
      setCompetitorProducts(rows);
      setTotalPages(response?.totalPages || 1);
      setTotalItems(response?.total || rows.length);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch competitor products:', err);
      setCompetitorProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // Re-fetch products when filters or pagination changes
  useEffect(() => {
    if (selectedCompetitor) {
      loadCompetitorProducts(selectedCompetitor, currentPage);
    }
  }, [selectedCompetitor, currentPage, search, brandFilter, catFilter, rankFilter, itemGroupFilter]);

  const handleCompetitorClick = (competitor) => {
    setSearch("");
    setBrandFilter("");
    setCatFilter("");
    setRankFilter("");
    setItemGroupFilter("");
    setCurrentPage(1);
    setSelectedCompetitor(competitor);
  };

  const handlePageChange = (page) => setCurrentPage(page);

  const eanList = competitors.filter((c) => c.mappingType === 'EAN');
  const nonEanList = competitors.filter((c) => c.mappingType === 'NON_EAN');

  if (competitorsLoading) {
    return (
      <div className="flex justify-center p-20 bg-white dark:bg-slate-800 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ── VIEW 2: FULL PRODUCT TABLE FOR SELECTED COMPETITOR ──
  if (selectedCompetitor) {
    return (
      <div className="p-3 sm:p-6 bg-white dark:bg-[#0b101e] min-h-screen font-sans">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <button 
            onClick={() => setSelectedCompetitor(null)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Competitors
          </button>
          <div className="flex items-center gap-3">
            <CompetitorLogo name={selectedCompetitor.name} slug={selectedCompetitor.slug} logo={selectedCompetitor.logo} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              Products for {selectedCompetitor.name}
            </h2>
          </div>
        </div>

        {/* ── Filters Section (Search, Export, Dropdowns) ── */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {/* Search */}
            <div className="flex w-full sm:max-w-sm items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40">
              <svg className="text-slate-400" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text" placeholder="Search by name, brand or EAN…" value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full border-0 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
              />
            </div>
            {/* Export */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => exportToCSV(competitorProducts, "A", competitorMeta)}
                className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#226fa3] transition-colors"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Item Group" options={productsMeta?.itemGroups || []} value={itemGroupFilter} onChange={(v) => { setItemGroupFilter(v); setCurrentPage(1); }} />
            <FilterSelect label="Brand"      options={productsMeta?.brands || []}     value={brandFilter}     onChange={(v) => { setBrandFilter(v); setCurrentPage(1); }} />
            <FilterSelect label="Category"   options={productsMeta?.categories || []} value={catFilter}       onChange={(v) => { setCatFilter(v); setCurrentPage(1); }} />
            <FilterSelect label="Rank"       options={productsMeta?.ranks || []}      value={rankFilter}      onChange={(v) => { setRankFilter(v); setCurrentPage(1); }} />
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {productsLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-500" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]/50">
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Rank</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Prices</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Market</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {competitorProducts.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No products found for this competitor.</td></tr>
                    ) : (
                      competitorProducts.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-[#151a2a]/80 transition-colors">
                          <td className="px-5 py-4"><ProductCell product={p} /></td>
                          <td className="px-5 py-4"><PriceCell product={p} /></td>
                          <td className="px-5 py-4"><RankBadge product={p} /></td>
                          <td className="px-5 py-4"><PriceGapBadge value={priceGap(p)} ean={p.product_ean_id} /></td>
                          <td className="px-5 py-4"><CompetitorPrices product={p} competitorMeta={competitorMeta} /></td>
                          <td className="px-5 py-4"><MarketGapCell product={p} competitorMeta={competitorMeta} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                itemsOnPage={competitorProducts.length} 
                totalItems={totalItems}
                onPageChange={handlePageChange} 
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // ── VIEW 1: COMPETITOR LIST ──
  return (
    <div className="p-3 sm:p-6 bg-white dark:bg-[#0b101e] min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-[1000px] h-fit border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="bg-[#475e77] text-white p-4 px-5">
          <h2 className="text-xs sm:text-sm font-bold">
            Competitor Listings <span className="hidden sm:inline">— Click a competitor to view their products</span>
          </h2>
        </div>

        {competitors.length === 0 ? (
          <div className="p-3 sm:p-6 bg-[#f8fafd] dark:bg-slate-800">
            <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500 italic">
              No competitors found.
            </div>
          </div>
        ) : (
          <>
            {/* ── EAN Section ── */}
            {eanList.length > 0 && (
              <>
                <div className="px-5 pt-4 pb-1 bg-[#f8fafd] dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  <span className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                    EAN Competitors
                  </span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded-full px-2 py-0.5">{eanList.length}</span>
                </div>
                {/* Column headings */}
                <div className="hidden sm:flex px-8 pt-3 pb-2 bg-[#f8fafd] dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[45%]">Competitor</span>
                  <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[20%]">Avg. Price Delta</span>
                  <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[20%]">Products Tracked</span>
                  <span className="w-[15%]" />
                </div>
                <div className="p-3 sm:p-6 bg-[#f8fafd] dark:bg-slate-800">
                  {eanList.map((item) => (
                    <CompetitorRow key={item.id} data={item} onClick={handleCompetitorClick} />
                  ))}
                </div>
              </>
            )}

            {/* ── NON-EAN Section ── */}
            {nonEanList.length > 0 && (
              <>
                <div className="px-5 pt-4 pb-1 bg-[#f8fafd] dark:bg-slate-800 border-t-2 border-b border-gray-200 dark:border-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  <span className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                    Non-EAN Competitors
                  </span>
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300 rounded-full px-2 py-0.5">{nonEanList.length}</span>
                </div>
                {/* Column headings */}
                <div className="hidden sm:flex px-8 pt-3 pb-2 bg-[#f8fafd] dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[45%]">Competitor</span>
                  <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[20%]">Avg. Price Delta</span>
                  <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[20%]">Products Tracked</span>
                  <span className="w-[15%]" />
                </div>
                <div className="p-3 sm:p-6 bg-[#f8fafd] dark:bg-slate-800">
                  {nonEanList.map((item) => (
                    <CompetitorRow key={item.id} data={item} onClick={handleCompetitorClick} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MarketCompetitor;