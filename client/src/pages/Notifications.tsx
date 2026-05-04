import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { fetchAlertProducts } from "../services/notificationsService";

// ── Helpers (mirrored from Products page) ─────────────────────────────────────

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

const BRAND_COLORS = ["#1e40af", "#065f46", "#7c2d12", "#4c1d95", "#064e3b", "#1c1917"];
function slugColor(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
  return BRAND_COLORS[h % BRAND_COLORS.length];
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

function trendFor(product, slug) {
  return (product.price_history_30days || [])
    .map((h) => h.competitors?.[slug])
    .filter((v) => v !== null && v !== undefined)
    .slice(-7);
}

function priceGapPct(product) {
  const ourPrice = parsePrice(product.product_price);
  const { avg }  = marketStats(product);
  if (avg === null || ourPrice === null) return null;
  return parseFloat(((ourPrice - avg) / avg * 100).toFixed(1));
}

// ── Shared UI components ──────────────────────────────────────────────────────

function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-2xl shadow-sm">
        📦
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-contain shadow-sm bg-slate-50"
    />
  );
}

function CompetitorLogo({ name = "", slug = "", logo = "" }) {
  const [imgErr, setImgErr] = useState(false);
  const bg    = slugColor(slug || name);
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

function Sparkline({ data, width = 60, height = 18, color = "#3b82f6" }) {
  if (!data || data.length < 2) return null;
  const min    = Math.min(...data);
  const max    = Math.max(...data);
  const range  = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StockDot({ stock }) {
  const qty = parseInt(stock, 10);
  const { label, dot } = isNaN(qty)
    ? { label: "Unknown",            dot: "bg-slate-300"    }
    : qty === 0
    ? { label: "Out of Stock",       dot: "bg-rose-500"     }
    : qty < 10
    ? { label: `Low (${qty})`,       dot: "bg-amber-400"   }
    : { label: `In Stock (${qty})`,  dot: "bg-emerald-500" };
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function PriceGapBadge({ value }) {
  if (value === null || value === undefined)
    return <span className="text-xs text-slate-400">No data</span>;
  const isNeg = value < 0;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {Math.abs(value)}% {isNeg ? "below" : "above"} market
    </span>
  );
}

// ── Empty / Loading / Error states ───────────────────────────────────────────

function LoadingState() {
  return (
    <div className="col-span-full flex min-h-[300px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center gap-2 text-center">
      <p className="text-2xl">🔔</p>
      <p className="text-sm font-semibold text-slate-600">No alert products yet</p>
      <p className="text-xs text-slate-400">Check the checkbox on a product in the Products page to subscribe.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center gap-3">
      <p className="text-sm font-medium text-rose-600">{message}</p>
      <button onClick={onRetry} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Retry
      </button>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 9;

function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3 mt-6 rounded-xl">
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
            className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
              p === currentPage
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

// ── Main component ────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate();

  const alertProducts        = useStore((s) => s.alertProducts);
  const alertProductsLoading = useStore((s) => s.alertProductsLoading);
  const alertProductsError   = useStore((s) => s.alertProductsError);
  const setAlertProducts        = useStore((s) => s.setAlertProducts);
  const setAlertProductsLoading = useStore((s) => s.setAlertProductsLoading);
  const setAlertProductsError   = useStore((s) => s.setAlertProductsError);
  const competitors  = useStore((s) => s.competitors);
  const activeStoreId = useStore((s) => s.activeStoreId);

  // Build competitor meta map for logos (same pattern as Products page)
  const competitorMeta: Record<string, { logo: string; name: string }> = {};
  competitors.forEach((c: any) => {
    competitorMeta[c.slug] = { logo: c.logo || "", name: c.name };
  });

  const [search,      setSearch]      = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const load = async () => {
    setAlertProductsLoading(true);
    setAlertProductsError(null);
    try {
      const data = await fetchAlertProducts();
      setAlertProducts(data);
    } catch (err: any) {
      setAlertProductsError(err.response?.data?.message || err.message || "Failed to load");
    } finally {
      setAlertProductsLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeStoreId]);
  useEffect(() => { setCurrentPage(1); }, [search, activeStoreId]);

  const filtered = alertProducts.filter((p: any) => {
    const q = search.toLowerCase();
    return !q ||
      p.product_name?.toLowerCase().includes(q) ||
      p.product_brand?.toLowerCase().includes(q) ||
      String(p.product_ean_id || "").includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <div className="relative w-full max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {alertProductsLoading ? (
            <LoadingState />
          ) : alertProductsError ? (
            <ErrorState message={alertProductsError} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            paginated.map((p: any) => {
              const { low, avg, high } = marketStats(p);
              const gap   = priceGapPct(p);
              const price = parsePrice(p.product_price);
              const activeCompetitors = (p.competitor_prices || []).filter((c: any) => c.price !== null);

              return (
                <div key={p._id} className="flex flex-col rounded-2xl border border-blue-100 bg-gray-50 p-6 shadow-sm transition-all hover:shadow-md">

                  {/* Product header */}
                  <div className="flex items-center gap-4 mb-5">
                    <ProductImage src={p.product_image} alt={p.product_name} />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-[14px] leading-snug line-clamp-2">
                        {p.product_name || "Unnamed Product"}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {p.product_brand && <span>{p.product_brand} · </span>}
                        {p.product_ean_id || p.product_code || p._id}
                      </p>
                    </div>
                  </div>

                  {/* Our price */}
                  {price !== null && (
                    <div className="mb-4">
                      <span className="inline-block rounded-md bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-[13px] font-bold text-emerald-600">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  {/* Status rows */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-500 font-medium">Stock</span>
                      <StockDot stock={p.product_stock} />
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-500 font-medium">Price Gap</span>
                      <PriceGapBadge value={gap} />
                    </div>
                    {p.group_name && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-slate-500 font-medium">Group</span>
                        <span className="font-semibold text-slate-700">{p.group_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Market range */}
                  {(low !== null || avg !== null || high !== null) && (
                    <div className="flex justify-between text-[11px] mb-4 bg-white rounded-lg border border-slate-100 px-3 py-2.5">
                      <div>
                        <p className="text-slate-400 mb-0.5">Low</p>
                        <p className="font-bold text-slate-800">{low !== null ? `₹${low.toLocaleString("en-IN")}` : "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 mb-0.5">Avg</p>
                        <p className="font-bold text-slate-800">{avg !== null ? `₹${avg.toLocaleString("en-IN")}` : "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 mb-0.5">High</p>
                        <p className="font-bold text-slate-800">{high !== null ? `₹${high.toLocaleString("en-IN")}` : "—"}</p>
                      </div>
                    </div>
                  )}

                  {/* Competitor prices with logos + sparklines */}
                  <div className="mb-5">
                    <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                      Competitor Prices
                    </p>
                    {activeCompetitors.length === 0 ? (
                      <p className="text-xs text-slate-400">No competitor data</p>
                    ) : (
                      <div className="space-y-2.5">
                        {activeCompetitors.map((c: any) => {
                          const meta = competitorMeta[c.slug] || { logo: "", name: "" };
                          return (
                            <div key={c.slug} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CompetitorLogo name={c.name} slug={c.slug} logo={meta.logo || ""} />
                                <span className="font-bold text-slate-700 text-[13px]">
                                  ₹{c.price.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <Sparkline data={trendFor(p, c.slug)} color="#0ea5e9" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => navigate(`/product-history?ean=${p.product_ean_id}`)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      View Details
                    </button>
                    <button className="flex-1 rounded-xl bg-[#2B86C5] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#226fa3]">
                      Quick Sync
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
