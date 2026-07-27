import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { fetchCompetitors } from '../services/competitorsService';
import { fetchProducts, fetchProductsMeta, exportProductsCSV } from '../services/productsService';
import API from '../hooks/useApi';
import { buildProductHistoryUrl } from '../utilis/urls';

// ─── Shared Helpers ───────────────────────────────────────────────────────────
const resolveLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
  return `${API.defaults.baseURL.replace(/\/api\/?$/, '')}${logo}`;
};

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
  return !!(c.is_listed && (c.price == null || c.price <= 0));
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
  if (inStockWithImage) return inStockWithImage.image;

  // 3. Fallback: any competitor with a valid image, even out of stock
  const anyWithImage = competitors.find((c) => isValidImage(c.image));
  if (anyWithImage) return anyWithImage.image;

  return null;
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
// Supports both export types, same as Products.jsx:
//   "A" -> single "Competitor Detail" column combining all competitor prices
//   "B" -> one column per competitor (dynamic headers based on slugs present)
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

// ─── Table UI Components ──────────────────────────────────────────────────────
function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151a2a] shadow-sm">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 dark:text-slate-600">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 15l-5-5a2 2 0 0 0-2.8 0L3 19" />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setErr(true)} className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-700/50 object-contain shadow-sm bg-slate-50 dark:bg-[#151a2a]" />;
}

function CompetitorLogo({ name = "", slug = "", logo = "", size = "md" }) {
  const [imgErr, setImgErr] = useState(false);
  const bg = slugColor(slug || name);
  const label = (name || slug).slice(0, 8).toLowerCase();
  const logoSrc = resolveLogoUrl(logo);
  const dim = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  if (logoSrc && !imgErr) {
    return (
      <div className={`flex ${dim} items-center justify-center rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0`}>
        <img src={logoSrc} alt={name} onError={() => setImgErr(true)} className="w-full h-full object-contain" />
      </div>
    );
  }
  return <div className={`flex ${dim} min-w-[26px] items-center justify-center rounded px-1 text-[8px] font-bold uppercase tracking-wider text-white shrink-0`} style={{ backgroundColor: bg }}>{label.slice(0, 2)}</div>;
}

function RankBadge({ product }) {
  const rank = product.user_notification_data?.rank_pos || product.rank_by;
  if (!rank) return <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>;
  let displayRank = rank;
  if (!String(rank).includes('/')) {
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
  return <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${colorClass}`}>{displayRank}</span>;
}

function PriceGapBadge({ value, ean }) {
  const navigate = useNavigate();
  const hasData = value !== null && value !== undefined;
  const numericValue = Number(value);
  const isZero = hasData && (numericValue === 0 || isNaN(numericValue));
  const isNeg = hasData && numericValue < 0;
  const baseColors = isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const barColor = isNeg ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="flex flex-col items-start gap-2">
      {hasData && !isZero && (
        <div className={`relative inline-flex items-center gap-1 rounded-full pr-3 pl-2 py-1 text-[11px] font-bold ${baseColors}`}>
          <svg className={`w-3 h-3 ${isNeg ? "text-emerald-500 rotate-180" : "text-amber-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <div className={`w-0.5 h-3 opacity-30 ${barColor} mx-0.5 rounded-full`} />
          <span>{Math.abs(numericValue)}% {isNeg ? "below" : "above"} market</span>
        </div>
      )}
      {ean && (
        <div className="flex items-center mt-0.5 bg-white dark:bg-[#151a2a] rounded-full border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden w-fit transition-all hover:shadow-md hover:border-slate-300">
          <button onClick={() => navigate(buildProductHistoryUrl(ean, 7))} className="group flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border-r border-slate-200 dark:border-slate-700/60">
            <svg viewBox="0 0 24 24" className="w-3 h-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" />
            </svg>
            7 DAYS
          </button>
          <button onClick={() => navigate(buildProductHistoryUrl(ean, 30))} className="group flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
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

function CompetitorPrices({ product, competitorMeta, selectedSlug, onShowHistory }) {

  // ✅ selected competitor-ஓட entry மட்டும் எடு
  const listed = (product.competitor_prices || []).filter(
    c => c.is_listed && c.slug === selectedSlug
  );

  if (listed.length === 0) {
    const { low, avg, high } = marketStats(product);
    return <MarketCap low={low} avg={avg} high={high} />;
  }

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {listed.map((c) => {
        const meta = competitorMeta?.[c.slug] || {};
        const isOos = isCompetitorOos(c);
        return (
          <div key={c.slug} className="flex items-center gap-2">
            {isOos ? (
              c.url ? (
                <a href={c.url} target="_blank" rel="noopener noreferrer" title={`Open on ${c.name}`} className="flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer">
                  <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] uppercase bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">Out of Stock</span>
                </a>
              ) : (
                <>
                  <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] uppercase bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">Out of Stock</span>
                </>
              )
            ) : c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer" title={`Open on ${c.name}`} className="flex items-center gap-2 hover:opacity-75 transition-opacity">
                <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                <span className="font-bold text-slate-800 dark:text-white text-[13px]">₹{c.price.toLocaleString("en-IN")}</span>
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

function ProductCell({ product }) {
  const linkUrl = product.product_url;
  return (
    <div className="flex items-center gap-4">
      {linkUrl ? (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" title="Open product page" className="shrink-0 hover:opacity-80 transition-opacity">
          <ProductImage src={resolveProductImage(product)} alt={product.product_name} />
        </a>
      ) : (
        <ProductImage src={resolveProductImage(product)} alt={product.product_name} />
      )}
      <div>
        {linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={product.product_name || "Unnamed Product"}
            className="inline-flex items-start gap-1 font-bold text-slate-800 dark:text-white text-[13px] hover:text-black dark:hover:text-black"
          >
            <span className="line-clamp-2 max-w-[220px]">
              {product.product_name || "Unnamed Product"}
            </span>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-60 mt-0.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
            </svg>
          </a>
        ) : (
          <p className="font-bold text-slate-800 dark:text-white text-[13px] line-clamp-2 max-w-[220px]" title={product.product_name || "Unnamed Product"}>
            {product.product_name || "Unnamed Product"}
          </p>
        )}
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
      <div className={`flex items-center gap-2 rounded-lg border bg-white dark:bg-slate-800 px-3 py-2.5 shadow-sm cursor-text ${open ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200 dark:border-slate-700"}`} onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
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
                <button key={opt || "__all__"} onMouseDown={(e) => { e.preventDefault(); commit(opt); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${i === cursor ? "bg-blue-50 text-blue-700" : opt === value ? "bg-slate-50 font-medium text-slate-800" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
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

// ─── Competitor Tab Bar ────────────────────────────────────────────────────────
function CompetitorTab({ data, isActive, onClick, liveCount }) {
  const isOffline = !data.isActive;
  const isProcessing = data.syncStatus === 'processing';
  const isDisabled = isOffline || isProcessing;
  const isNegDelta = String(data.avgPriceDelta).includes('-');
  // Falls back across common field name variants until the backend's actual key is confirmed.
  // liveCount (from the products API, only known for the active tab) always wins when present.
  const productCount = liveCount ?? (data.productCount ?? data.totalProducts ?? data.product_count ?? data.count ?? data.productsCount ?? null);

  return (
    <button
      onClick={() => !isOffline && onClick(data)}
      disabled={isOffline}
      className={`group flex items-center gap-2 shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all
        ${isOffline
          ? "cursor-not-allowed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600"
          : isActive
            ? "border-[#2B86C5] bg-[#2B86C5] text-white shadow-sm shadow-[#2B86C5]/30"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a2a] text-slate-600 dark:text-slate-300 hover:border-[#2B86C5]/50 hover:text-[#2B86C5]"
        }`}
    >
      <CompetitorLogo name={data.name} slug={data.slug} logo={data.logo} size="sm" />
      <span className="whitespace-nowrap">{data.name}</span>
      {productCount !== null && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>
          {productCount === "loading" ? "…" : Number(productCount).toLocaleString("en-IN")}
        </span>
      )}
      {data.isRunning && (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" title="Sync in progress" />
      )}
      {isOffline ? (
        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-gray-500">Offline</span>
      ) : (
        <span className={`text-[10px] font-bold ${isActive ? "text-white/90" : isNegDelta ? "text-red-500" : "text-green-600"}`}>
          {isNegDelta ? '▼' : '▲'} {data.avgPriceDelta || '+0.0%'}
        </span>
      )}
    </button>
  );
}

// ─── Competitor Price History Modal (single competitor vs our price) ──────────
function CompetitorHistoryModal({ product, competitor, onClose, initialRange = 30 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [range, setRange] = useState(initialRange); // 7 or 30
  const [rangeOpen, setRangeOpen] = useState(false);
  const chartRef = useRef(null);

  // Sort chronologically (oldest → newest) before slicing, so we always grab
  // the most recent `range` days, regardless of the order the API sends them in.
  const rawHistory = product?.price_history_30days || [];
  const sortedHistory = [...rawHistory].sort((a, b) => {
    const da = new Date(a.display_date).getTime();
    const db = new Date(b.display_date).getTime();
    if (isNaN(da) || isNaN(db)) return 0; // leave as-is if date is unparseable
    return da - db;
  });
  // Take the most recent `range` days, oldest → newest (fixed order — no toggle).
  const history = sortedHistory.slice(-range);

  const ourValues  = history.map((h) => parsePrice(h.product_price));
  const compValues = history.map((h) => parsePrice(h.competitors?.[competitor.slug]));

  const allPrices = [...ourValues, ...compValues].filter((v) => v !== null);
  const hasData   = allPrices.length > 0;

  let chartMin = 0, chartMax = 100, span = 100;
  if (hasData) {
    let dataMin = Math.min(...allPrices);
    let dataMax = Math.max(...allPrices);
    if (dataMin === dataMax) { dataMin *= 0.95; dataMax *= 1.05; }
    const rangeSpan = dataMax - dataMin;
    chartMin = Math.max(0, dataMin - rangeSpan * 0.1);
    chartMax = dataMax + rangeSpan * 0.1;
    span = chartMax - chartMin || 1;
  }

  const svgW = 640, svgH = 280;
  // right padding widened (16 → 56) so the last rotated date label has room
  // to fully render instead of getting clipped at the SVG's right edge
  const pad  = { top: 20, right: 56, bottom: 60, left: 60 };
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

          <div className="flex items-center gap-2 shrink-0">
            {/* Range selector — 7 / 30 days */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRangeOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a2a] px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:border-slate-300 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></svg>
                {range} DAYS
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${rangeOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
              </button>

              {rangeOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setRangeOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1.5 w-32 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a2a] shadow-lg py-1">
                    {[7, 30].map((r) => (
                      <button
                        key={r}
                        onClick={() => { setRange(r); setRangeOpen(false); setHoverIdx(null); }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs font-bold transition-colors ${
                          range === r
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0b101e]"
                        }`}
                      >
                        {r} Days
                        {range === r && (
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
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

                {history.map((h, i) => (
                  <text key={i} transform={`translate(${getX(i)},${pad.top + plotH + 14}) rotate(60)`} textAnchor="start" fontSize="7" fill="#64748b" className="dark:fill-gray-400 font-semibold">
                    {h.display_date || ""}
                  </text>
                ))}

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

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const MarketCompetitor = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const competitors = useStore((s) => s.competitors);
  const setCompetitors = useStore((s) => s.setCompetitors);
  const competitorsLoading = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const activeStoreId = useStore((s) => s.activeStoreId);

  const productsMeta = useStore((s) => s.productsMeta);
  const setProductsMeta = useStore((s) => s.setProductsMeta);

  // Same export settings pattern as Products.jsx
  const exportType = useStore((s) => s.exportType) || "A";
  const canExport  = useStore((s) => (s.user?.export_option ?? "yes") !== "no");

  const competitorMeta = {};
  competitors.forEach((c) => {
    competitorMeta[c.slug] = { isActive: c.isActive, logo: c.logo || "", name: c.name };
  });

  // Tab / product state
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
  const [exporting, setExporting] = useState(false);

  // ── Competitor Price History Modal state ──
  const [historyModal, setHistoryModal] = useState(null); // { product, competitor }

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

  // Select the competitor requested via ?competitor= slug, falling back to the
  // first active competitor once the list loads.
  useEffect(() => {
  if (!selectedCompetitor && competitors.length > 0) {
      const requestedSlug = searchParams.get('competitor');
      const requested = requestedSlug
        ? competitors.find((c) => c.slug === requestedSlug)
        : null;

      if (requested) {
        setSelectedCompetitor(requested);
        return;
      }

      const eanSorted = competitors
        .filter((c) => c.mappingType === 'EAN')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      const nonEanSorted = competitors
        .filter((c) => c.mappingType === 'NON_EAN')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const orderedList = [...eanSorted, ...nonEanSorted];
      const firstActive = orderedList.find((c) => c.isActive);
      if (firstActive) setSelectedCompetitor(firstActive);
    }
  }, [competitors, searchParams]);

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

  useEffect(() => {
    if (selectedCompetitor) {
      loadCompetitorProducts(selectedCompetitor, currentPage);
    }
  }, [selectedCompetitor, currentPage, search, brandFilter, catFilter, rankFilter, itemGroupFilter]);

  const handleTabClick = (competitor) => {
    if (competitor.slug === selectedCompetitor?.slug) return;
    setSearch("");
    setBrandFilter("");
    setCatFilter("");
    setRankFilter("");
    setItemGroupFilter("");
    setCurrentPage(1);
    setCompetitorProducts([]);
    setTotalItems(0);
    setTotalPages(1);
    setSelectedCompetitor(competitor);
    setSearchParams({ competitor: competitor.slug }, { replace: true });
  };

  const handlePageChange = (page) => setCurrentPage(page);

  // Export now mirrors Products.jsx: hits the backend export endpoint directly
  // (with the current competitor + filters applied), instead of manually
  // paging through fetchProducts on the frontend to assemble the full list.
  const handleExport = async () => {
    if (!selectedCompetitor || exporting) return;
    setExporting(true);
    try {
      const result = await exportProductsCSV({
        competitorSlug: selectedCompetitor.slug,
        search: search || undefined,
        brand: brandFilter || undefined,
        category: catFilter || undefined,
        rank: rankFilter || undefined,
        itemGroup: itemGroupFilter || undefined,
      });
      exportToCSV(result.data || [], exportType, competitorMeta);
    } catch (err) {
      console.error('Failed to export products:', err);
    } finally {
      setExporting(false);
    }
  };

  const eanList = competitors.filter((c) => c.mappingType === 'EAN').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const nonEanList = competitors.filter((c) => c.mappingType === 'NON_EAN').sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (competitorsLoading) {
    return (
      <div className="flex justify-center p-20 bg-white dark:bg-slate-800 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="p-3 sm:p-6 bg-white dark:bg-[#0b101e] min-h-screen">
        <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500 italic">
          No competitors found.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-3 sm:p-6 bg-white dark:bg-[#0b101e] min-h-screen font-sans">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Competitor Listings</h2>

        {/* ── Tab bar (grouped EAN / Non-EAN) ── */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {eanList.length > 0 && (
            <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-[#151a2a]/60 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">EAN Competitors</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {eanList.map((item) => (
                  <CompetitorTab
                    key={item.id}
                    data={item}
                    isActive={item.slug === selectedCompetitor?.slug}
                    onClick={handleTabClick}
                    liveCount={item.slug === selectedCompetitor?.slug ? (productsLoading ? "loading" : totalItems) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
          {nonEanList.length > 0 && (
            <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-[#151a2a]/60 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">Non-EAN Competitors</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {nonEanList.map((item) => (
                  <CompetitorTab
                    key={item.id}
                    data={item}
                    isActive={item.slug === selectedCompetitor?.slug}
                    onClick={handleTabClick}
                    liveCount={item.slug === selectedCompetitor?.slug ? (productsLoading ? "loading" : totalItems) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {!selectedCompetitor ? (
          <div className="py-16 text-center text-sm text-slate-400 italic">Select a competitor tab to view their products.</div>
        ) : (
          <div className="mt-5">
            {/* ── Selected competitor heading ── */}
            <div className="mb-4 flex items-center gap-2.5">
              <CompetitorLogo name={selectedCompetitor.name} slug={selectedCompetitor.slug} logo={selectedCompetitor.logo || ""} />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{selectedCompetitor.name}</h3>
              <span className="text-xs text-slate-400">· product listing</span>
              <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                {productsLoading ? "…" : `${totalItems.toLocaleString("en-IN")} ${totalItems === 1 ? "product" : "products"}`}
              </span>
            </div>

            {/* ── Filters Section (Search, Export, Dropdowns) ── */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {canExport && (
                    <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#226fa3] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                      {exporting ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                          <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                          <path d="M21 12a9 9 0 0 0-9-9" />
                        </svg>
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

              <div className="flex flex-wrap gap-3">
                <FilterSelect label="Item Group" options={productsMeta?.itemGroups || []} value={itemGroupFilter} onChange={(v) => { setItemGroupFilter(v); setCurrentPage(1); }} />
                <FilterSelect label="Brand" options={productsMeta?.brands || []} value={brandFilter} onChange={(v) => { setBrandFilter(v); setCurrentPage(1); }} />
                <FilterSelect label="Category" options={productsMeta?.categories || []} value={catFilter} onChange={(v) => { setCatFilter(v); setCurrentPage(1); }} />
                <FilterSelect label="Rank" options={productsMeta?.ranks || []} value={rankFilter} onChange={(v) => { setRankFilter(v); setCurrentPage(1); }} />
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
                              <td className="px-5 py-4">
                                <CompetitorPrices
                                  product={p}
                                  competitorMeta={competitorMeta}
                                  selectedSlug={selectedCompetitor?.slug}
                                  onShowHistory={(prod, comp) => setHistoryModal({ product: prod, competitor: comp, range: 30 })}
                                />
                              </td>
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
        )}
      </div>

      {historyModal && (
        <CompetitorHistoryModal
          product={historyModal.product}
          competitor={historyModal.competitor}
          initialRange={historyModal.range || 30}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </>
  );
};

export default MarketCompetitor;
