import { useState } from "react";

// --- MOCK DATA ---
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
  { month: "Jan", current: 80, predicted: 90 },
  { month: "Feb", current: 60, predicted: 75 },
  { month: "Mar", current: 90, predicted: 85 },
  { month: "Apr", current: 70, predicted: 80 },
  { month: "May", current: 50, predicted: 70 },
  { month: "Jun", current: 85, predicted: 95 },
  { month: "Jul", current: 75, predicted: 88 },
  { month: "Aug", current: 65, predicted: 80 },
];

const priceGapData = [
  { month: "Jan", gap: 20 },
  { month: "Feb", gap: 15 },
  { month: "Mar", gap: -5 },
  { month: "Apr", gap: 10 },
  { month: "May", gap: -15 },
  { month: "Jun", gap: 5 },
];

// --- HELPER COMPONENTS ---

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
  const usesGap = data[0].hasOwnProperty("gap");
  const activeKeys = usesGap ? ["gap"] : keys;
  
  const allVals = data.flatMap(d => activeKeys.map(k => d[k]));
  const min = Math.min(0, ...allVals); 
  const max = Math.max(...allVals) * 1.1;
  const range = max - min || 1;
  const getX = (i) => (i / (data.length - 1)) * width;
  const getY = (v) => height - ((v - min) / range) * height;

  return (
    <div className="w-full flex flex-col h-full">
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
      <div className="relative w-full flex-1">
        {usesGap && min < 0 && (
           <div className="absolute w-full border-t border-dashed border-slate-300" style={{ top: getY(0) }}></div>
        )}
        
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full preserve-3d block" preserveAspectRatio="none">
          {activeKeys.map((key, ki) => {
            const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(d[key])}`).join(" ");
            const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;
            
            return (
              <g key={key}>
                {areaOpacity > 0 && (
                  <path d={areaPath} fill={colors[ki]} fillOpacity={areaOpacity} />
                )}
                <path d={linePath} fill="none" stroke={colors[ki] || "#3b82f6"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function AreaChart({ data, width = 240, height = 90 }) {
  if (!data || data.length === 0) return null;
  const maxAbs = 30; 
  const midY = height / 2;
  const getX = (i) => (i / (data.length - 1)) * width;
  const getY = (v) => midY - (v / maxAbs) * midY;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(d.gap)}`).join(" ");
  const posPath = `M0 ${midY} ` + data.map((d, i) => `L${getX(i)} ${Math.min(getY(d.gap), midY)}`).join(" ") + ` L${width} ${midY} Z`;
  const negPath = `M0 ${midY} ` + data.map((d, i) => `L${getX(i)} ${Math.max(getY(d.gap), midY)}`).join(" ") + ` L${width} ${midY} Z`;
  const yLabels = [30, 20, 10, 0, -10, -20, -30];

  return (
    <div className="flex gap-2 h-full w-full">
      <div className="flex flex-col justify-between text-[9px] text-slate-400 pb-5">
        {yLabels.map(v => <span key={v}>{v}%</span>)}
      </div>
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full block" preserveAspectRatio="none">
          <path d={posPath} fill="rgba(220, 252, 231, 0.7)" />
          <path d={negPath} fill="rgba(254, 202, 202, 0.7)" />
          <line x1="0" y1={midY} x2={width} y2={midY} stroke="#d1d5db" strokeWidth="0.5" />
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
          {data.map((d, i) => (
            <circle key={i} cx={getX(i)} cy={getY(d.gap)} r="3" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
          ))}
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400 absolute w-full -bottom-5">
          {data.map(d => <span key={d.month}>{d.month}</span>)}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, width = 240, height = 120, colors, keys, labels }) {
  if (!data || data.length === 0) return null;
  const maxVal = 150; 
  const barGroupWidth = width / data.length;
  const barWidth = barGroupWidth / (keys.length + 1);
  const yTicks = [0, 50, 100, 150];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-3 flex flex-wrap gap-4">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
            {labels[i]}
          </span>
        ))}
      </div>
      <div className="flex gap-2 flex-1 pb-5">
        <div className="flex flex-col-reverse justify-between text-[10px] text-slate-400">
          {yTicks.map(v => <span key={v}>{v}</span>)}
        </div>
        <div className="flex-1 relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full block" preserveAspectRatio="none">
            {yTicks.map(v => (
              <line key={v} x1={0} y1={height - (v / maxVal) * height} x2={width} y2={height - (v / maxVal) * height} stroke="#f1f5f9" strokeWidth="1" />
            ))}
            {data.map((d, di) => (
              <g key={d.month}>
                {keys.map((k, ki) => {
                  const h = (Number(d[k]) / maxVal) * height;
                  return (
                    <rect
                      key={k}
                      x={di * barGroupWidth + ki * barWidth + barWidth * 0.5}
                      y={height - h}
                      width={barWidth * 0.7}
                      height={h}
                      fill={colors[ki]}
                      rx="1.5"
                    />
                  )
                })}
              </g>
            ))}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 absolute w-full -bottom-5 px-1">
            {data.map(d => <span key={d.month}>{d.month}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function SmartReports() {
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [activeTab, setActiveTab] = useState("Easy Gain");
  
  const product = mockProducts[selectedProduct];

  const reportTabs = [
    "Easy Gain", 
    "Clever Move", 
    "Non Competitors", 
    "Positive Trend", 
    "Neutral Trend", 
    "Negative Trend"
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans p-6 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Main entry animation for the whole page */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          <h2 className="mb-5 text-2xl font-bold text-slate-800">Smart Reports Overview</h2>
          
          {/* Tab Navigation Menu */}
          <div className="mb-8 flex flex-wrap gap-8 border-b border-slate-200">
            {reportTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-all duration-200 ease-in-out relative ${
                  activeTab === tab
                    ? "text-[#1e6191]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#2B86C5] rounded-t-md" />
                )}
              </button>
            ))}
          </div>
          
          {/* NEW: We wrap the layout grid in a div with key={activeTab}. 
            Every time the tab changes, React throws away the old div and 
            renders a new one, causing the Tailwind 'animate-in' classes to run again!
          */}
          <div key={activeTab} className="animate-in fade-in slide-in-from-right-1/2 duration-800 ease-in-out">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              
              {/* Left: Product Sidebar List */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm h-[600px] overflow-y-auto">
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

              {/* Right: Main Dashboard Panel */}
              <div className="space-y-6">
                
                {/* Summary Header Card */}
                <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
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
                      <button className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-100">View Details</button>
                      <button className="rounded-lg bg-[#2B86C5] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#226fa3]">Quick Sync</button>
                    </div>
                    <span className="text-[11px] text-slate-400">(Last Updated: 10m ago)</span>
                  </div>
                </div>

                {/* Charts Area */}
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  
                  {/* Main Historical Chart */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm flex flex-col min-h-[320px]">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-800">Historical Price Trends</h3>
                      <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm outline-none focus:border-blue-300">
                        <option>6 months</option>
                        <option>3 months</option>
                        <option>1 year</option>
                      </select>
                    </div>
                    <div className="flex-1 w-full relative">
                      <MiniChart
                        data={historyData}
                        width={500}
                        height={200}
                        colors={["#0ea5e9", "#f59e0b", "#10b981"]}
                        labels={["Product Price", "Competitor Price", "Competitor Price"]}
                        legend
                        areaOpacity={0.15}
                      />
                    </div>
                  </div>

                  {/* Right Column Charts */}
                  <div className="flex flex-col gap-6">
                    
                    {/* Inventory Forecast */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm flex-1 flex flex-col min-h-[220px]">
                      <h3 className="mb-4 text-sm font-bold text-slate-800">Inventory Forecast</h3>
                      <div className="flex-1 w-full relative">
                        <BarChart
                          data={inventoryData}
                          width={240}
                          height={120}
                          colors={["#3b82f6", "#10b981"]}
                          keys={["current", "predicted"]}
                          labels={["Current Stock", "Predicted Stock"]}
                        />
                      </div>
                    </div>

                    {/* Price Gap History */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm flex-1 flex flex-col min-h-[180px]">
                      <h3 className="mb-4 text-sm font-bold text-slate-800">Price Gap History</h3>
                      <div className="flex-1 w-full relative">
                        <AreaChart data={priceGapData} width={240} height={90} />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}