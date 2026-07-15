import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams,useParams } from "react-router-dom";
import { useStore } from "../store";
import { fetchProducts } from "../services/productsService";
import { fetchCompetitors } from "../services/competitorsService";
import API from "../hooks/useApi";
// ── Helpers ───────────────────────────────────────────────────────────────────
 
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
 
// ── Pick the default product to show: prefer one with 4-7 competitors ─────────
function getCompetitorCount(product) {
  return Array.isArray(product?.arrrank_name_by) ? product.arrrank_name_by.length : 0;
}
 
function pickDefaultProduct(products) {
  console.log("🔍 pickDefaultProduct called with", products?.length, "products");
  console.log("🔍 counts:", products?.map(p => ({ name: p.product_name, count: getCompetitorCount(p) })));

  if (!products || !products.length) return null;

 
  // First product (in original order) whose competitor count is between 4 and 7 (inclusive)
  const inRange = products.find((p) => {
    const count = getCompetitorCount(p);
    return count >= 4 && count <= 7;
  });
  if (inRange) return inRange;
 
  // Otherwise fall back to the product with the highest competitor count overall
  return products.reduce(
    (best, p) => (getCompetitorCount(p) > getCompetitorCount(best) ? p : best),
    products[0]
  );
}
 
// ── Resolve logo URL safely (mirrors MarketCompetitor) ────────────────────────
function resolveLogoUrl(logo) {
  if (!logo) return null;
  if (logo.startsWith("blob:") || logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${API.defaults.baseURL.replace(/\/api\/?$/, '')}${logo}`;
}
 
 
// ── Competitor Logo Component ─────────────────────────────────────────────────
function CompetitorLogo({ competitor, size = 28, showName = false }) {
  const [imgErr, setImgErr] = useState(false);
  const bg       = competitor.color || "#475e77";
  const initials = (competitor.name || competitor.slug || "").substring(0, 2).toUpperCase();
  const imgSrc   = resolveLogoUrl(competitor.logo);
 
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-slate-200"
        style={{ width: size, height: size, backgroundColor: bg }}
      >
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={competitor.name}
            className="h-full w-full object-contain"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span style={{ fontSize: size * 0.32 }} className="font-bold tracking-wider text-white">
            {initials}
          </span>
        )}
      </div>
      {showName && (
        <span className="whitespace-nowrap text-[11px] font-semibold text-gray-700 dark:text-gray-300">
          {competitor.name}
        </span>
      )}
    </div>
  );
}
 
// ── Interactive Business Analytics Graph ──────────────────────────────────────
 
function PriceChart({ history, competitors, visibleSlugs }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const chartRef = useRef(null);
 
  if (!history || !history.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm font-medium text-gray-400">
        No price history available
      </div>
    );
  }
 
  const svgW = 750, svgH = 290;
  const pad  = { top: 25, right: 20, bottom: 80, left: 65 }; 
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
 
  const range    = dataMax - dataMin;
  const chartMin = Math.max(0, dataMin - range * 0.1); 
  const chartMax = dataMax + range * 0.1;
  const span     = chartMax - chartMin;
 
  const getX = (i) => pad.left + (plotW / Math.max(history.length - 1, 1)) * i;
  const getY = (v) => pad.top + ((chartMax - v) / span) * plotH;
 
  const yTickCount = 4;
  const rawTicks = Array.from({ length: yTickCount }, (_, i) => chartMin + (span / (yTickCount - 1)) * i);
  const yTicks = [...new Set(rawTicks.map(t => Math.round(t)))];
  
  const series = [
    {
      slug:   "our_price",
      name:   "Our Price",
      color:  "#2563eb",
      values: history.map((h) => parsePrice(h.product_price)),
      isMain: true,
    },
    ...competitors
      .filter((c) => c.isActive !== false && visibleSlugs.has(c.slug))
      .map((c) => ({
        slug:   c.slug,
        name:   c.name,
        color:  c.color || "#94a3b8",
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
        <defs>
          <linearGradient id="mainAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
 
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left} y1={getY(tick)}
              x2={pad.left + plotW} y2={getY(tick)}
              stroke="#e2e8f0" className="dark:stroke-gray-800" strokeWidth="1" strokeDasharray="4 4"
            />
            <text x={pad.left - 10} y={getY(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b" className="dark:fill-gray-500 font-semibold">
              {fmt(tick)}
            </text>
          </g>
        ))}
 
        {history.map((h, i) => {
          if (!h.display_date) return null;
          const step = history.length > 31 ? Math.ceil(history.length / 15) : 1;
          if (i % step !== 0 && i !== history.length - 1 && i !== 0) return null;
          
          return (
            <text
              key={i}
              transform={`translate(${getX(i)},${pad.top + plotH + 18}) rotate(40)`}
              textAnchor="start" fontSize="10" fill="#64748b" className="dark:fill-gray-400 font-semibold"
            >
              {h.display_date}
            </text>
          );
        })}
 
        {series.map((s) => {
          const dLine = buildPath(s.values);
          const dArea = s.isMain ? buildAreaPath(s.values) : "";
          if (!dLine) return null;
 
          return (
            <g key={s.slug}>
              {s.isMain && dArea && (
                <path d={dArea} fill="url(#mainAreaGrad)" className="transition-opacity duration-300" />
              )}
              <path
                d={dLine}
                fill="none"
                stroke={s.color}
                strokeWidth={s.isMain ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={s.isMain ? 1 : 0.6}
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
 
        {hoverIdx !== null && (
          <line
            x1={getX(hoverIdx)} y1={pad.top}
            x2={getX(hoverIdx)} y2={pad.top + plotH}
            stroke="#94a3b8"
            className="dark:stroke-gray-600"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}
        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent" />
      </svg>
 
      {hoverIdx !== null && (
        <div 
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white/95 p-2 md:p-3 shadow-xl backdrop-blur-md dark:border-gray-700 dark:bg-[#151a2a]/95"
          style={{
            left: hoverIdx > history.length / 2 ? 'auto' : `${(getX(hoverIdx) / svgW) * 100}%`,
            right: hoverIdx > history.length / 2 ? `${100 - (getX(hoverIdx) / svgW) * 100}%` : 'auto',
            top: '0px',
            marginLeft: hoverIdx > history.length / 2 ? '0' : '10px',
            marginRight: hoverIdx > history.length / 2 ? '10px' : '0',
            minWidth: '140px'
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
                <div key={s.slug} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className={`text-[10px] truncate ${s.isMain ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                      {s.name}
                    </span>
                  </div>
                  <span className={`text-[10px] shrink-0 ${s.isMain ? 'font-black text-blue-600 dark:text-blue-400' : 'font-bold text-gray-800 dark:text-gray-200'}`}>
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
  const [searchQuery,   setSearchQuery]   = useState("");
  const [userSearched,  setUserSearched]  = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleSlugs,  setVisibleSlugs]  = useState(new Set());
  const [imgErrors,     setImgErrors]     = useState({});
  const [searchParams] = useSearchParams();
// const eanFromUrl = searchParams.get("ean") || "";
const { ean: eanFromUrl } = useParams();
const rangeFromUrl = searchParams.get("range") || "30";
 
const [daysRange,     setDaysRange]     = useState(Number(rangeFromUrl));
const [eanProduct,    setEanProduct]    = useState(null);
const [eanLoading,    setEanLoading]    = useState(false);
 
  // If we navigated here with an explicit EAN that isn't in the already-cached
  // storeProducts page (limit=15), fetch it directly from the backend — the
  // same way search does — instead of silently falling back to the smart
  // default product.
  useEffect(() => {
    if (!eanFromUrl) {
      setEanProduct(null);
      return;
    }
    const alreadyLoaded = storeProducts.find(
      (p) => String(p.product_ean_id) === String(eanFromUrl) || String(p.product_code) === String(eanFromUrl)
    );
    if (alreadyLoaded) {
      setEanProduct(null); // storeProducts already has it, no need for a separate fetch
      return;
    }
    let cancelled = false;
    setEanLoading(true);
    fetchProducts({ search: eanFromUrl, limit: 1 })
      .then((d) => {
        if (cancelled) return;
        const arr = Array.isArray(d) ? d : (d?.products ?? d?.data ?? d?.items ?? []);
        const match = arr.find(
          (p) => String(p.product_ean_id) === String(eanFromUrl) || String(p.product_code) === String(eanFromUrl)
        ) || arr[0] || null;
        setEanProduct(match);
      })
      .catch((e) => {
        console.error("ProductHistory EAN fetch error:", e);
        if (!cancelled) setEanProduct(null);
      })
      .finally(() => {
        if (!cancelled) setEanLoading(false);
      });
    return () => { cancelled = true; };
  }, [eanFromUrl, storeProducts]);
 
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [, comps] = await Promise.all([
          fetchProducts().then((d) => {
            const arr = Array.isArray(d) ? d : (d?.products ?? d?.data ?? d?.items ?? []);
            setProducts(arr);
            setProductsLoading(false);
            return arr;
          }),
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
 
  // NOTE: storeProducts is just whatever page of products happens to already
  // be loaded in the shared store (limit=15 by default) — filtering that
  // client-side means a product outside the first page (matched by name,
  // brand, EAN, OR product code) will never show up here, even though the
  // Products page finds it fine because it searches the backend. So once the
  // user searches, we use the backend results (searchResults) instead, which
  // already matches on product_name, product_brand, product_ean_id AND
  // product_code (see productsController.getAll).
  const filteredProducts = useMemo(() => {
    if (!userSearched || !searchQuery.trim()) return storeProducts;
    return searchResults;
  }, [storeProducts, searchResults, userSearched, searchQuery]);
 
  const selectedProduct = useMemo(() => {
    if (userSearched) {
      return filteredProducts[selectedIndex] ?? filteredProducts[0] ?? null;
    }
    // Only an explicit EAN in the URL (e.g. navigated here from another page/link)
    // should override the smart default. A stale lastViewedEan from a previous
    // visit should NOT stop us from computing the 4-7-competitor default.
    if (eanFromUrl) {
      const found = storeProducts.find(
        (p) => String(p.product_ean_id) === String(eanFromUrl) || String(p.product_code) === String(eanFromUrl)
      );
      if (found) return found;
      // Not in the cached page — use the product fetched directly by EAN, if ready.
      if (eanProduct) return eanProduct;
      // Still fetching it — don't fall back to the default picker and flash the
      // wrong product; wait (selectedProduct stays null until eanLoading resolves).
      if (eanLoading) return null;
    }
    return pickDefaultProduct(storeProducts);
  }, [userSearched, filteredProducts, selectedIndex, eanFromUrl, storeProducts, eanProduct, eanLoading]);
 
  useEffect(() => {
    if (selectedProduct?.product_ean_id) {
      setLastViewedEan(String(selectedProduct.product_ean_id));
    }
  }, [selectedProduct?.product_ean_id]);
 
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);
// Update daysRange when URL range parameter changes
useEffect(() => {
  const rangeFromUrl = searchParams.get("range");
  if (rangeFromUrl) {
    setDaysRange(Number(rangeFromUrl));
  }
}, [searchParams]);
  const onlineCompetitors = storeCompetitors.filter((c) => c.isActive !== false);
 
  const activeHistory = useMemo(() => {
    const full = selectedProduct?.price_history_30days || [];
    return full.slice(0, daysRange); 
  }, [selectedProduct, daysRange]);
 
   const chartCompetitors = useMemo(() => {
    return onlineCompetitors.filter((c) =>
      activeHistory.some((h) => parsePrice(h.competitors?.[c.slug]) !== null)
    );
  }, [onlineCompetitors, activeHistory]);
 
  const stats = useMemo(() => {
    if (!selectedProduct || activeHistory.length === 0) return { min: null, max: null, avgDev: null };
    const compPrices = [];
    activeHistory.forEach((h) => {
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
  }, [selectedProduct, activeHistory, onlineCompetitors]);
 
  const toggleSlug = (slug) => {
    setVisibleSlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };
 
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
 
  const handleSearchSubmit = async () => {
    const q = searchQuery.trim();
    setSelectedIndex(0);

    if (!q) {
      setUserSearched(false);
      setSearchResults([]);
      return;
    }

    setUserSearched(true);
    setSearchLoading(true);
    try {
      // Same backend search used by the Products page — matches on
      // product_name, product_brand, product_ean_id, AND product_code.
      const d = await fetchProducts({ search: q, limit: 50 });
      const arr = Array.isArray(d) ? d : (d?.products ?? d?.data ?? d?.items ?? []);
      setSearchResults(arr);
    } catch (e) {
      console.error("ProductHistory search error:", e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };
 
  const handleClearSearch = () => {
    setSearchQuery("");
    setUserSearched(false);
    setSearchResults([]);
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
    <div className="min-h-screen bg-white font-sans text-gray-900 transition-colors duration-200 dark:bg-[#0b101e] dark:text-gray-100 pb-12">
      
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white px-4 md:px-6 py-4 dark:border-[#262c3d] dark:bg-[#151a2a]">
        <div className="mx-auto max-w-[1280px]">
          <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Manage Product History</h1>
        </div>
      </div>
 
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6">
 
        {/* Search & Filter Top Bar */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 md:p-5 shadow-sm dark:border-[#262c3d] dark:bg-[#151a2a]">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Range</label>
            <select 
              value={daysRange}
              onChange={(e) => setDaysRange(Number(e.target.value))}
              className="h-10 w-full md:w-40 rounded border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-[#0b101e] dark:text-gray-200"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
 
          <div className="flex flex-col gap-2 flex-1 w-full">
            <label className="whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-400">
              Search Product
            </label>
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder="Name, brand or EAN…"
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-[#0b101e] dark:text-gray-200"
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
            className="w-full md:w-auto md:mt-0 inline-flex h-10 items-center justify-center gap-2 rounded bg-teal-500 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            Search
          </button>
        </div>
 
        {/* Search Results Feedback */}
        {userSearched && searchQuery && searchLoading && (
          <p className="-mt-2 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
            Searching…
          </p>
        )}
        {userSearched && searchQuery && !searchLoading && filteredProducts.length > 1 && (
          <p className="-mt-2 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
            {filteredProducts.length} products matched — showing the first result.
          </p>
        )}
        {userSearched && searchQuery && !searchLoading && filteredProducts.length === 0 && (
          <p className="-mt-2 text-xs text-rose-500">
            No products matched "{searchQuery}".{" "}
            <button onClick={handleClearSearch} className="underline hover:no-underline">Clear search</button>
          </p>
        )}
 
          {!selectedProduct ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 dark:border-[#262c3d] dark:bg-[#151a2a]">
              No products found
            </div>
          ) : (
          <>
            {/* Stat Cards - Responsive Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Min Market Price",  value: fmt(stats.min),    icon: "trend", iconBg: "214 100% 97%", iconColor: "217 91% 50%" },
                { label: "Max Market Price",  value: fmt(stats.max),    icon: "bars",  iconBg: "270 100% 97%", iconColor: "267 83% 60%" },
                { label: "Average Deviation", value: stats.avgDev !== null ? fmt(stats.avgDev) : "—", icon: "pulse", iconBg: "214 100% 97%", iconColor: "217 91% 50%" },
              ].map((card) => (
                <div key={card.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 md:px-6 py-4 md:py-5 shadow-sm dark:border-[#262c3d] dark:bg-[#151a2a]">
                  <div>
                    <p className="mb-1 text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className="grid h-10 w-10 md:h-12 md:w-12 place-items-center rounded-full shrink-0" style={{ backgroundColor: `hsl(${card.iconBg})` }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={`hsl(${card.iconColor})`} strokeWidth="2.5" strokeLinecap="round">
                      {card.icon === "trend" && <><path d="M5 7h10" /><path d="M9 11h6" /><path d="M13 15h2" /><path d="m15 9 4 4-4 4" /></>}
                      {card.icon === "bars"  && <><path d="M5 19V9" /><path d="M10 19V5" /><path d="M15 19v-7" /><path d="M20 19V3" /></>}
                      {card.icon === "pulse" && <path d="M4 13h4l2-6 4 12 2-6h4" />}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
 
            {/* Chart + Insights Layout */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
 
              {/* Chart Section */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#262c3d] dark:bg-[#151a2a]">
                <div className="border-b border-[#1e3a5f] bg-[#2a4365] py-2 text-center">
                  <span className="text-sm font-semibold text-white">Price History (Last {daysRange} Days)</span>
                </div>
 
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Product Info Panel */}
                    <div className="flex md:w-[200px] shrink-0 flex-col items-center justify-center md:border-r border-gray-100 md:pr-4 dark:border-[#262c3d]">
                      <div className="mb-3 flex h-24 w-24 md:h-28 md:w-28 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-[#262c3d] dark:bg-[#0b101e]">
                        {selectedProduct.product_image && !imgErrors[selectedProduct._id] ? (
                          <img
                            src={selectedProduct.product_image}
                            alt={selectedProduct.product_name}
                            className="h-full w-full object-contain"
                            onError={() => setImgErrors((e) => ({ ...e, [selectedProduct._id]: true }))}
                          />
                        ) : (
                          <span className="text-3xl md:text-4xl">📦</span>
                        )}
                      </div>
                      {selectedProduct.product_url ? (
                      <a
                      href={selectedProduct.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open product page"
                      className="inline-flex items-center gap-1 text-center text-xs font-semibold leading-tight text-gray-800 dark:text-gray-200 max-w-[180px]"
                      >
                      {selectedProduct.product_name}
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-60">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                      </svg>
                       </a>
                       ) : (
                         <p className="text-center text-xs font-semibold leading-tight text-gray-800 dark:text-gray-200 max-w-[180px]">
                           {selectedProduct.product_name}
                         </p>)
}
                      {selectedProduct.product_brand && (
                        <p className="mt-0.5 text-center text-[10px] text-gray-500 dark:text-gray-400">
                          ({selectedProduct.product_brand})
                        </p>
                      )}
                      <p className="mt-3 text-center text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        {fmt(parsePrice(selectedProduct.product_price))}
                      </p>
                      {selectedProduct.product_ean_id && (
                        <p className="mt-1 text-center text-[10px] text-gray-400">EAN: {selectedProduct.product_ean_id}</p>
                      )}
                    </div>
 
                    {/* Right Chart Area */}
                    <div className="flex flex-1 flex-col w-full overflow-hidden">
                      {/* Legend Top Bar */}
                      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-2 justify-center md:justify-start">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: "#2563eb" }} />
                          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Our Price</span>
                        </div>
                        {chartCompetitors.map((c) => (
                          <button
                            key={c.slug}
                            onClick={() => toggleSlug(c.slug)}
                            className={`flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity hover:opacity-80 ${
                              visibleSlugs.has(c.slug) ? "opacity-100" : "opacity-40"
                            }`}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: c.color || "#475e77" }}
                            />
                            <span className="whitespace-nowrap text-[10px] font-medium text-gray-600 dark:text-gray-400">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
 
                      <div className="w-full flex-1">
                        <PriceChart
                          history={activeHistory}
                          competitors={chartCompetitors}
                          visibleSlugs={visibleSlugs}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Insights Sidebar */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#262c3d] dark:bg-[#151a2a]">
                <h3 className="mb-5 border-b border-gray-100 pb-2 text-base font-bold text-gray-900 dark:border-[#262c3d] dark:text-white">
                  Insights
                </h3>
 
                {/* Lowest Price Alert */}
                {(() => {
                  const competitorPrices = (selectedProduct.competitor_prices || [])
                    .filter((c) => c.price !== null)
                    .sort((a, b) => a.price - b.price);
                  const lowest     = competitorPrices[0];
                  const lowestComp = storeCompetitors.find((c) => c.slug === lowest?.slug);
 
                  return (
                    <div className="mb-4 rounded border border-gray-200 p-3 shadow-sm dark:border-[#262c3d]">
                      <p className="mb-2 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Lowest Price Alert</p>
                      {lowest && lowestComp ? (
  <div className="flex items-center justify-between">
    {lowest.url ? (
      <a href={lowest.url} target="_blank" rel="noopener noreferrer" title={`Open on ${lowestComp.name}`} className="flex items-center gap-2 hover:opacity-75 transition-opacity">
        <CompetitorLogo competitor={lowestComp} size={22} />
        <div>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 truncate max-w-[80px] inline-block align-bottom">{lowestComp.name}</span>
          <span className="text-xs font-bold text-[#2a4365] dark:text-blue-400 ml-1">{fmt(lowest.price)}</span>
        </div>
      </a>
    ) : (
      <div className="flex items-center gap-2">
        <CompetitorLogo competitor={lowestComp} size={22} />
        <div>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 truncate max-w-[80px] inline-block align-bottom">{lowestComp.name}</span>
          <span className="text-xs font-bold text-[#2a4365] dark:text-blue-400 ml-1">{fmt(lowest.price)}</span>
        </div>
      </div>
    )}
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
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
 
                {/* Current Competitor Prices List */}
                <div className="rounded border border-gray-200 p-3 shadow-sm dark:border-[#262c3d]">
                  <p className="mb-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Current Competitor Prices</p>
                  <div className="flex flex-col gap-3 md:gap-2">
                    {(selectedProduct.competitor_prices || [])
                      .filter((c) => c.price !== null)
                      .sort((a, b) => a.price - b.price)
                      .map((cp) => {
                        const comp = storeCompetitors.find((c) => c.slug === cp.slug);
                        if (!comp) return null;
                        const ourPrice = parsePrice(selectedProduct.product_price);
                        const diff     = ourPrice !== null ? cp.price - ourPrice : null;
                        return (
                          <a
                            key={cp.slug}
                            href={cp.url || comp.website || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-2">
                              <CompetitorLogo competitor={comp} size={20} />
                              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70px]">
                                {comp.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800 dark:text-white">{fmt(cp.price)}</span>
                              {diff !== null && diff !== 0 && (
                                <span className={`text-[10px] font-semibold shrink-0 ${diff > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))}
                                </span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    {!(selectedProduct.competitor_prices || []).some((c) => c.price !== null) && (
                      <p className="text-xs text-gray-400">No competitor prices available</p>
                    )}
                  </div>
                </div>
 
                {/* Price Stability */}
                <div className="mt-4 rounded border border-gray-200 p-3 shadow-sm dark:border-[#262c3d]">
                  <p className="mb-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Price Stability ({daysRange} Days)</p>
                  {(() => {
                    const ourPrices = activeHistory.map((h) => parsePrice(h.product_price)).filter((v) => v !== null);
                    if (ourPrices.length < 2) return <p className="text-xs text-gray-400">Not enough data</p>;
                    const min         = Math.min(...ourPrices), max = Math.max(...ourPrices);
                    const stability   = max > 0 ? Math.round((1 - (max - min) / max) * 100) : 100;
                    const label       = stability >= 90 ? "High" : stability >= 70 ? "Medium" : "Low";
                    const color       = stability >= 90 ? "text-green-600 dark:text-green-400" : stability >= 70 ? "text-amber-500" : "text-rose-500";
                    return (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`text-sm font-bold ${color}`}>{label}</span>
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{stability}/100</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div className="h-full rounded-full bg-[#2a4365] transition-all dark:bg-blue-500" style={{ width: `${stability}%` }} />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
 
            {/* Price History Data Table - Wrapped in Scroll Container */}
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#262c3d] dark:bg-[#151a2a]">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-[#262c3d] dark:bg-[#0b101e]">
                    <th className="w-32 px-4 py-4 text-left text-xs font-bold text-gray-800 dark:text-gray-300">DATE</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-800 dark:text-gray-300">Our Price</th>
                    {onlineCompetitors.map((comp) => (
                      <th key={comp.slug} className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <CompetitorLogo competitor={comp} size={22} />
                          <span
                            className="whitespace-nowrap text-[9px] font-bold uppercase tracking-wide"
                            style={{ color: comp.color || "#475e77" }}
                          >
                            {comp.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#262c3d]">
                  {activeHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2 + onlineCompetitors.length}
                        className="px-5 py-10 text-center text-sm text-gray-400"
                      >
                        No price history available
                      </td>
                    </tr>
                  ) : (
                    activeHistory.map((row, index) => {
                      const ourP = parsePrice(row.product_price);
                      return (
                        <tr
                          key={row.display_date || index}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                        >
                          <td className="px-4 py-3 text-[11px] font-semibold text-gray-800 dark:text-gray-300">
                            {row.display_date || "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            {ourP !== null ? fmt(ourP) : <span className="text-gray-400">—</span>}
                          </td>
                          {onlineCompetitors.map((comp) => {
                            const p    = parsePrice(row.competitors?.[comp.slug]);
                            const diff = p !== null && ourP !== null ? p - ourP : null;
                            return (
                              <td key={comp.slug} className="px-4 py-3 text-center">
                                {p !== null ? (
                                  <div className="flex flex-col items-center gap-0">
                                    <span className="text-[11px] font-bold text-green-600 dark:text-green-400">{fmt(p)}</span>
                                    {diff !== null && diff !== 0 && (
                                      <span className={`text-[9px] font-semibold ${diff > 0 ? "text-amber-500" : "text-rose-500"}`}>
                                        {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
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