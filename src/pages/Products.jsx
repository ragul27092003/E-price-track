import { useState } from "react";
import { useNavigate } from "react-router-dom";

const mockProducts = [
  { id: 50099, name: "Samsung Galaxy S24", brand: "Samsung", image: "📱", stockStatus: "In Stock", priceGap: -4.5, currentPrice: 1359, competitors: [{ name: "Flipkart", price: 909, trend: [900,920,910,905,909] }, { name: "Amazon", price: 1134, trend: [1100,1120,1130,1125,1134] }, { name: "Croma", price: 1359, trend: [1340,1350,1345,1355,1359] }], low: 909, avg: 1134, high: 1359 },
  { id: 50092, name: "iPhone 15 Pro", brand: "Apple", image: "📱", stockStatus: "In Stock", priceGap: -1.2, currentPrice: 1359, competitors: [{ name: "Croma", price: 759, trend: [750,755,758,760,759] }, { name: "Croma", price: 749, trend: [740,745,748,750,749] }], low: 749, avg: 754, high: 759 },
  { id: 50093, name: "MacBook Air M2", brand: "Apple", image: "💻", stockStatus: "Low Stock", priceGap: -1.2, currentPrice: 1459, competitors: [{ name: "Flipkart", price: 779, trend: [770,775,778,780,779] }, { name: "Amazon", price: 799, trend: [790,795,798,800,799] }], low: 779, avg: 789, high: 799 },
  { id: 50004, name: "Dell XPS 13", brand: "Dell", image: "💻", stockStatus: "Low Stock", priceGap: -1.2, currentPrice: 1359, competitors: [{ name: "Amazon", price: 799, trend: [790,795,798,800,799] }, { name: "Amazon", price: 399, trend: [390,395,398,400,399] }], low: 399, avg: 599, high: 799 },
  { id: 50005, name: "OnePlus 12", brand: "OnePlus", image: "📱", stockStatus: "Low Stock", priceGap: -1.2, currentPrice: 1259, competitors: [{ name: "Croma", price: 799, trend: [790,795,798,800,799] }, { name: "Croma", price: 250, trend: [240,245,248,250,250] }], low: 250, avg: 524, high: 799 },
  { id: 50002, name: "Sony WH-1000XM5", brand: "Sony", image: "🎧", stockStatus: "Low Stock", priceGap: -1.5, currentPrice: 1259, competitors: [{ name: "Croma", price: 748, trend: [740,745,748,750,748] }, { name: "Flipkart", price: 421, trend: [410,415,418,420,421] }], low: 421, avg: 584, high: 748 },
  { id: 50071, name: "Google Pixel 8", brand: "Google", image: "📱", stockStatus: "Out of Stock", priceGap: -1.2, currentPrice: 1359, competitors: [{ name: "Amazon", price: 759, trend: [750,755,758,760,759] }, { name: "Flipkart", price: 226, trend: [220,222,224,225,226] }], low: 226, avg: 492, high: 759 },
];

const historyData = [
  { month: "Jan", product: 500, comp1: 650, comp2: 520 },
  { month: "Feb", product: 1000, comp1: 750, comp2: 600 },
  { month: "Mar", product: 950, comp1: 650, comp2: 650 },
  { month: "Apr", product: 750, comp1: 800, comp2: 600 },
  { month: "May", product: 900, comp1: 700, comp2: 520 },
  { month: "Jun", product: 800, comp1: 850, comp2: 750 },
];

const inventoryData = [
  { month: "Jan", current: 80, predicted: 120 },
  { month: "Feb", current: 90, predicted: 130 },
  { month: "Mar", current: 100, predicted: 140 },
  { month: "Apr", current: 65, predicted: 110 },
  { month: "May", current: 110, predicted: 130 },
  { month: "Jun", current: 105, predicted: 125 },
];

const tabs = [
  { key: "brand", label: "Brand Products" },
  { key: "compare", label: "Compare" },
  { key: "analysis", label: "Price Analysis" },

];

function BrandLogo({ name }) {
  const configs = {
    Amazon: { bg: "bg-slate-800", text: "text-white", label: "amazon" },
    Flipkart: { bg: "bg-[#047BD5]", text: "text-[#FFE11B]", label: "flipkart" },
    Croma: { bg: "bg-[#00E5CC]", text: "text-slate-900", label: "croma" },
  };
  const config = configs[name] || configs.Amazon;
  
  return (
    <div className={`flex h-6 w-12 items-center justify-center rounded ${config.bg} ${config.text} text-[8px] font-bold uppercase tracking-wider`}>
      {config.label}
    </div>
  );
}

function Sparkline({ data, width = 50, height = 20, color = "#3b82f6" }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  
  return (
    <svg width={width} height={height} className="inline-block align-middle opacity-80">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StockStatus({ status }) {
  const colors = {
    "In Stock": "bg-emerald-500",
    "Low Stock": "bg-amber-400",
    "Out of Stock": "bg-rose-500",
  };
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-slate-300"}`} />
      {status}
    </span>
  );
}

function PriceGapBadge({ value }) {
  const isNeg = value < 0;
  // Approximating the unique "tag" shape from the design
  const baseColors = isNeg ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const barColor = isNeg ? "bg-emerald-500" : "bg-amber-500";
  const arrowRotate = isNeg ? "rotate-180" : "rotate-0";

  return (
    <div className={`relative inline-flex items-center gap-1 rounded-full pr-3 pl-2 py-1 text-[11px] font-bold ${baseColors}`}>
      <div className="flex items-center justify-center">
        <svg className={`w-3 h-3 ${isNeg ? 'text-emerald-500' : 'text-amber-500'} ${arrowRotate}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      <div className={`w-0.5 h-3 opacity-30 ${barColor} mx-0.5 rounded-full`}></div>
      <span>{value}% {isNeg ? "below" : "above"} market</span>
    </div>
  );
}

function MiniChart({ data, width = 200, height = 100, colors, labels, legend, areaOpacity = 0 }) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]).filter(k => k !== "month" && k !== "gap");
  // For the specific gap chart
  const usesGap = data[0].hasOwnProperty("gap");
  const activeKeys = usesGap ? ["gap"] : keys;
  
  const allVals = data.flatMap(d => activeKeys.map(k => d[k]));
  const min = Math.min(0, ...allVals); 
  const max = Math.max(...allVals) * 1.1;
  const range = max - min || 1;
  const getX = (i) => (i / (data.length - 1)) * width;
  const getY = (v) => height - ((v - min) / range) * height;

  return (
    <div className="w-full">
      {legend && (
        <div className="mb-4 flex flex-wrap gap-4">
          {activeKeys.map((k, i) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i] || "#3b82f6" }} />
              {labels?.[i] || k}
            </span>
          ))}
        </div>
      )}
      <div className="relative w-full" style={{ height }}>
        {/* Render Zero Line for Gap Chart */}
        {usesGap && min < 0 && (
           <div className="absolute w-full border-t border-dashed border-slate-300" style={{ top: getY(0) }}></div>
        )}
        
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d" preserveAspectRatio="none">
          {activeKeys.map((key, ki) => {
            const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(d[key])}`).join(" ");
            const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;
            
            return (
              <g key={key}>
                {areaOpacity > 0 && (
                  <path d={areaPath} fill={colors[ki]} fillOpacity={areaOpacity} />
                )}
                <path d={linePath} fill="none" stroke={colors[ki] || "#3b82f6"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots */}
                {data.map((d, i) => (
                   <circle key={i} cx={getX(i)} cy={getY(d[key])} r="3" fill="#fff" stroke={colors[ki]} strokeWidth="2" />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400 font-medium px-1">
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0 ? <span key={d.month}>{d.month}</span> : null))}
      </div>
    </div>
  );
}

function BarChart({ data, width = 200, height = 120, colors, keys, labels }) {
  if (!data || data.length === 0) return null;
  const allVals = data.flatMap(d => keys.map(k => d[k]));
  const max = Math.max(...allVals) * 1.1;
  const barGroupWidth = width / data.length;
  const barWidth = barGroupWidth / (keys.length + 1.5);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-4 justify-end">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
            {labels[i]}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none" style={{ height }}>
        {data.map((d, di) => (
          <g key={d.month}>
            {keys.map((k, ki) => {
              const h = (d[k] / max) * height;
              return (
                <rect
                  key={k}
                  x={di * barGroupWidth + ki * barWidth + barWidth * 0.5}
                  y={height - h}
                  width={barWidth * 0.8}
                  height={h}
                  fill={colors[ki]}
                  rx="1.5"
                />
              )
            })}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-400 font-medium px-2">
        {data.map(d => <span key={d.month}>{d.month}</span>)}
      </div>
    </div>
  );
}

export default function Products() {
  const navigate=useNavigate();
  const [activeTab, setActiveTab] = useState("brand");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(0);

  const filtered = mockProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    String(p.id).includes(search)
  );

  const product = mockProducts[selectedProduct];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-6 py-6">
        
        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-100">
            <svg className="text-slate-400" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              Filter
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#226fa3] transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          {["Brand", "Category", "Price Rank"].map((filter, idx) => (
            <div key={filter} className="flex-1 min-w-[150px] max-w-[200px]">
              <p className="mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">{filter}</p>
              <select className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-300">
                <option>All {filter.replace(' Rank', 's')}</option>
              </select>
            </div>
          ))}
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-6 border-b border-slate-200 mt-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-semibold transition-all relative ${
                activeTab === tab.key 
                ? "text-slate-800" 
                : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2B86C5] rounded-t-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-2">
          
          {/* TAB: BRAND PRODUCTS */}
          {activeTab === "brand" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Stock Status</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Price Trends</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-xl shadow-sm">
                            {p.image}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-[13px]">{p.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Brand: {p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><StockStatus status={p.stockStatus} /></td>
                      <td className="px-5 py-4"><PriceGapBadge value={p.priceGap} /></td>
                      <td className="px-5 py-4">
                        {i === 0 ? (
                          <div className="flex items-center gap-8">
                            <div><span className="text-[11px] text-slate-500">Low</span><br /><span className="font-bold text-slate-800">₹{p.low}</span></div>
                            <div className="relative"><span className="text-[11px] text-slate-500">Average</span><br /><span className="font-bold text-slate-800">Avg: ₹{p.avg}</span>
                              <div className="absolute top-1/2 -left-4 w-2 h-0.5 bg-emerald-500"></div>
                              <div className="absolute top-1/2 -right-4 w-2 h-0.5 bg-rose-500"></div>
                            </div>
                            <div><span className="text-[11px] text-slate-500">High</span><br /><span className="font-bold text-slate-800">₹{p.high}</span></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-6">
                            {p.competitors.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <BrandLogo name={c.name} />
                                <span className="font-bold text-slate-800 text-[13px]">₹{c.price}</span>
                                <Sparkline data={c.trend} color="#0ea5e9" />
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                         <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">View Details</button>
                              <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Quick Sync</button>
                            </div>
                            <span className="text-[10px] text-slate-400">Last Updated: 10m ago</span>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: CARD VIEW */}
          {activeTab === "cards" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(p => (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="mb-4 flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-2xl shadow-sm">
                      {p.image}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">Brand ID: {p.id}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Stock Status</span>
                      <StockStatus status={p.stockStatus} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Price Gap</span>
                      <PriceGapBadge value={p.priceGap} />
                    </div>
                  </div>
                  <div className="mb-5 rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Competitor Prices</p>
                    <div className="flex items-center justify-between">
                      <div className="text-center"><span className="text-[10px] text-slate-500">Low</span><br /><span className="font-bold text-slate-800 text-sm">₹{p.low}</span></div>
                      <div className="text-center"><span className="text-[10px] text-slate-500">Average</span><br /><span className="font-bold text-slate-800 text-sm">₹{p.avg}</span></div>
                      <div className="text-center"><span className="text-[10px] text-slate-500">High</span><br /><span className="font-bold text-slate-800 text-sm">₹{p.high}</span></div>
                    </div>
                  </div>
                  <div className="mb-5 space-y-3">
                    {p.competitors.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BrandLogo name={c.name} />
                          <span className="font-bold text-slate-800 text-sm">₹{c.price}</span>
                        </div>
                        <Sparkline data={c.trend} color="#0ea5e9" width={60} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm">View Details</button>
                    <button className="flex-1 rounded-lg bg-[#2B86C5] py-2 text-xs font-bold text-white hover:bg-[#226fa3] shadow-sm">Quick Sync</button>
                  </div>
                  <p className="mt-3 text-center text-[10px] text-slate-400">10m ago</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB: COMPARE */}
          {activeTab === "compare" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500">Current Web Price</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Competitor Prices</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-xl shadow-sm">{p.image}</div>
                          <div>
                            <p className="font-bold text-slate-800 text-[13px]">{p.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Brand: {p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-block rounded-md bg-emerald-50 border border-emerald-100 px-4 py-1.5 text-[13px] font-bold text-emerald-600">₹{p.currentPrice}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-6">
                          {p.competitors.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <BrandLogo name={c.name} />
                              <span className="font-bold text-slate-800 text-[13px]">₹{c.price}</span>
                              <Sparkline data={c.trend} color="#0ea5e9" />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">View Details</button>
                          <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Quick Sync</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: PRICE ANALYSIS */}
          {activeTab === "analysis" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[1000px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-12 px-5 py-4"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Stock Status</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">Price Gap</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                      Competitor Prices
                      <span className="ml-3 inline-block rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">High Price Gap (+12% above market)</span>
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Actions</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-xl shadow-sm">{p.image}</div>
                          <div>
                            <p className="font-bold text-slate-800 text-[13px]">{p.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Brand: {p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><StockStatus status={p.stockStatus} /></td>
                      <td className="px-5 py-4"><PriceGapBadge value={p.priceGap} /></td>
                      <td className="px-5 py-4">
                        {i === 0 ? (
                           <div className="flex items-center gap-8">
                             <div><span className="text-[11px] text-slate-500">Low</span><br /><span className="font-bold text-slate-800">₹{p.low}</span></div>
                             <div><span className="text-[11px] text-slate-500">Average</span><br /><span className="font-bold text-slate-800">Avg: ₹{p.avg}</span></div>
                             <div><span className="text-[11px] text-slate-500">High</span><br /><span className="font-bold text-slate-800">₹{p.high}</span></div>
                           </div>
                         ) : (
                           <div className="flex items-center gap-6">
                             {p.competitors.map((c, idx) => (
                               <div key={idx} className="flex items-center gap-2">
                                 <BrandLogo name={c.name} />
                                 <span className="font-bold text-slate-800 text-[13px]">₹{c.price}</span>
                                 <Sparkline data={c.trend} color="#0ea5e9" />
                               </div>
                             ))}
                           </div>
                         )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">View Details</button>
                          <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Quick Sync</button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-[11px] text-slate-400">10m ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: PRODUCT OVERVIEW DASHBOARD */}
          {activeTab === "overview" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h2 className="mb-5 text-xl font-bold text-slate-800">Product Overview Dashboard</h2>
              <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                
                {/* Product Sidebar List */}
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm h-[600px] overflow-y-auto">
                  {mockProducts.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(i)}
                      className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-all ${
                        selectedProduct === i 
                        ? "bg-[#ebf5fb] ring-1 ring-[#2B86C5]/30" 
                        : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-2xl">{p.image}</span>
                      <div className="flex-1">
                        <p className={`font-bold text-[13px] ${selectedProduct === i ? 'text-[#1e6191]' : 'text-slate-800'}`}>{p.name}</p>
                        <p className={`text-[11px] mt-0.5 ${selectedProduct === i ? 'text-[#2B86C5]' : 'text-slate-500'}`}>Brand: {p.id}</p>
                      </div>
                      <Sparkline data={p.competitors[0]?.trend} width={35} height={15} color={selectedProduct === i ? "#2B86C5" : "#94a3b8"} />
                    </button>
                  ))}
                </div>

                {/* Main Dashboard Panel */}
                <div className="space-y-6">
                  {/* Summary Header Card */}
                  <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Current Price</p>
                        <p className="mt-1 text-2xl font-black text-slate-800">₹{product.low}</p>
                      </div>
                      <div className="h-10 w-px bg-slate-200"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Market Average</p>
                        <p className="mt-1 text-2xl font-black text-slate-800">₹{product.avg}</p>
                      </div>
                      <div className="h-10 w-px bg-slate-200"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Price Gap</p>
                        <PriceGapBadge value={product.priceGap} />
                      </div>
                      <div className="h-10 w-px bg-slate-200"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Stock Status</p>
                        <StockStatus status={product.stockStatus} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-3">
                        <button className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">View Details</button>
                        <button className="rounded-lg bg-[#2B86C5] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#226fa3]">Quick Sync</button>
                      </div>
                      <span className="text-[11px] text-slate-400">(Last Updated: 10m ago)</span>
                    </div>
                  </div>

                  {/* Charts Area */}
                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Main Historical Chart */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800">Historical Price Trends</h3>
                        <select className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm outline-none focus:border-blue-300">
                          <option>6 months</option>
                          <option>3 months</option>
                          <option>1 year</option>
                        </select>
                      </div>
                      <div className="h-[280px] w-full">
                        <MiniChart
                          data={historyData}
                          colors={["#0ea5e9", "#f59e0b", "#10b981"]}
                          labels={["Product Price", "Competitor Price", "Competitor Price"]}
                          legend
                          areaOpacity={0.15}
                        />
                      </div>
                    </div>

                    {/* Right Column Charts */}
                    <div className="flex flex-col gap-6">
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex-1">
                        <h3 className="mb-4 text-sm font-bold text-slate-800">Inventory Forecast</h3>
                        <div className="h-[120px]">
                          <BarChart
                            data={inventoryData}
                            colors={["#0ea5e9", "#10b981"]}
                            keys={["current", "predicted"]}
                            labels={["Current Stock", "Predicted Stock"]}
                          />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex-1">
                        <h3 className="mb-4 text-sm font-bold text-slate-800">Price Gap History</h3>
                        <div className="h-[100px]">
                          <MiniChart
                            data={[
                              { month: "Jan", gap: 20 },
                              { month: "Feb", gap: 10 },
                              { month: "Mar", gap: -2 },
                              { month: "Apr", gap: 8 },
                              { month: "May", gap: -12 },
                              { month: "Jun", gap: 2 },
                            ]}
                            colors={["#0ea5e9"]}
                            labels={["Price Gap %"]}
                            legend={false}
                            areaOpacity={0.1}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}