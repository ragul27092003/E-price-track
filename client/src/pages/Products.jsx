import { useState, useEffect, useRef } from "react";
import { buildProductHistoryUrl } from "../utilis/urls";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { fetchProducts, fetchProductsMeta, configureProduct, removeProductConfiguration,exportProductsCSV, saveWebPriceData } from "../services/productsService";
import { fetchCompetitors } from "../services/competitorsService";
import API from "../hooks/useApi";
import { Rss, Globe } from "lucide-react";
import Swal from "sweetalert2";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ""));
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function formatPrice(v) {
  return v === null || v === undefined ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;
}

function isCompetitorOos(c) {
  if (
    String(c.stock).toLowerCase().includes("out of stock") ||
    String(c.stock) === "0"
  ) {
    return true;
  }
  // Listed but no valid price — still on site, temporarily unavailable
  return !!(c.is_listed && (c.price == null || c.price <= 0));
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
  return parseFloat(((ourPrice - avg) / avg * 100).toFixed(1));
}

const BRAND_COLORS = ["#1e40af", "#065f46", "#7c2d12", "#4c1d95", "#064e3b", "#1c1917"];
function slugColor(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
  return BRAND_COLORS[h % BRAND_COLORS.length];
}

// ── UI Components ──────────────────────────────────────────────────────────────

function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a] shadow-sm">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-300 dark:text-slate-600"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 15l-5-5a2 2 0 0 0-2.8 0L3 19" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-700/50 object-contain shadow-sm bg-slate-50 dark:bg-[#151a2a]"
    />
  );
}

function resolveProductImage(product) {
  const isValidImage = (v) => v && v !== "No Result";

  // 1. Our own scraped image, if valid
  if (isValidImage(product.product_image)) {
    return product.product_image;
  }

  const competitors = product.competitor_prices || [];

  // 2. Prefer an in-stock competitor that has a valid image
  const inStockWithImage = competitors.find(
    (c) =>
      isValidImage(c.image) &&
      !String(c.stock).toLowerCase().includes("out of stock") &&
      String(c.stock) !== "0"
  );

  if (inStockWithImage) {
    return inStockWithImage.image;
  }

  // 3. Fallback: any competitor with a valid image, even out of stock
  const anyWithImage = competitors.find((c) => isValidImage(c.image));

  if (anyWithImage) {
    return anyWithImage.image;
  }

  return null;
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
    <div
      className="flex h-6 min-w-[52px] items-center justify-center rounded px-1 text-[8px] font-bold uppercase tracking-wider text-white shrink-0"
      style={{ backgroundColor: bg }}
    >
      {label}
    </div>
  );
}

function Sparkline({ data, width = 50, height = 20, color = "#3b82f6" }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");
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
    // Only count active competitors that are NOT out of stock
    const active = (product.competitor_prices || []).filter(
      (c) => c.price != null && c.price > 0 && !String(c.stock).toLowerCase().includes('out of stock') && String(c.stock) !== '0'
    ).length;
    displayRank = `${rank}/${active + 1}`;
  }

  const numRank = parseInt(rank, 10);
  let colorClass = "bg-slate-100 text-slate-700 dark:text-slate-300 dark:text-slate-600";
  if (numRank === 1) colorClass = "bg-emerald-100 text-emerald-700";
  else if (numRank === 2) colorClass = "bg-blue-100 text-blue-700";
  else if (numRank > 2) colorClass = "bg-rose-100 text-rose-700";

  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${colorClass}`}>
      {displayRank}
    </span>
  );
}

function PriceGapBadge({ value, ean }) {
  const navigate = useNavigate();

  const hasData = value !== null && value !== undefined;
  const isZero  = hasData && value === 0; // Check if the gap is exactly 0
  const isNeg   = hasData && value < 0;
  
  const baseColors = isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const barColor   = isNeg ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Percentage badge — only show when data exists AND it is not 0% */}
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
          <span>{Math.abs(value)}% {isNeg ? "below" : "above"} market</span>
        </div>
      )}

      {/* History shortcut links — Always show if EAN exists */}
      {ean && (
        <div className="flex items-center mt-0.5 bg-white dark:bg-[#151a2a] rounded-full border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden w-fit transition-all hover:shadow-md hover:border-slate-300">
          <button
            onClick={() => navigate(buildProductHistoryUrl(ean, 7))}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border-r border-slate-200 dark:border-slate-700/60"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" />
            </svg>
            7 DAYS
          </button>
          <button
            onClick={() => navigate(buildProductHistoryUrl(ean, 30))}
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
      <div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Low</span><br />
        <span className="font-bold text-slate-800 dark:text-white">{fmt(low)}</span>
      </div>
      <div className="relative">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Average</span><br />
        <span className="font-bold text-slate-800 dark:text-white">{avg !== null ? `₹${avg.toLocaleString("en-IN")}` : "—"}</span>
        {avg !== null && (
          <>
            <div className="absolute top-1/2 -left-4 w-2 h-0.5 bg-emerald-500" />
            <div className="absolute top-1/2 -right-4 w-2 h-0.5 bg-rose-500" />
          </>
        )}
      </div>
      <div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">High</span><br />
        <span className="font-bold text-slate-800 dark:text-white">{fmt(high)}</span>
      </div>
    </div>
  );
}

function MarketGapCell({ product, competitorMeta }) {
  const ourPrice = parsePrice(product.product_price);
  if (ourPrice === null) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;

  // Only compare against valid prices that are in stock
  const active = (product.competitor_prices || [])
    .map((c) => ({ ...c, price: parsePrice(c.price) }))
    .filter((c) => c.price != null && c.price > 0 && !String(c.stock).toLowerCase().includes('out of stock') && String(c.stock) !== '0');

  if (!active.length) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;

  const lowest = active.reduce((min, c) => (c.price < min.price ? c : min));
  const meta = competitorMeta?.[lowest.slug] || {};
  const compName = meta.name || lowest.name || lowest.slug;
  const gap = ourPrice - lowest.price;
  const fmtAmt = (v) => `₹${Math.abs(v).toLocaleString("en-IN")}`;

  if (gap === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 rounded-full px-2.5 py-1 w-fit">Same price</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtAmt(lowest.price)} ({compName}) = {fmtAmt(ourPrice)} mine</span>
      </div>
    );
  }

  if (gap > 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 rounded-full px-2.5 py-1 w-fit">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          {fmtAmt(gap)} higher
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtAmt(lowest.price)} ({compName}) vs {fmtAmt(ourPrice)} mine</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 w-fit">
        <svg className="w-3 h-3 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        {fmtAmt(-gap)} cheaper
      </span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtAmt(lowest.price)} ({compName}) vs {fmtAmt(ourPrice)} mine</span>
    </div>
  );
}

function CompetitorPrices({ product, competitorMeta, onShowHistory }) {
  // Get all competitors that actually have this product listed (even if out of stock)
  const listed = (product.competitor_prices || []).filter(c => c.is_listed);

  if (listed.length === 0) {
    const { low, avg, high } = marketStats(product);
    return <MarketCap low={low} avg={avg} high={high} />;
  }

  // Sort: Valid in-stock prices first, then Out Of Stock
  const sorted = [...listed].sort((a, b) => {
    const aOos = isCompetitorOos(a);
    const bOos = isCompetitorOos(b);

    if (!aOos && bOos) return -1;
    if (aOos && !bOos) return 1;
    if (!aOos && !bOos) return a.price - b.price;
    return 0;
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {sorted.map((c) => {
        const meta = competitorMeta?.[c.slug] || {};
        const isOos = isCompetitorOos(c);

        return (
          <div key={c.slug} className="flex items-center gap-2">
            {isOos ? (
              c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open on ${c.name}`}
                  className="flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer"
                >
                  <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">Out of Stock</span>
                </a>
              ) : (
                <>
                  <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">Out of Stock</span>
                </>
              )
            ) : c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open on ${c.name}`}
                className="flex items-center gap-2 hover:opacity-75 transition-opacity"
              >
                <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                <span className="font-bold text-slate-800 dark:text-white text-[13px]">
                  ₹{c.price.toLocaleString("en-IN")}
                </span>
              </a>
            ) : (
              <>
                <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                <span className="font-bold text-slate-800 dark:text-white text-[13px]">₹{c.price.toLocaleString("en-IN")}</span>
              </>
            )}

            {!isOos && (
              <button
                onClick={() => onShowHistory?.(product, { slug: c.slug, name: c.name, color: meta.color, logo: meta.logo || "" })}
                className="group flex items-center justify-center h-6 w-6 rounded-full border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white hover:border-sky-500 hover:shadow-sm transition-all shrink-0"
                title="View price history"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                  <rect x="3"  y="14" width="3.5" height="7" rx="1" fill="currentColor" />
                  <rect x="8"  y="10" width="3.5" height="11" rx="1" fill="currentColor" />
                  <rect x="13" y="6"  width="3.5" height="15" rx="1" fill="currentColor" />
                  <rect x="18" y="3"  width="3.5" height="18" rx="1" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Searchable filter dropdown ─────────────────────────────────────────────────

function FilterSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef(null);

  const ALL_LABEL = `All ${label}s`;
  const matched = ["", ...options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))];

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
      <p className="mb-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
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
          className="w-full border-0 bg-transparent text-sm text-slate-700 dark:text-slate-300 dark:text-slate-600 outline-none placeholder:text-slate-400 dark:text-slate-500 min-w-0"
        />
        {value && (
          <button onMouseDown={(e) => { e.stopPropagation(); commit(""); }} className="shrink-0 text-slate-400 dark:text-slate-500 hover:text-slate-600">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onMouseDown={() => { setOpen(false); setQuery(""); }} />
          <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
            {matched.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No matches</p>
            ) : (
              matched.map((opt, i) => (
                <button
                  key={opt || "__all__"}
                  onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${i === cursor ? "bg-blue-50 text-blue-700"
                    : opt === value ? "bg-slate-50 dark:bg-[#151a2a] font-medium text-slate-800 dark:text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#151a2a]"
                    }`}
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

// ── Pagination ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;
function Pagination({ currentPage, totalPages, itemsOnPage, totalItems, onPageChange }) {
  if (totalPages <= 1 && (!itemsOnPage || itemsOnPage === 0)) return null;

  const windowSize = 5;
  const windowStart = currentPage < 5 ? 1 : currentPage - 4;
  const windowEnd = Math.min(windowStart + windowSize - 1, totalPages);
  const adjustedStart = Math.max(1, windowEnd - windowSize + 1);

  const pages = [];
  for (let i = adjustedStart; i <= windowEnd; i++) pages.push(i);

  // Calculate the current items range and total
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = startItem + (itemsOnPage || 0) - 1;
  const formattedTotal = (totalItems || 0).toLocaleString("en-IN"); // formats like 2,858

  const displayString = itemsOnPage > 0
    ? `showing ${startItem}-${endItem} of ${formattedTotal} items`
    : `showing 0 items`;

  const pageBtn = (p, label) => (
    <button
      key={p}
      onClick={() => onPageChange(p)}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
        p === currentPage
          ? "bg-[#2B86C5] text-white border border-[#2B86C5]"
          : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151a2a]"
      }`}
    >
      {label ?? p}
    </button>
  );

  return (
    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#0b101e] px-5 py-3">
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide lowercase">
        {displayString}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151a2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
        </button>

        {adjustedStart > 1 && (
          <>
            {pageBtn(1)}
            <span className="px-1 text-slate-400 dark:text-slate-500 text-xs">…</span>
          </>
        )}
        {pages.map((p) => pageBtn(p))}
        {windowEnd < totalPages && (
          <>
            <span className="px-1 text-slate-400 dark:text-slate-500 text-xs">…</span>
            {pageBtn(totalPages)}
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151a2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}
// ── Shared UI ──────────────────────────────────────────────────────────────────

const TABS = [
  // { key: "analysis", label: "Price Analysis" },
  // { key: "brand", label: "Brand Products" },
  // { key: "compare", label: "Compare" },
];

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-500" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium text-rose-600">{message || "Failed to load products"}</p>
      <button onClick={onRetry} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-[#151a2a]">
        Retry
      </button>
    </div>
  );
}

function ProductCell({ product }) {
  const linkUrl = product.product_url;
  return (
    <div className="flex items-center gap-4">
      {linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open product page"
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          <ProductImage src={resolveProductImage(product)} alt={product.product_name} />
        </a>
      ) : (
        <ProductImage src={resolveProductImage(product)} alt={product.product_name} />
      )}
      <div>
         {product.product_url ? (
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open product page"
            className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-white text-[13px] hover:text-black dark:hover:text-black"
          >
            {product.product_name || "Unnamed Product"}
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-60">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
            </svg>
          </a>
        ) : (
          <p className="font-bold text-slate-800 dark:text-white text-[13px]">{product.product_name || "Unnamed Product"}</p>
        )}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {product.product_brand && <span>{product.product_brand} · </span>}
          {product.product_ean_id || product.product_code || product._id}
        </p>
        {product.product_stock !== null && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quantity:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              product.product_stock > 0
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50"
            }`}>
              {product.product_stock} units
            </span>
          </div>
        )}
        {product.product_movement && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ProductMovement:</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {product.product_movement}
            </span>
          </div>
        )}
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
  const activeShopName = useStore((s) => s.activeShopName) || "";
  const canPriceChange = useStore(
    (s) =>
      (s.user?.webprice_access ?? "yes") === "yes"
  );
  const web = parsePrice(product.product_price);
  const store = parsePrice(product.product_store_price);
  const sap = parsePrice(product.product_sap_price);
  const rank = product.user_notification_data?.rank_pos ?? product.rank_by;
  const fmt = (v) => v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";

  const isNandilathgmart = activeShopName.toLowerCase() === "nandilathgmart";
  const isWebScrape = product.is_website_scrape_price === "yes";
  const isManualPrice = product.manual_price_update === "added";

  return (
    <div className="flex flex-col gap-1.5 min-w-[110px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Web
          {isNandilathgmart && (
            <span className="relative inline-flex group">
              {isWebScrape
                ? <Globe className="h-3 w-3 text-blue-500 cursor-help" />
                : <Rss className="h-3 w-3 text-orange-500 cursor-help" />
              }
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium normal-case text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 z-10">
                {isWebScrape ? "Website Price" : "SAP Price"}
              </span>
            </span>
          )}
        </span>
        <span className={`text-[12px] font-bold ${webPriceColorClass(rank)}`}>{fmt(web)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Store</span>
        <span className="text-[12px] font-bold text-blue-600">{fmt(store)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SAP</span>
        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{fmt(sap)}</span>
      </div>

      <div className="flex justify-end">
        
        { canPriceChange && (
          isManualPrice? (

            <button
              type="button"
              onClick={() => HandleWebPriceChange(product)}
              className="w-full mt-2 rounded-xl border border-red-200
                        bg-red-50 px-3 py-2
                        text-xs font-semibold text-red-700
                        hover:bg-red-100 hover:border-red-300
                        transition-all duration-200"
            >
                🗑️Remove Web Price 
            </button>

            ) : (

            <button
              type="button"
              onClick={() => HandleWebPriceChange(product)}
              className="w-full mt-2 rounded-xl border border-sky-200
                        bg-sky-50 px-3 py-2
                        text-xs font-semibold text-sky-700
                        hover:bg-sky-100 hover:border-sky-300
                        transition-all duration-200"
            >
                  🌐Change Web Price
            </button>

          ))}
        
        
      </div>

    </div>
  );
}

function exportToCSV(products, exportType = "A", competitorMeta = {}) {
  const escape = (val) => { const s = String(val ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };

  const triggerDownload = (csv) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (exportType === "B") {
    const slugMap = {};
    products.forEach((p) => {
      (p.competitor_prices || []).filter((c) => c.is_listed).forEach((c) => {
        if (!slugMap[c.slug]) slugMap[c.slug] = competitorMeta?.[c.slug]?.name || c.name || c.slug;
      });
    });
    const slugs = Object.keys(slugMap);
    const headers = ["Product Name", "Item Code", "Ranking Position", "Competing With", "Price", "SAP Price", "Mrp Price", "Item Groups", ...slugs.map((s) => slugMap[s])];
    const rows = products.map((p) => {
      const compMap = {};
      (p.competitor_prices || []).filter((c) => c.is_listed).forEach((c) => {
        compMap[c.slug] = isCompetitorOos(c) ? "Out Of Stock" : c.price;
      });
      return [
        p.product_name || "", p.product_code || p.product_ean_id || "",
        p.user_notification_data?.rank_pos || p.rank_by || "", p.user_notification_data?.Competing_with ?? "",
        p.product_price ?? "", p.product_sap_price ?? "", p.product_store_price ?? "",
        p.product_item_group || p.product_category || "",
        ...slugs.map((s) => compMap[s] ?? ""),
      ].map(escape).join(",");
    });
    triggerDownload([headers.map(escape).join(","), ...rows].join("\r\n"));
    return;
  }

  const headers = ["Product Name", "Item Code", "Ranking Position", "Competing With", "Price", "SAP Price", "Store Price", "Item Groups", "Competitor Detail"];
  const rows = products.map((p) => {
    const compDetail = (p.competitor_prices || []).filter((c) => c.is_listed).map((c) => {
      const outOfStock = isCompetitorOos(c);
      return outOfStock ? `${c.name} : Out Of Stock` : `${c.name} : ${c.price}`;
    }).join(", ");
    return [
      p.product_name || "", p.product_code || p.product_ean_id || "",
      p.user_notification_data?.rank_pos || p.rank_by || "", p.user_notification_data?.Competing_with ?? "",
      p.product_price ?? "", p.product_sap_price ?? "", p.product_store_price ?? "",
      p.product_item_group || p.product_category || "", compDetail,
    ].map(escape).join(",");
  });
  triggerDownload([headers.map(escape).join(","), ...rows].join("\r\n"));
}

// ── Competitor Price History Modal (single competitor vs our price) ────────────

function CompetitorHistoryModal({ product, competitor, onClose }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const chartRef = useRef(null);

  const history = (product?.price_history_30days || []).slice(-30);

  const ourValues  = history.map((h) => parsePrice(h.product_price));
  const compValues = history.map((h) => parsePrice(h.competitors?.[competitor.slug]));

  const allPrices = [...ourValues, ...compValues].filter((v) => v !== null);
  const hasData   = allPrices.length > 0;

  let chartMin = 0, chartMax = 100, span = 100;
  if (hasData) {
    let dataMin = Math.min(...allPrices);
    let dataMax = Math.max(...allPrices);
    if (dataMin === dataMax) { dataMin *= 0.95; dataMax *= 1.05; }
    const range = dataMax - dataMin;
    chartMin = Math.max(0, dataMin - range * 0.1);
    chartMax = dataMax + range * 0.1;
    span = chartMax - chartMin || 1;
  }

  const svgW = 640, svgH = 280;
  const pad  = { top: 20, right: 16, bottom: 60, left: 60 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const getX = (i) => pad.left + (plotW / Math.max(history.length - 1, 1)) * i;
  const getY = (v) => pad.top + ((chartMax - v) / span) * plotH;

  const yTicks = [...new Set(Array.from({ length: 4 }, (_, i) => Math.round(chartMin + (span / 3) * i)))];

  const series = [
    { name: "Our Price", color: "#2563eb", values: ourValues, isMain: true },
    { name: competitor.name, color: competitor.color || "#94a3b8", values: compValues, isMain: false },
  ];

  const buildPath = (values) => {
    let d = "";
    values.forEach((v, i) => {
      if (v === null) return;
      d += `${d === "" ? "M" : "L"}${getX(i)},${getY(v)} `;
    });
    return d.trim();
  };

  const handleMouseMove = (e) => {
    if (!chartRef.current || history.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const scaleX = svgW / rect.width;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const mouseX = (clientX - rect.left) * scaleX;
    const stepX = plotW / Math.max(history.length - 1, 1);
    let index = Math.round((mouseX - pad.left) / stepX);
    setHoverIdx(Math.max(0, Math.min(index, history.length - 1)));
  };

  const resolveLogo = (logo) => {
    if (!logo) return null;
    if (logo.startsWith("blob:") || logo.startsWith("http")) return logo;
    return `${API.defaults.baseURL.replace(/\/api\/?$/, "")}${logo}`;
  };
  const [logoErr, setLogoErr] = useState(false);
  const logoSrc = resolveLogo(competitor.logo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#151a2a] shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200"
              style={{ backgroundColor: competitor.color || "#475e77" }}
            >
              {logoSrc && !logoErr ? (
                <img src={logoSrc} alt={competitor.name} className="h-full w-full object-contain" onError={() => setLogoErr(true)} />
              ) : (
                <span className="text-[10px] font-bold text-white">{(competitor.name || "").slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Us vs {competitor.name}</p>
              <h2 className="font-bold text-slate-800 dark:text-white text-sm mt-0.5 line-clamp-1">{product?.product_name || "Product"}</h2>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: "#2563eb" }} />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Our Price</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: competitor.color || "#94a3b8" }} />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{competitor.name}</span>
            </div>
          </div>

          {!hasData ? (
            <div className="flex h-[240px] items-center justify-center text-sm font-medium text-slate-400">
              No price history available
            </div>
          ) : (
            <div className="relative w-full select-none" onMouseLeave={() => setHoverIdx(null)}>
              <svg
                ref={chartRef}
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto"
                style={{ display: "block" }}
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
              >
                {yTicks.map((tick) => (
                  <g key={tick}>
                    <line x1={pad.left} y1={getY(tick)} x2={pad.left + plotW} y2={getY(tick)} stroke="#e2e8f0" className="dark:stroke-gray-800" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={pad.left - 8} y={getY(tick) + 4} textAnchor="end" fontSize="10" fill="#64748b" className="dark:fill-gray-500 font-semibold">
                      {formatPrice(tick)}
                    </text>
                  </g>
                ))}

                {history.map((h, i) => {
                  const step = history.length > 20 ? Math.ceil(history.length / 10) : 1;
                  if (i % step !== 0 && i !== history.length - 1) return null;
                  return (
                    <text key={i} transform={`translate(${getX(i)},${pad.top + plotH + 16}) rotate(40)`} textAnchor="start" fontSize="9" fill="#64748b" className="dark:fill-gray-400 font-semibold">
                      {h.display_date || ""}
                    </text>
                  );
                })}

                {series.map((s) => {
                  const d = buildPath(s.values);
                  if (!d) return null;
                  return (
                    <g key={s.name}>
                      <path d={d} fill="none" stroke={s.color} strokeWidth={s.isMain ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round" opacity={s.isMain ? 1 : 0.85} />
                      {hoverIdx !== null && s.values[hoverIdx] !== null && (
                        <circle cx={getX(hoverIdx)} cy={getY(s.values[hoverIdx])} r={s.isMain ? 5 : 4} fill="#fff" stroke={s.color} strokeWidth={2.5} />
                      )}
                    </g>
                  );
                })}

                {hoverIdx !== null && (
                  <line x1={getX(hoverIdx)} y1={pad.top} x2={getX(hoverIdx)} y2={pad.top + plotH} stroke="#94a3b8" className="dark:stroke-gray-600" strokeWidth="1.5" strokeDasharray="4 4" pointerEvents="none" />
                )}
                <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent" />
              </svg>

              {hoverIdx !== null && (
                <div
                  className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-xl dark:border-slate-700 dark:bg-[#151a2a]/95"
                  style={{
                    left: hoverIdx > history.length / 2 ? "auto" : `${(getX(hoverIdx) / svgW) * 100}%`,
                    right: hoverIdx > history.length / 2 ? `${100 - (getX(hoverIdx) / svgW) * 100}%` : "auto",
                    top: "0px",
                    marginLeft: hoverIdx > history.length / 2 ? "0" : "10px",
                    marginRight: hoverIdx > history.length / 2 ? "10px" : "0",
                    minWidth: "130px",
                  }}
                >
                  <div className="mb-1.5 border-b border-slate-100 pb-1 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {history[hoverIdx]?.display_date || "Date"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {series.map((s) => {
                      const val = s.values[hoverIdx];
                      if (val === null || val === undefined) return null;
                      return (
                        <div key={s.name} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className={`text-[10px] ${s.isMain ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-400"}`}>{s.name}</span>
                          </div>
                          <span className={`text-[10px] ${s.isMain ? "font-black text-blue-600 dark:text-blue-400" : "font-bold text-slate-800 dark:text-slate-200"}`}>{formatPrice(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a]">
          <button onClick={onClose} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Configure Modal ────────────────────────────────────────────────────────────

function ConfigureModal({ product, currentUserId, onClose, onSaved }) {
  const groupNameDefault = product?.product_category ? product.product_category.split(">")[0].trim() : "";
  const [groupName, setGroupName] = useState(product?.group_name || groupNameDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const existingIds = Array.isArray(product?.user_alert_id) ? product.user_alert_id : [];
      const userAlertId = currentUserId && !existingIds.includes(currentUserId)
        ? [...existingIds, currentUserId]
        : existingIds.length > 0 ? existingIds : (currentUserId ? [currentUserId] : []);
      await configureProduct(product._id, { group_name: groupName, user_alert_id: userAlertId });
      onSaved(product._id, groupName, userAlertId);
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151a2a] shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Configure Product</p>
            <h2 className="font-bold text-slate-800 dark:text-white text-sm mt-0.5 line-clamp-1">{product?.product_name || "Product"}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Group Name</label>
            <input
              type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151a2a] px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
              placeholder="e.g. Air Conditioner"
            />
            {product?.product_category && (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">From category: <span className="font-medium">{product.product_category}</span></p>
            )}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a]">
          <button onClick={onClose} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2 text-sm font-medium text-white hover:bg-[#226fa3] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Confirm Modal ─────────────────────────────────────────────────────────

function BulkConfirmModal({ count, onConfirm, onClose, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151a2a] shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Bulk Configure</p>
            <h2 className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">Configure All Selected Products</h2>
          </div>
          <button onClick={onClose} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors disabled:opacity-50">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to add all <strong className="text-slate-800 dark:text-white">{count}</strong> selected products to Individual Item Group?
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Each product will be assigned to its own group based on its category.</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a]">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2 text-sm font-medium text-white hover:bg-[#226fa3] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />}
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Remove Confirm Modal ───────────────────────────────────────────────────────

function RemoveConfirmModal({ product, count, onConfirm, onClose, removing }) {
  const isBulk = !product;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151a2a] shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{isBulk ? "Bulk Remove" : "Remove Configuration"}</p>
            <h2 className="font-bold text-slate-800 dark:text-white text-sm mt-0.5 line-clamp-1">{isBulk ? `Remove ${count} Products` : (product?.product_name || "Product")}</h2>
          </div>
          <button onClick={onClose} disabled={removing} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors disabled:opacity-50">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">
          {isBulk ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to remove all <strong className="text-slate-800 dark:text-white">{count}</strong> products from their Item Groups? This will clear their group name and alert settings.
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to remove <strong className="text-slate-800 dark:text-white">{product?.product_name}</strong> from its Item Group? This will clear its group name and alert settings.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a]">
          <button onClick={onClose} disabled={removing} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={removing} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {removing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ active, direction }) {
  if (!active) {
    return (
      <svg className="shrink-0 text-slate-300 dark:text-slate-600" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M5 10l7-7 7 7M5 14l7 7 7-7" />
      </svg>
    );
  }
  return (
    <svg className="shrink-0 text-[#2B86C5]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {direction === "asc" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  );
}


const HandleWebPriceChange = async (product) => {

  const isManualAdded = product.manual_price_update === "added";

  const { value: newPrice } = await Swal.fire({

    title: isManualAdded
    ? "Release Web Price"
    : `Current Web Price is : ₹${product.product_price}`,

    html: isManualAdded
    ? `
      <div style="text-align:left;font-size:16px;line-height:1.6;">
        <p style="margin-bottom:12px;font-weight:600;">
          Are you sure you want to release the web price?
        </p>

        <div style="
          background:#FEF2F2;
          color:#B91C1C;
          border:1px solid #FCA5A5;
          padding:12px;
          border-radius:8px;
          font-size:14px;
        ">
          <strong>Note:</strong> If you release the web price for this product,
          the store price will automatically update.
        </div>
      </div>
    `
    : `
      <div style="font-size:18px;margin-bottom:15px;">
        Enter your Updated Web Price:
      </div>

      <input
        id="swal-input-price"
        class="swal2-input"
        type="number"
        placeholder="Enter new web price"
      />
    `,

    showCancelButton: true,
    confirmButtonText: isManualAdded ? "Release Price" : "Update Price",
    cancelButtonText: "Cancel",
    focusConfirm: false,
    preConfirm: () => {

      const price = isManualAdded
      ?Number(product.product_store_price) 
      :Number(document.getElementById("swal-input-price").value);

      if (!price && !isManualAdded) {
        Swal.showValidationMessage("Please enter a web price");
        return false;
      }

      return price;
    },
  });

  
  if(newPrice !== undefined && newPrice !== false){

    const data = {
      item_code: product.product_code,
      product_price: isManualAdded
        ? Number(product.product_store_price) 
        : Number(newPrice),                   
      is_manual_price: isManualAdded ? 0 : 1,
    };

    const wepPriceApiUrl = import.meta.env.VITE_SATHYA_WEBPRICE_API_URL;

    try {

      const response = await fetch(
        wepPriceApiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (result.status === "sucess") {

      const auth = JSON.parse(localStorage.getItem("eprice-store"));
      const priceChangerId = auth?.state?.user?.user_id;
      const payload = {
        user_id: priceChangerId,
        product_ean_id: product.product_ean_id,
        product_code: product.product_code,
        product_price: product.product_price,
        update_price: isManualAdded
          ? Number(product.product_store_price)
          : Number(newPrice),
        is_manual_price: isManualAdded ? 0 : 1,
      };
      await saveWebPriceData(payload);

        Swal.fire({
          icon: "success",
          title: "Success",
          text: isManualAdded
          ? "Web price released successfully."
          : "Web price updated successfully.",
        }).then(() => {
          window.location.reload();
        });

      } else if (result.status === "api_failed") {

        Swal.fire({
          icon: "error",
          title: "API Failed",
          text: result.msg
        }).then(() => {
          window.location.reload();
        });

      } else {
        
          Swal.fire({
          icon: "error",
          title: "API Failed",
          text: result.msg || (
            isManualAdded
              ? "Unable to remove web price."
              : "Unable to update web price."
          )
        }).then(() => {
          window.location.reload();
        });
      }

    } catch (error) {

      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Please try again.",
      }).then(() => {
        window.location.reload();
      });
    }

  }
  
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const competitorSlug = searchParams.get("competitor") || "";
  const competitorName = searchParams.get("name") || "";

  const products           = useStore((s) => s.products);
  const productsLoading    = useStore((s) => s.productsLoading);
  const productsError      = useStore((s) => s.productsError);
  const productsTotalPages = useStore((s) => s.productsTotalPages);
  const productsMeta       = useStore((s) => s.productsMeta);
  const setProducts            = useStore((s) => s.setProducts);
  const setProductsLoading     = useStore((s) => s.setProductsLoading);
  const setProductsError       = useStore((s) => s.setProductsError);
  const setProductsTotalPages  = useStore((s) => s.setProductsTotalPages);
  const setProductsMeta        = useStore((s) => s.setProductsMeta);
  const competitors    = useStore((s) => s.competitors);
  const setCompetitors = useStore((s) => s.setCompetitors);
  const activeStoreId  = useStore((s) => s.activeStoreId);
  const currentUserId  = useStore((s) => s.user?.user_id);
  const exportType     = useStore((s) => s.exportType) || "A";
  const canExport      = useStore((s) => (s.user?.export_option ?? "yes") !== "no");
  

  const competitorMeta = {};
  competitors.forEach((c) => {
    competitorMeta[c.slug] = { isActive: c.isActive, logo: c.logo || "", name: c.name, color: c.color || "" };
  });
  const onlineSlugs = new Set(competitors.filter((c) => c.isActive).map((c) => c.slug));

  const [activeTab, setActiveTab] = useState("analysis");
  const [currentPage,      setCurrentPage]      = useState(1);
  const [totalItems,       setTotalItems]       = useState(0);
  const [search,           _setSearch]          = useState("");
  const [brandFilter,      _setBrandFilter]     = useState("");
  const [catFilter,        _setCatFilter]       = useState("");
  const [rankFilter,       _setRankFilter]      = useState("");
  const [itemGroupFilter,  _setItemGroupFilter] = useState("");

  const setSearch          = (v) => { _setSearch(v);          setCurrentPage(1); };
  const setBrandFilter     = (v) => { _setBrandFilter(v);     setCurrentPage(1); };
  const setCatFilter       = (v) => { _setCatFilter(v);       setCurrentPage(1); };
  const setRankFilter      = (v) => { _setRankFilter(v);      setCurrentPage(1); };
  const setItemGroupFilter = (v) => { _setItemGroupFilter(v); setCurrentPage(1); };

  const [configProduct,   setConfigProduct]   = useState(null);
  const [sortConfig,      setSortConfig]      = useState({ column: null, direction: "asc" });
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkSaving,      setBulkSaving]      = useState(false);
  const [removeTarget,    setRemoveTarget]    = useState(null);
  const [removing,        setRemoving]        = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyModal,    setHistoryModal]    = useState(null); // { product, competitor }

  const headerCheckboxRef = useRef(null);

  const handleSort = (column) => {
    setSortConfig((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const load = async (page, searchQ, brand, cat, rank, itemGroup) => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await fetchProducts({
        page, limit: ITEMS_PER_PAGE, competitorSlug: competitorSlug || null,
        search: searchQ || undefined, brand: brand || undefined,
        category: cat || undefined, rank: rank || undefined, itemGroup: itemGroup || undefined,
      });
      const rows       = Array.isArray(res) ? res : (res?.data || []);
      const totalPages = Array.isArray(res) ? Math.ceil(res.length / ITEMS_PER_PAGE) : (res?.totalPages || 1);
      const total      = Array.isArray(res) ? res.length : (res?.total || 0);

      setProducts(rows);
      setProductsTotalPages(totalPages);
      setTotalItems(total);
    } catch (err) {
      setProductsError(err.response?.data?.message || err.message);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors().then((data) => setCompetitors(data || [])).catch(() => {});
  }, [activeStoreId]);

  useEffect(() => {
    fetchProductsMeta().then((meta) => setProductsMeta(meta)).catch(() => {});
  }, [activeStoreId]);

  useEffect(() => {
    load(currentPage, search, brandFilter, catFilter, rankFilter, itemGroupFilter);
  }, [currentPage, search, brandFilter, catFilter, rankFilter, itemGroupFilter, activeStoreId, competitorSlug]);

  const brandOptions     = productsMeta?.brands     || [];
  const catOptions       = productsMeta?.categories || [];
  const rankOptions      = productsMeta?.ranks      || [];
  const itemGroupOptions = productsMeta?.itemGroups || [];

  const filtered = (Array.isArray(products) ? products : []).map((p) => ({
    ...p,
    competitor_prices: (p.competitor_prices || []).filter(
      (c) => onlineSlugs.size === 0 || onlineSlugs.has(c.slug)
    ),
  }));

  const isConfigured  = (p) => !!(p.group_name || (p.user_alert_id && p.user_alert_id.length > 0));
  const allConfigured = filtered.length > 0 && filtered.every(isConfigured);
  const someConfigured = filtered.some(isConfigured);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = someConfigured && !allConfigured;
  }, [allConfigured, someConfigured]);

  const sorted = [...filtered].sort((a, b) => {
    if (!sortConfig.column) return 0;
    if (sortConfig.column === "name") {
      const cmp = (a.product_name || "").toLowerCase().localeCompare((b.product_name || "").toLowerCase());
      return sortConfig.direction === "asc" ? cmp : -cmp;
    }
    if (sortConfig.column === "price") {
      const aP = parsePrice(a.product_price), bP = parsePrice(b.product_price);
      if (aP === null && bP === null) return 0;
      if (aP === null) return 1;
      if (bP === null) return -1;
      return sortConfig.direction === "asc" ? aP - bP : bP - aP;
    }
    if (sortConfig.column === "rank") {
      const aR = parseInt(a.user_notification_data?.rank_pos ?? a.rank_by ?? 9999, 10);
      const bR = parseInt(b.user_notification_data?.rank_pos ?? b.rank_by ?? 9999, 10);
      return sortConfig.direction === "asc" ? aR - bR : bR - aR;
    }
    return 0;
  });

  const totalPages = productsTotalPages;
  const paginated  = sorted;

  const clearCompetitorFilter = () => setSearchParams({});

  const handleConfigSaved = (productId, groupName, userAlertId) => {
    setProducts(products.map((p) => p._id === productId ? { ...p, group_name: groupName, user_alert_id: userAlertId } : p));
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      if (removeTarget === "bulk") {
        const filteredIds = new Set(filtered.map((p) => p._id));
        await Promise.all(filtered.map((p) => removeProductConfiguration(p._id)));
        setProducts(products.map((p) => filteredIds.has(p._id) ? { ...p, group_name: "", user_alert_id: [] } : p));
      } else {
        await removeProductConfiguration(removeTarget._id);
        setProducts(products.map((p) => p._id === removeTarget._id ? { ...p, group_name: "", user_alert_id: [] } : p));
      }
      setRemoveTarget(null);
    } catch { /* silent */ } finally { setRemoving(false); }
  };

  const handleBulkSave = async () => {
    setBulkSaving(true);
    try {
      const filteredIds = new Set(filtered.map((p) => p._id));
      await Promise.all(
        filtered.map((p) => {
          const groupName = p.product_category ? p.product_category.split(">")[0].trim() : (p.group_name || "");
          const existingIds = Array.isArray(p.user_alert_id) ? p.user_alert_id : [];
          const userAlertId = currentUserId && !existingIds.includes(currentUserId)
            ? [...existingIds, currentUserId]
            : existingIds.length > 0 ? existingIds : (currentUserId ? [currentUserId] : []);
          return configureProduct(p._id, { group_name: groupName, user_alert_id: userAlertId });
        })
      );
      setProducts(
        products.map((p) => {
          if (!filteredIds.has(p._id)) return p;
          const groupName = p.product_category ? p.product_category.split(">")[0].trim() : (p.group_name || "");
          const existingIds = Array.isArray(p.user_alert_id) ? p.user_alert_id : [];
          const userAlertId = currentUserId && !existingIds.includes(currentUserId)
            ? [...existingIds, currentUserId]
            : existingIds.length > 0 ? existingIds : (currentUserId ? [currentUserId] : []);
          return { ...p, group_name: groupName, user_alert_id: userAlertId };
        })
      );
      setShowBulkConfirm(false);
    } catch { /* silent */ } finally { setBulkSaving(false); }
  };

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-[#0b101e] text-slate-800 dark:text-white font-sans">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-3 py-4 md:px-6 md:py-6">

          {/* ── Competitor filter banner ── */}
          {competitorSlug && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              {competitorMeta[competitorSlug]?.logo ? (
                <div className="flex h-7 w-7 items-center justify-center rounded overflow-hidden border border-blue-200 bg-white shrink-0">
                  <img src={resolveLogoUrl(competitorMeta[competitorSlug].logo)} alt={competitorName} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = "none"; }} />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-white text-[10px] font-bold shrink-0">
                  {competitorName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium text-blue-800 flex-1">
                Showing products sold by <strong>{competitorName || competitorSlug}</strong>
              </p>
              <button onClick={clearCompetitorFilter} className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors">
                ✕ Clear filter
              </button>
            </div>
          )}

          {/* Top Header Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full sm:max-w-sm items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40">
              <svg className="text-slate-400" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text" placeholder="Search by name, brand or EAN…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-0 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {canExport && (
                <button
                  onClick={async () => {
                    setExporting(true);
                    try {
                      const result = await exportProductsCSV({
                        competitorSlug: competitorSlug || null,
                        search, brand: brandFilter, category: catFilter,
                        rank: rankFilter, itemGroup: itemGroupFilter,
                      });
                      exportToCSV(result.data || [], exportType, competitorMeta);
                    } catch (err) {
                      console.error("Export failed:", err);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#226fa3] transition-colors disabled:opacity-60"
                >
                  {exporting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  {exporting ? "Exporting…" : "Export"}
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Item Group" options={itemGroupOptions} value={itemGroupFilter} onChange={setItemGroupFilter} />
            <FilterSelect label="Brand"      options={brandOptions}     value={brandFilter}     onChange={setBrandFilter} />
            <FilterSelect label="Category"   options={catOptions}       value={catFilter}       onChange={setCatFilter} />
            <FilterSelect label="Rank"       options={rankOptions}      value={rankFilter}      onChange={setRankFilter} />
          </div>

          {/* Tabs */}
          <div>
            {TABS.map((tab) => (
              <button
                key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === tab.key ? "text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                {tab.label}
                {activeTab === tab.key && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2B86C5] rounded-t-full" />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="mt-2">
            {productsLoading ? (
              <LoadingState />
            ) : productsError ? (
              <ErrorState message={productsError} onRetry={() => load(currentPage, search, brandFilter, catFilter, rankFilter, itemGroupFilter)} />
            ) : (
              <>
                {/* ── BRAND PRODUCTS ── */}
                {activeTab === "brand" && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]/50">
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Rank</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Price Trends</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No products found.</td></tr>
                        ) : (
                          paginated.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-[#151a2a]/80 transition-colors">
                              <td className="px-5 py-4"><ProductCell product={p} /></td>
                              <td className="px-5 py-4"><PriceCell product={p} /></td>
                              <td className="px-5 py-4"><RankBadge product={p} /></td>
                              <td className="px-5 py-4"><PriceGapBadge value={priceGap(p)} ean={p.product_ean_id} /></td>
                              <td className="px-5 py-4"><CompetitorPrices product={p} competitorMeta={competitorMeta} onShowHistory={(prod, comp) => setHistoryModal({ product: prod, competitor: comp })} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                   <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsOnPage={paginated.length}
                        onPageChange={setCurrentPage}
                   />
                  </div>
                )}

                {/* ── COMPARE ── */}
                {activeTab === "compare" && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full min-w-[800px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]/50">
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Prices</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Market Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                          <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">No products found.</td></tr>
                        ) : (
                          paginated.map((p) => {
                            const { low, avg, high } = marketStats(p);
                            const active = (p.competitor_prices || []).filter((c) => c.price != null && c.price > 0);
                            return (
                              <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-[#151a2a]/80 transition-colors">
                                <td className="px-5 py-4"><ProductCell product={p} /></td>
                                <td className="px-5 py-4"><PriceCell product={p} /></td>
                                <td className="px-5 py-4">
                                  {active.length === 0 ? (
                                    <span className="text-sm text-slate-400">No competitor data</span>
                                  ) : (
                                    <div className="flex items-center gap-6 flex-wrap">
                                      {active.map((c) => {
                                        const meta = competitorMeta?.[c.slug] || {};
                                        return (
                                          <div key={c.slug} className="flex items-center gap-2">
                                            <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                                            <span className="font-bold text-slate-800 dark:text-white text-[13px]">₹{c.price.toLocaleString("en-IN")}</span>
                                            <Sparkline data={trendFor(p, c.slug)} color="#0ea5e9" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-4"><MarketCap low={low} avg={avg} high={high} /></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                     <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      itemsOnPage={paginated.length}
                      totalItems={totalItems}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}

                {/* ── PRICE ANALYSIS ── */}
                {activeTab === "analysis" && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      itemsOnPage={paginated.length}
                      totalItems={totalItems}
                      onPageChange={setCurrentPage}
                    />
                    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                      <table className="w-full min-w-[1000px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="w-12 px-5 py-4">
                              <input
                                ref={headerCheckboxRef}
                                type="checkbox"
                                checked={allConfigured}
                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                onChange={() => allConfigured ? setRemoveTarget("bulk") : setShowBulkConfirm(true)}
                                title={allConfigured ? "Uncheck all — remove from Item Groups" : "Check all — configure Item Groups"}
                              />
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                              <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                                Product <SortIcon active={sortConfig.column === "name"} direction={sortConfig.direction} />
                              </button>
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                              <button onClick={() => handleSort("price")} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                                Price <SortIcon active={sortConfig.column === "price"} direction={sortConfig.direction} />
                              </button>
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                              <button onClick={() => handleSort("rank")} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                                Rank <SortIcon active={sortConfig.column === "rank"} direction={sortConfig.direction} />
                              </button>
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Prices</th>
                            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Market</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sorted.length === 0 ? (
                            <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No products found.</td></tr>
                          ) : (
                            paginated.map((p) => (
                              <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-5 py-4">
                                  <input
                                    type="checkbox"
                                    checked={isConfigured(p)}
                                    onChange={() => isConfigured(p) ? setRemoveTarget(p) : setConfigProduct(p)}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    title={isConfigured(p) ? "Uncheck to remove from Item Group" : "Check to configure Item Group"}
                                  />
                                </td>
                                <td className="px-5 py-4"><ProductCell product={p} /></td>
                                <td className="px-5 py-4"><PriceCell product={p} /></td>
                                <td className="px-5 py-4"><RankBadge product={p} /></td>
                                <td className="px-5 py-4">
                                  <PriceGapBadge value={priceGap(p)} ean={p.product_ean_id} />
                                </td>
                                <td className="px-5 py-4"><CompetitorPrices product={p} competitorMeta={competitorMeta} onShowHistory={(prod, comp) => setHistoryModal({ product: prod, competitor: comp })} /></td>
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
                      itemsOnPage={paginated.length}
                      totalItems={totalItems}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {configProduct && (
        <ConfigureModal
          product={configProduct} currentUserId={currentUserId}
          onClose={() => setConfigProduct(null)} onSaved={handleConfigSaved}
        />
      )}

      {showBulkConfirm && (
        <BulkConfirmModal
          count={filtered.length} onConfirm={handleBulkSave}
          onClose={() => setShowBulkConfirm(false)} saving={bulkSaving}
        />
      )}

      {removeTarget && (
        <RemoveConfirmModal
          product={removeTarget === "bulk" ? null : removeTarget}
          count={filtered.length} onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)} removing={removing}
        />
      )}
      {historyModal && (
        <CompetitorHistoryModal
          product={historyModal.product}
          competitor={historyModal.competitor}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </>
  );
}