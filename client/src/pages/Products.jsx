import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { fetchProducts, configureProduct } from "../services/productsService";

// ── Helpers ────────────────────────────────────────────────────────────────────

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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-lg shadow-sm">
        📦
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 object-contain shadow-sm bg-slate-50"
    />
  );
}

// Shows actual logo image if available, falls back to colored text badge
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
  if (!rank) return <span className="text-slate-400 text-sm">—</span>;

  let displayRank = rank;
  if (!String(rank).includes('/')) {
    const active = (product.competitor_prices || []).filter((c) => c.price !== null).length;
    displayRank = `${rank}/${active + 1}`;
  }

  const numRank = parseInt(rank, 10);
  let colorClass = "bg-slate-100 text-slate-700";
  if (numRank === 1) colorClass = "bg-emerald-100 text-emerald-700";
  else if (numRank === 2) colorClass = "bg-blue-100 text-blue-700";
  else if (numRank > 2) colorClass = "bg-rose-100 text-rose-700";

  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${colorClass}`}>
      {displayRank}
    </span>
  );
}

function PriceGapBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400">No data</span>;
  }
  const isNeg = value < 0;
  const baseColors = isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const barColor = isNeg ? "bg-emerald-500" : "bg-amber-500";
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

function MarketCap({ low, avg, high }) {
  const fmt = (v) => (v !== null ? `₹${v.toLocaleString("en-IN")}` : "—");
  return (
    <div className="flex items-center gap-8">
      <div>
        <span className="text-[11px] text-slate-500">Low</span><br />
        <span className="font-bold text-slate-800">{fmt(low)}</span>
      </div>
      <div className="relative">
        <span className="text-[11px] text-slate-500">Average</span><br />
        <span className="font-bold text-slate-800">{avg !== null ? `Avg: ₹${avg.toLocaleString("en-IN")}` : "—"}</span>
        {avg !== null && (
          <>
            <div className="absolute top-1/2 -left-4 w-2 h-0.5 bg-emerald-500" />
            <div className="absolute top-1/2 -right-4 w-2 h-0.5 bg-rose-500" />
          </>
        )}
      </div>
      <div>
        <span className="text-[11px] text-slate-500">High</span><br />
        <span className="font-bold text-slate-800">{fmt(high)}</span>
      </div>
    </div>
  );
}

function MarketGapCell({ product, competitorMeta }) {
  const ourPrice = parsePrice(product.product_price);
  if (ourPrice === null) return <span className="text-slate-300 text-xs">—</span>;

  const active = (product.competitor_prices || [])
    .map((c) => ({ ...c, price: parsePrice(c.price) }))
    .filter((c) => c.price !== null);

  if (!active.length) return <span className="text-slate-300 text-xs">—</span>;

  const lowest = active.reduce((min, c) => (c.price < min.price ? c : min));
  const meta = competitorMeta?.[lowest.slug] || {};
  const compName = meta.name || lowest.name || lowest.slug;
  const gap = ourPrice - lowest.price;
  const fmtAmt = (v) => `₹${Math.abs(v).toLocaleString("en-IN")}`;

  if (gap === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 w-fit">
          Same price
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5">
          {fmtAmt(lowest.price)} ({compName}) = {fmtAmt(ourPrice)} mine
        </span>
      </div>
    );
  }

  if (gap > 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 rounded-full px-2.5 py-1 w-fit">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          {fmtAmt(gap)} higher
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5">
          {fmtAmt(lowest.price)} ({compName}) vs {fmtAmt(ourPrice)} mine
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 w-fit">
        <svg className="w-3 h-3 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        {fmtAmt(-gap)} cheaper
      </span>
      <span className="text-[10px] text-slate-400 mt-0.5">
        {fmtAmt(lowest.price)} ({compName}) vs {fmtAmt(ourPrice)} mine
      </span>
    </div>
  );
}

function CompetitorPrices({ product, competitorMeta }) {
  const active = (product.competitor_prices || []).filter((c) => c.price !== null);
  const { low, avg, high } = marketStats(product);
  if (active.length === 0) {
    return <MarketCap low={low} avg={avg} high={high} />;
  }

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {active.map((c) => {
        const meta = competitorMeta?.[c.slug] || {};
        return (
          <div key={c.slug} className="flex items-center gap-2">
            <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
            <span className="font-bold text-slate-800 text-[13px]">
              ₹{c.price.toLocaleString("en-IN")}
            </span>
            <Sparkline data={trendFor(product, c.slug)} color="#0ea5e9" />
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
      <p className="mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-sm cursor-text ${open ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"}`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 min-w-0"
        />
        {value && (
          <button onMouseDown={(e) => { e.stopPropagation(); commit(""); }} className="shrink-0 text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onMouseDown={() => { setOpen(false); setQuery(""); }} />
          <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
            {matched.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No matches</p>
            ) : (
              matched.map((opt, i) => (
                <button
                  key={opt || "__all__"}
                  onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${i === cursor ? "bg-blue-50 text-blue-700"
                    : opt === value ? "bg-slate-50 font-medium text-slate-800"
                      : "text-slate-700 hover:bg-slate-50"
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

const ITEMS_PER_PAGE = 5;

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3">
      <p className="text-xs text-slate-500">Page {currentPage} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${p === currentPage
              ? "bg-[#2B86C5] text-white border border-[#2B86C5]"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: "analysis", label: "Price Analysis" },
  // { key: "brand", label: "Brand Products" },
  // { key: "compare", label: "Compare" },
];

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium text-rose-600">{message || "Failed to load products"}</p>
      <button onClick={onRetry} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
        Retry
      </button>
    </div>
  );
}

function ProductCell({ product }) {
  return (
    <div className="flex items-center gap-4">
      <ProductImage src={product.product_image} alt={product.product_name} />
      <div>
        <p className="font-bold text-slate-800 text-[13px]">{product.product_name || "Unnamed Product"}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {product.product_brand && <span>{product.product_brand} · </span>}
          {product.product_ean_id || product.product_code || product._id}
        </p>
      </div>
    </div>
  );
}

function PriceCell({ product }) {
  const web = parsePrice(product.product_price);
  const store = parsePrice(product.product_store_price);
  const sap = parsePrice(product.product_sap_price);

  const fmt = (v) => v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";

  return (
    <div className="flex flex-col gap-1.5 min-w-[110px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Web</span>
        <span className="text-[12px] font-bold text-emerald-600">{fmt(web)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store</span>
        <span className="text-[12px] font-bold text-blue-600">{fmt(store)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SAP</span>
        <span className="text-[12px] font-bold text-slate-700">{fmt(sap)}</span>
      </div>
    </div>
  );
}

function exportToCSV(products) {
  const headers = ["Product Name", "Item Code", "Ranking Position", "Competing With", "Price", "SAP Price", "Store Price", "Item Groups", "Competitor Detail"];
  const escape = (val) => { const s = String(val ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = products.map((p) => {
    const compDetail = (p.competitor_prices || []).map((c) => {
      const outOfStock = c.price === null || c.price === undefined || c.stock === 0;
      return outOfStock ? `${c.name} : Out Of Stock` : `${c.name} : ${c.price}`;
    }).join(" | ");
    return [
      p.product_name || "", p.product_code || p.product_ean_id || "",
      p.user_notification_data?.rank_pos || p.rank_by || "",
      p.user_notification_data?.Competing_with ?? "",
      p.product_price ?? "", p.product_sap_price ?? "", p.product_store_price ?? "",
      p.product_item_group || p.product_category || "", compDetail,
    ].map(escape).join(",");
  });
  const csv = "﻿" + [headers.map(escape).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Configure Modal ────────────────────────────────────────────────────────────

function ConfigureModal({ product, currentUserId, onClose, onSaved }) {
  const groupNameDefault = product?.product_category
    ? product.product_category.split(">")[0].trim()
    : "";

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
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Configure Product</p>
            <h2 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1">
              {product?.product_name || "Product"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Air Conditioner"
            />
            {product?.product_category && (
              <p className="mt-1 text-[11px] text-slate-400">
                From category: <span className="font-medium">{product.product_category}</span>
              </p>
            )}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2 text-sm font-medium text-white hover:bg-[#226fa3] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />
            )}
            Save
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
      <svg className="shrink-0 text-slate-300" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M5 10l7-7 7 7M5 14l7 7 7-7" />
      </svg>
    );
  }
  return (
    <svg className="shrink-0 text-[#2B86C5]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {direction === "asc"
        ? <path d="M12 19V5M5 12l7-7 7 7" />
        : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const competitorSlug = searchParams.get("competitor") || "";
  const competitorName = searchParams.get("name") || "";

  const products = useStore((s) => s.products);
  const productsLoading = useStore((s) => s.productsLoading);
  const productsError = useStore((s) => s.productsError);
  const setProducts = useStore((s) => s.setProducts);
  const setProductsLoading = useStore((s) => s.setProductsLoading);
  const setProductsError = useStore((s) => s.setProductsError);
  const competitors = useStore((s) => s.competitors);
  const activeStoreId = useStore((s) => s.activeStoreId);
  const currentUserId = useStore((s) => s.user?.userId);

  // Build meta map for logos
  const competitorMeta = {};
  competitors.forEach((c) => {
    competitorMeta[c.slug] = { isActive: c.isActive, logo: c.logo || "", name: c.name };
  });
  const onlineSlugs = new Set(competitors.filter((c) => c.isActive).map((c) => c.slug));

  const [activeTab, setActiveTab] = useState("analysis");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [configProduct, setConfigProduct] = useState(null); // product being configured
  const [sortConfig, setSortConfig] = useState({ column: null, direction: "asc" });

  const handleSort = (column) => {
    setSortConfig((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const load = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await fetchProducts(competitorSlug || null);
      setProducts(data);
    } catch (err) {
      setProductsError(err.response?.data?.message || err.message);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeStoreId, competitorSlug]);

  const brandOptions = [...new Set(products.map((p) => p.product_brand).filter(Boolean))].sort();
  const catOptions = [...new Set(products.map((p) => p.product_category).filter(Boolean))].sort();
  const rankOptions = [...new Set(products.map((p) => String(p.rank_by ?? "")).filter(Boolean))].sort();
  const itemGroupOptions = [...new Set(products.map((p) => p.product_category ? p.product_category.split(">")[0].trim() : "").filter(Boolean))].sort();

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (
        p.product_name?.toLowerCase().includes(q) ||
        p.product_brand?.toLowerCase().includes(q) ||
        String(p.product_ean_id || "").includes(q) ||
        String(p.product_code || "").includes(q)
      );
      const matchBrand = !brandFilter || p.product_brand === brandFilter;
      const matchCat = !catFilter || p.product_category === catFilter;
      const matchRank = !rankFilter || String(p.rank_by ?? "") === rankFilter;
      const pGroup = p.product_category ? p.product_category.split(">")[0].trim() : "";
      const matchGroup = !itemGroupFilter || pGroup === itemGroupFilter;
      return matchSearch && matchBrand && matchCat && matchRank && matchGroup;
    })
    .map((p) => ({
      ...p,
      competitor_prices: (p.competitor_prices || []).filter(
        (c) => onlineSlugs.size === 0 || onlineSlugs.has(c.slug)
      ),
    }));

  // Reset to page 1 whenever filters/tab/competitor changes
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, catFilter, rankFilter, itemGroupFilter, activeTab, competitorSlug]);

  const sorted = [...filtered].sort((a, b) => {
    if (!sortConfig.column) return 0;
    if (sortConfig.column === "name") {
      const cmp = (a.product_name || "").toLowerCase().localeCompare((b.product_name || "").toLowerCase());
      return sortConfig.direction === "asc" ? cmp : -cmp;
    }
    if (sortConfig.column === "rank") {
      const aRank = parseInt(a.user_notification_data?.rank_pos ?? a.rank_by ?? 9999, 10);
      const bRank = parseInt(b.user_notification_data?.rank_pos ?? b.rank_by ?? 9999, 10);
      return sortConfig.direction === "asc" ? aRank - bRank : bRank - aRank;
    }
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const clearCompetitorFilter = () => setSearchParams({});

  const handleConfigSaved = (productId, groupName, userAlertId) => {
    setProducts(
      products.map((p) =>
        p._id === productId ? { ...p, group_name: groupName, user_alert_id: userAlertId } : p
      )
    );
  };

  return (
    <>
      <div className="min-h-screen bg-white text-slate-800 font-sans">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-3 py-4 md:px-6 md:py-6">

          {/* ── Competitor filter banner ── */}
          {competitorSlug && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              {competitorMeta[competitorSlug]?.logo ? (
                <div className="flex h-7 w-7 items-center justify-center rounded overflow-hidden border border-blue-200 bg-white shrink-0">
                  <img
                    src={`http://localhost:5100${competitorMeta[competitorSlug].logo}`}
                    alt={competitorName}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-white text-[10px] font-bold shrink-0">
                  {competitorName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium text-blue-800 flex-1">
                Showing products sold by <strong>{competitorName || competitorSlug}</strong>
              </p>
              <button
                onClick={clearCompetitorFilter}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
              >
                ✕ Clear filter
              </button>
            </div>
          )}

          {/* Top Header Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full sm:max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-100">
              <svg className="text-slate-400" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, brand or EAN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              Filter
            </button> */}
              <button
                onClick={() => exportToCSV(filtered)}
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

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Item Group" options={itemGroupOptions} value={itemGroupFilter} onChange={setItemGroupFilter} />
            <FilterSelect label="Brand" options={brandOptions} value={brandFilter} onChange={setBrandFilter} />
            <FilterSelect label="Category" options={catOptions} value={catFilter} onChange={setCatFilter} />
            <FilterSelect label="Rank" options={rankOptions} value={rankFilter} onChange={setRankFilter} />
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-200 mt-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === tab.key ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2B86C5] rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="mt-2">
            {productsLoading ? (
              <LoadingState />
            ) : productsError ? (
              <ErrorState message={productsError} onRetry={load} />
            ) : (
              <>
                {/* ── BRAND PRODUCTS ── */}
                {activeTab === "brand" && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Rank</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Price Trends</th>
                          <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                          <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No products found.</td></tr>
                        ) : (
                          paginated.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-4"><ProductCell product={p} /></td>
                              <td className="px-5 py-4"><PriceCell product={p} /></td>
                              <td className="px-5 py-4"><RankBadge product={p} /></td>
                              <td className="px-5 py-4"><PriceGapBadge value={priceGap(p)} /></td>
                              <td className="px-5 py-4"><CompetitorPrices product={p} competitorMeta={competitorMeta} /></td>
                              <td className="px-5 py-4 text-right align-middle">
                                <div className="flex flex-col items-end gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => navigate(`/product-history?ean=${p.product_ean_id}`)}
                                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                                    >
                                      View Details
                                    </button>
                                    <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
                                      Quick Sync
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                )}

                {/* ── COMPARE ── */}
                {activeTab === "compare" && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[800px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Prices</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Market Range</th>
                          <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No products found.</td></tr>
                        ) : (
                          paginated.map((p) => {
                            const { low, avg, high } = marketStats(p);
                            const active = (p.competitor_prices || []).filter((c) => c.price !== null);
                            return (
                              <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
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
                                            <span className="font-bold text-slate-800 text-[13px]">
                                              ₹{c.price.toLocaleString("en-IN")}
                                            </span>
                                            <Sparkline data={trendFor(p, c.slug)} color="#0ea5e9" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-4"><MarketCap low={low} avg={avg} high={high} /></td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => navigate(`/product-history?ean=${p.product_ean_id}`)}
                                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                                    >
                                      View Details
                                    </button>
                                    <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
                                      Quick Sync
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                )}

                {/* ── PRICE ANALYSIS ── */}
                {activeTab === "analysis" && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                    <table className="w-full min-w-[1000px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="w-12 px-5 py-4">
                            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                            <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                              Product
                              <SortIcon active={sortConfig.column === "name"} direction={sortConfig.direction} />
                            </button>
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                            <button onClick={() => handleSort("rank")} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                              Rank
                              <SortIcon active={sortConfig.column === "rank"} direction={sortConfig.direction} />
                            </button>
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Prices</th>
                          <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Market</th>
                          <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sorted.length === 0 ? (
                          <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">No products found.</td></tr>
                        ) : (
                          paginated.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-4">
                                <input
                                  type="checkbox"
                                  checked={!!(p.group_name || (p.user_alert_id && p.user_alert_id.length > 0))}
                                  onChange={() => setConfigProduct(p)}
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  title="Configure group & user alerts"
                                />
                              </td>
                              <td className="px-5 py-4"><ProductCell product={p} /></td>
                              <td className="px-5 py-4"><PriceCell product={p} /></td>
                              <td className="px-5 py-4"><RankBadge product={p} /></td>
                              <td className="px-5 py-4"><PriceGapBadge value={priceGap(p)} /></td>
                              <td className="px-5 py-4"><CompetitorPrices product={p} competitorMeta={competitorMeta} /></td>
                              <td className="px-5 py-4"><MarketGapCell product={p} competitorMeta={competitorMeta} /></td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => navigate(`/product-history?ean=${p.product_ean_id}`)}
                                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                                  >
                                    View Details
                                  </button>
                                  <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
                                    Quick Sync
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {configProduct && (
        <ConfigureModal
          product={configProduct}
          currentUserId={currentUserId}
          onClose={() => setConfigProduct(null)}
          onSaved={handleConfigSaved}
        />
      )}
    </>
  );
}
