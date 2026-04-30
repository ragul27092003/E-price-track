import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { fetchProducts } from "../services/productsService";
import { fetchCompetitors } from "../services/competitorsService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === "No Result" || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ""));
  return isNaN(n) ? null : n;
}

function fmt(v) {
  if (v === null || v === undefined) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

// ── Competitor Logo Component ─────────────────────────────────────────────────
function CompetitorLogo({ competitor, size = 28, showName = false }) {
  const [imgErr, setImgErr] = useState(false);
  const bg       = competitor.color || "#475e77";
  const initials = (competitor.name || competitor.slug || "").substring(0, 2).toUpperCase();
  const imgSrc   = competitor.logo ? `http://localhost:5100${competitor.logo}` : null;

  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width:           size,
          height:          size,
          borderRadius:    5,
          backgroundColor: bg,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          overflow:        "hidden",
          flexShrink:      0,
          border:          "1px solid #e2e8f0",
        }}
      >
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={competitor.name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <span style={{ fontSize: size * 0.32, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>
            {initials}
          </span>
        )}
      </div>
      {showName && (
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {competitor.name}
        </span>
      )}
    </div>
  );
}

// ── SVG Price Chart ───────────────────────────────────────────────────────────

function PriceChart({ product, competitors, visibleSlugs }) {
  const history = product.price_history_30days || [];
  if (!history.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        No price history available
      </div>
    );
  }

  const svgW = 700, svgH = 240;
  const pad  = { top: 10, right: 20, bottom: 55, left: 60 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

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
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        No price data in history
      </div>
    );
  }

  const dataMin  = Math.min(...allPrices);
  const dataMax  = Math.max(...allPrices);
  const range    = dataMax - dataMin || 1;
  const chartMin = dataMin - range * 0.1;
  const chartMax = dataMax + range * 0.1;
  const span     = chartMax - chartMin;

  const getX = (i) => pad.left + (plotW / Math.max(history.length - 1, 1)) * i;
  const getY = (v) => pad.top + ((chartMax - v) / span) * plotH;

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round(chartMin + (span / yTickCount) * i)
  );

  const series = [
    {
      slug:   "our_price",
      name:   "Our Price",
      color:  "#2563eb",
      values: history.map((h) => parsePrice(h.product_price)),
      comp:   null,
    },
    ...competitors
      .filter((c) => c.isActive !== false && visibleSlugs.has(c.slug))
      .map((c) => ({
        slug:   c.slug,
        name:   c.name,
        color:  c.color || "#888",
        values: history.map((h) => parsePrice(h.competitors?.[c.slug])),
        comp:   c,
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

  const dateStep   = Math.max(1, Math.floor(history.length / 8));
  const dateLabels = history
    .map((h, i) => ({ label: h.display_date || "", i }))
    .filter((_, i) => i % dateStep === 0 || i === history.length - 1);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left} y1={getY(tick)}
            x2={pad.left + plotW} y2={getY(tick)}
            stroke="#e2e8f0" strokeDasharray="4 3"
          />
          <text x={pad.left - 8} y={getY(tick) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {Number(tick).toLocaleString("en-IN")}
          </text>
        </g>
      ))}
      {dateLabels.map(({ label, i }) => (
        <text
          key={i}
          transform={`translate(${getX(i)},${pad.top + plotH + 22}) rotate(35)`}
          textAnchor="start" fontSize="9" fill="#94a3b8"
        >
          {label}
        </text>
      ))}
      {series.map((s) => {
        const d = buildPath(s.values);
        if (!d) return null;
        return (
          <path
            key={s.slug}
            d={d}
            fill="none"
            stroke={s.slug === "our_price" ? "#2563eb" : s.color}
            strokeWidth={s.slug === "our_price" ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProductHistory() {
  const storeProducts      = useStore((s) => s.products);
  const storeCompetitors   = useStore((s) => s.competitors);
  const setProducts        = useStore((s) => s.setProducts);
  const setProductsLoading = useStore((s) => s.setProductsLoading);
  const setCompetitors     = useStore((s) => s.setCompetitors);
  const activeStoreId      = useStore((s) => s.activeStoreId);
  const lastViewedEan      = useStore((s) => s.lastViewedEan);
  const setLastViewedEan   = useStore((s) => s.setLastViewedEan);

  const [loading,       setLoading]       = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");   // single source of truth — live as-you-type
  const [userSearched,  setUserSearched]  = useState(false); // true once the user has actively typed/searched
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleSlugs,  setVisibleSlugs]  = useState(new Set());
  const [imgErrors,     setImgErrors]     = useState({});

  const [searchParams] = useSearchParams();
  const eanFromUrl = searchParams.get("ean") || "";

  // Load products + competitors if not already in store
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [, comps] = await Promise.all([
          storeProducts.length
            ? Promise.resolve(storeProducts)
            : fetchProducts().then((d) => { setProducts(d); setProductsLoading(false); return d; }),
          storeCompetitors.length
            ? Promise.resolve(storeCompetitors)
            : fetchCompetitors().then((d) => { setCompetitors(d); return d; }),
        ]);
        setVisibleSlugs(new Set(comps.filter((c) => c.isActive !== false).map((c) => c.slug)));
      } catch (e) {
        console.error("ProductHistory load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeStoreId]);

  // ── FIXED: live filter as the user types ─────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return storeProducts;
    const q = searchQuery.toLowerCase();
    return storeProducts.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(q) ||
        p.product_brand?.toLowerCase().includes(q) ||
        String(p.product_ean_id || "").includes(q)
    );
  }, [storeProducts, searchQuery]);

  // ── FIXED: product selection priority ────────────────────────────────────────
  // • If user is actively searching → use filtered results[selectedIndex]
  // • Else if ?ean= in URL → find that product
  // • Else if lastViewedEan saved → find that product
  // • Else → first product
  const selectedProduct = useMemo(() => {
    if (userSearched) {
      return filteredProducts[selectedIndex] ?? filteredProducts[0] ?? null;
    }
    const ean = eanFromUrl || lastViewedEan;
    if (ean) {
      const found = storeProducts.find((p) => String(p.product_ean_id) === String(ean));
      if (found) return found;
    }
    return storeProducts[0] ?? null;
  }, [userSearched, filteredProducts, selectedIndex, eanFromUrl, lastViewedEan, storeProducts]);

  // Persist the currently viewed EAN
  useEffect(() => {
    if (selectedProduct?.product_ean_id) {
      setLastViewedEan(String(selectedProduct.product_ean_id));
    }
  }, [selectedProduct?.product_ean_id]);

  // Reset selectedIndex when query changes so we always show the top match
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const onlineCompetitors = storeCompetitors.filter((c) => c.isActive !== false);

  const stats = useMemo(() => {
    if (!selectedProduct) return { min: null, max: null, avgDev: null };
    const history    = selectedProduct.price_history_30days || [];
    const compPrices = [];
    history.forEach((h) => {
      onlineCompetitors.forEach((c) => {
        const p = parsePrice(h.competitors?.[c.slug]);
        if (p !== null) compPrices.push(p);
      });
    });
    const ourPrice = parsePrice(selectedProduct.product_price);
    const min      = compPrices.length ? Math.min(...compPrices) : null;
    const max      = compPrices.length ? Math.max(...compPrices) : null;
    const avg      = compPrices.length ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length : null;
    const avgDev   = avg !== null && ourPrice !== null ? Math.abs(Math.round(ourPrice - avg)) : null;
    return { min, max, avgDev };
  }, [selectedProduct, onlineCompetitors]);

  const tableHistory = selectedProduct?.price_history_30days?.slice(0, 30) ?? [];

  const toggleSlug = (slug) => {
    setVisibleSlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  // Called when user types — immediately filter live
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setUserSearched(true); // user is actively searching, override URL/lastViewed priority
  };

  // Called on Enter or clicking Search button — no change needed, already live
  const handleSearchSubmit = () => {
    setUserSearched(true);
    setSelectedIndex(0);
  };

  // Clear search — go back to URL/lastViewed priority
  const handleClearSearch = () => {
    setSearchQuery("");
    setUserSearched(false);
    setSelectedIndex(0);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0b101e]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b101e] text-gray-900 dark:text-gray-100 font-sans pb-12 transition-colors duration-200">

      {/* Page Header */}
      <div className="bg-white dark:bg-[#151a2a] px-6 py-4 border-b border-gray-200 dark:border-[#262c3d]">
        <div className="mx-auto max-w-[1280px]">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Manage Product History</h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6">

        {/* Search & Filter */}
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Range</label>
            <select className="h-10 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0b101e] px-3 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-teal-500">
              <option>Last 30 Days</option>
              <option>Last 60 Days</option>
            </select>
          </div>

          <div className="flex flex-1 items-center gap-3 min-w-[280px]">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Search Product
            </label>
            {/* ── FIXED: single input, live onChange, with clear button ── */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder="Name, brand or EAN…"
                className="h-10 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0b101e] px-3 pr-8 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleSearchSubmit}
            className="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded bg-teal-500 px-6 text-sm font-medium text-white shadow-sm hover:bg-teal-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            Search
          </button>
        </div>

        {/* Result count note */}
        {userSearched && searchQuery && filteredProducts.length > 1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            {filteredProducts.length} products matched — showing the first result. Refine your search to find a specific product.
          </p>
        )}
        {userSearched && searchQuery && filteredProducts.length === 0 && (
          <p className="text-xs text-rose-500 -mt-2">
            No products matched "{searchQuery}".{" "}
            <button onClick={handleClearSearch} className="underline hover:no-underline">Clear search</button>
          </p>
        )}

        {!selectedProduct ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] text-gray-400">
            No products found
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Min Market Price",  value: fmt(stats.min),    icon: "trend", iconBg: "214 100% 97%", iconColor: "217 91% 50%" },
                { label: "Max Market Price",  value: fmt(stats.max),    icon: "bars",  iconBg: "270 100% 97%", iconColor: "267 83% 60%" },
                { label: "Average Deviation", value: stats.avgDev !== null ? fmt(stats.avgDev) : "—", icon: "pulse", iconBg: "214 100% 97%", iconColor: "217 91% 50%" },
              ].map((card) => (
                <div key={card.label} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] px-6 py-5 shadow-sm">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: `hsl(${card.iconBg})` }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={`hsl(${card.iconColor})`} strokeWidth="2.5" strokeLinecap="round">
                      {card.icon === "trend" && <><path d="M5 7h10" /><path d="M9 11h6" /><path d="M13 15h2" /><path d="m15 9 4 4-4 4" /></>}
                      {card.icon === "bars"  && <><path d="M5 19V9" /><path d="M10 19V5" /><path d="M15 19v-7" /><path d="M20 19V3" /></>}
                      {card.icon === "pulse" && <path d="M4 13h4l2-6 4 12 2-6h4" />}
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart + Insights row */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">

              {/* Chart card */}
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] shadow-sm flex flex-col">
                <div className="bg-[#2a4365] py-2 text-center border-b border-[#1e3a5f]">
                  <span className="text-sm font-semibold text-white">Price History (Last 30 Days)</span>
                </div>

                <div className="flex flex-col md:flex-row p-4 flex-1">
                  {/* Product info panel */}
                  <div className="w-[200px] flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-[#262c3d] pr-4">
                    <div className="mb-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-gray-100 dark:border-[#262c3d] bg-gray-50 dark:bg-[#0b101e]">
                      {selectedProduct.product_image && !imgErrors[selectedProduct._id] ? (
                        <img
                          src={selectedProduct.product_image}
                          alt={selectedProduct.product_name}
                          className="h-full w-full object-contain"
                          onError={() => setImgErrors((e) => ({ ...e, [selectedProduct._id]: true }))}
                        />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                    </div>
                    <p className="text-center text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                      {selectedProduct.product_name}
                    </p>
                    {selectedProduct.product_brand && (
                      <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        ({selectedProduct.product_brand})
                      </p>
                    )}
                    <p className="mt-3 text-center text-2xl font-bold text-gray-900 dark:text-white">
                      {fmt(parsePrice(selectedProduct.product_price))}
                    </p>
                    {selectedProduct.product_ean_id && (
                      <p className="mt-1 text-center text-[10px] text-gray-400">EAN: {selectedProduct.product_ean_id}</p>
                    )}
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 pl-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Price History (Last 30 Days)</span>
                    </div>

                    {/* Legend */}
                    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-[2px] flex-shrink-0" style={{ backgroundColor: "#2563eb" }} />
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Our Price</span>
                      </div>
                      {onlineCompetitors.map((c) => (
                        <button
                          key={c.slug}
                          onClick={() => toggleSlug(c.slug)}
                          className={`flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity ${
                            visibleSlugs.has(c.slug) ? "opacity-100" : "opacity-30"
                          }`}
                          title={visibleSlugs.has(c.slug) ? `Hide ${c.name}` : `Show ${c.name}`}
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-[2px] flex-shrink-0"
                            style={{ backgroundColor: c.color || "#475e77" }}
                          />
                          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="w-full">
                      <PriceChart
                        product={selectedProduct}
                        competitors={onlineCompetitors}
                        visibleSlugs={visibleSlugs}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] p-5 shadow-sm">
                <h3 className="mb-5 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#262c3d] pb-2">
                  Insights
                </h3>

                {/* Lowest price competitor */}
                {(() => {
                  const competitorPrices = (selectedProduct.competitor_prices || [])
                    .filter((c) => c.price !== null)
                    .sort((a, b) => a.price - b.price);
                  const lowest     = competitorPrices[0];
                  const lowestComp = storeCompetitors.find((c) => c.slug === lowest?.slug);

                  return (
                    <div className="mb-4 rounded border border-gray-200 dark:border-[#262c3d] p-3 shadow-sm">
                      <p className="mb-2 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Lowest Price Alert</p>
                      {lowest && lowestComp ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CompetitorLogo competitor={lowestComp} size={22} />
                            <div>
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-300">{lowestComp.name} @ </span>
                              <span className="text-xs font-bold text-[#2a4365] dark:text-blue-400">{fmt(lowest.price)}</span>
                            </div>
                          </div>
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No competitor data</p>
                      )}
                    </div>
                  );
                })()}

                {/* All competitor current prices */}
                <div className="rounded border border-gray-200 dark:border-[#262c3d] p-3 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Current Competitor Prices</p>
                  <div className="flex flex-col gap-2">
                    {(selectedProduct.competitor_prices || [])
                      .filter((c) => c.price !== null)
                      .sort((a, b) => a.price - b.price)
                      .map((cp) => {
                        const comp = storeCompetitors.find((c) => c.slug === cp.slug);
                        if (!comp) return null;
                        const ourPrice = parsePrice(selectedProduct.product_price);
                        const diff     = ourPrice !== null ? cp.price - ourPrice : null;
                        return (
                          <div key={cp.slug} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CompetitorLogo competitor={comp} size={20} />
                              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{comp.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800 dark:text-white">{fmt(cp.price)}</span>
                              {diff !== null && diff !== 0 && (
                                <span className={`text-[10px] font-semibold ${diff > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {!(selectedProduct.competitor_prices || []).some((c) => c.price !== null) && (
                      <p className="text-xs text-gray-400">No competitor prices available</p>
                    )}
                  </div>
                </div>

                {/* Price stability */}
                <div className="mt-4 rounded border border-gray-200 dark:border-[#262c3d] p-3 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Price Stability</p>
                  {(() => {
                    const history    = selectedProduct.price_history_30days || [];
                    const ourPrices  = history.map((h) => parsePrice(h.product_price)).filter((v) => v !== null);
                    if (ourPrices.length < 2) return <p className="text-xs text-gray-400">Not enough data</p>;
                    const min        = Math.min(...ourPrices), max = Math.max(...ourPrices);
                    const stability  = max > 0 ? Math.round((1 - (max - min) / max) * 100) : 100;
                    const label      = stability >= 90 ? "High" : stability >= 70 ? "Medium" : "Low";
                    const color      = stability >= 90 ? "text-green-600 dark:text-green-400" : stability >= 70 ? "text-amber-500" : "text-rose-500";
                    return (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`text-sm font-bold ${color}`}>{label}</span>
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{stability}/100</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div className="h-full rounded-full bg-[#2a4365] dark:bg-blue-500" style={{ width: `${stability}%` }} />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Price History Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] shadow-sm mt-2">
              <table className="min-w-[800px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#262c3d] bg-gray-50 dark:bg-[#0b101e]">
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-800 dark:text-gray-300 w-32">DATE</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-800 dark:text-gray-300">Our Price</th>
                    {onlineCompetitors.map((comp) => (
                      <th key={comp.slug} className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <CompetitorLogo competitor={comp} size={26} />
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
                            style={{ color: comp.color || "#475e77" }}
                          >
                            {comp.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2 + onlineCompetitors.length}
                        className="px-5 py-10 text-center text-sm text-gray-400"
                      >
                        No price history available for this product
                      </td>
                    </tr>
                  ) : (
                    tableHistory.map((row, index) => {
                      const ourP = parsePrice(row.product_price);
                      return (
                        <tr
                          key={row.display_date || index}
                          className={`${
                            index === tableHistory.length - 1 ? "" : "border-b border-gray-100 dark:border-[#262c3d]"
                          } hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors`}
                        >
                          <td className="px-5 py-3 text-xs font-semibold text-gray-800 dark:text-gray-300">
                            {row.display_date || "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400">
                            {ourP !== null ? fmt(ourP) : <span className="text-gray-400">—</span>}
                          </td>
                          {onlineCompetitors.map((comp) => {
                            const p    = parsePrice(row.competitors?.[comp.slug]);
                            const diff = p !== null && ourP !== null ? p - ourP : null;
                            return (
                              <td key={comp.slug} className="px-4 py-3 text-center">
                                {p !== null ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400">{fmt(p)}</span>
                                    {diff !== null && diff !== 0 && (
                                      <span className={`text-[9px] font-semibold ${diff > 0 ? "text-amber-500" : "text-rose-500"}`}>
                                        {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
