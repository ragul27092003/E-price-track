import { useState } from "react";

// --- MOCK DATA ---
const mockProducts = [
  { id: 50099, name: "Name & ID 50099", brand: "Brand", image: "📱", stockStatus: "In Stock", priceGap: -4.5, brandStatus: "Low Stock", competitors: [{ name: "F", icon: "🛒", price: 909, trend: [20, 40, 30, 50, 40] }, { name: "A", icon: "📦", price: 1134, trend: [10, 20, 15, 25, 20] }, { name: "C", icon: "🏪", price: 1359, trend: [30, 45, 40, 55, 50] }], low: 909, avg: 1134, high: 1359 },
  { id: 50092, name: "Name & ID 50092", brand: "Brand", image: "📱", stockStatus: "In Stock", priceGap: -1.2, brandStatus: "Low Stock", competitors: [{ name: "F", icon: "🛒", price: 759, trend: [20, 40, 60] }, { name: "A", icon: "📦", price: 749, trend: [10, 30, 50] }], low: 749, avg: 754, high: 759 },
  { id: 50093, name: "Name & ID 50093", brand: "Brand", image: "💻", stockStatus: "In Stock", priceGap: -1.2, brandStatus: "Low Stock", competitors: [{ name: "F", icon: "🛒", price: 779, trend: [20, 40, 60] }, { name: "C", icon: "🏪", price: 799, trend: [10, 30, 50] }], low: 779, avg: 789, high: 799 },
  { id: 50004, name: "Name & ID 50004", brand: "Brand", image: "💻", stockStatus: "In Stock", priceGap: -1.2, brandStatus: "Low Stock", competitors: [{ name: "A", icon: "📦", price: 799, trend: [10, 30, 50] }], low: 399, avg: 599, high: 799 },
  { id: 50005, name: "Name & ID 50005", brand: "Brand", image: "📱", stockStatus: "In Stock", priceGap: -1.2, brandStatus: "Low Stock", competitors: [{ name: "F", icon: "🛒", price: 799, trend: [20, 40, 60] }], low: 250, avg: 524, high: 799 },
  { id: 50002, name: "Name & ID 50002", brand: "Brand", image: "🎧", stockStatus: "In Stock", priceGap: -1.5, brandStatus: "Low Stock", competitors: [{ name: "A", icon: "📦", price: 799, trend: [10, 30, 50] }], low: 250, avg: 524, high: 799 },
];

function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const width = 60;
  const height = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Notifications() {
  const [search, setSearch] = useState("");

  const filtered = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <span className="absolute left-4 top-2.5 text-slate-400">🔍</span>
          </div>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-blue-100 bg-gray-50 p-6 shadow-sm transition-all hover:shadow-md">
              
              {/* Product Info Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-2xl">
                  {p.image}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{p.name}</h3>
                  <p className="text-sm text-slate-400 font-medium">{p.brand}</p>
                </div>
              </div>

              {/* Status Rows */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Stock Status</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-700">{p.stockStatus}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Price Gap</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700 text-xs">
                    {p.priceGap}% below market
                  </span>
                </div>

                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Brand Status</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    <span className="font-semibold text-slate-700">{p.brandStatus}</span>
                  </div>
                </div>
              </div>
              
              {/* Competitor Price Summary Section */}
              <div className="mb-4">
                <h4 className="text-[14px] font-bold text-slate-800 mb-3">Competitor Prices</h4>
                <div className="flex justify-between text-[11px] mb-4">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-medium mb-1">Low</span>
                    <span className="font-bold text-slate-800 text-sm">₹{p.low}</span>
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="text-slate-400 font-medium mb-1">Average</span>
                    <span className="font-bold text-slate-800 text-sm">Avg: ₹{p.avg}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 font-medium mb-1">High</span>
                    <span className="font-bold text-slate-800 text-sm">₹{p.high}</span>
                  </div>
                </div>
              </div>

              {/* Competitor Detail Rows */}
              <div className="space-y-4 mb-8">
                {p.competitors.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg opacity-80">{c.icon}</span>
                      <span className="font-bold text-slate-700 text-[14px]">₹{c.price}</span>
                    </div>
                    <Sparkline data={c.trend} />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-auto pt-4 border-t border-slate-50 flex gap-3">
                <button className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50">
                  View Details
                </button>
                <button className="flex-1 rounded-xl bg-[#0ea5a9] py-3 text-xs font-bold text-white transition-colors hover:bg-[#0d9488]">
                  Quick Sync
                </button>
              </div>

              <p className="mt-4 text-center text-[10px] font-semibold text-slate-400">
                10m ago
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}