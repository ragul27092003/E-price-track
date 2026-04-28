export default function ProductHistory() {
  // Static colors for the SVG illustration
  const mixiePink = "335 82% 72%";
  const mixiePinkDark = "337 72% 56%";
  const chromeTone = "210 16% 84%";
  const charcoalTone = "220 18% 18%";


  const stats = [
    { label: "Min Market Price", value: "₹3,997", icon: "trend", iconBg: "214 100% 97%", iconColor: "217 91% 50%" },
    { label: "Max Market Price", value: "₹4,359", icon: "bars", iconBg: "270 100% 97%", iconColor: "267 83% 60%" },
    { label: "Average Deviation", value: "₹150", icon: "pulse", iconBg: "214 100% 97%", iconColor: "217 91% 50%" },
  ];

  const chartDates = ["24/03/26", "25/03/26", "26/03/26", "27/03/26", "28/03/26", "29/03/26", "30/03/26", "31/03/26"];

  // Restored: All 16 retailers and their chart data
  const chartSeries = [
    { key: "sathya", name: "Sathya", color: "221 77% 33%", values: [2500, 2600, 2800, 3200, 3600, 3800, 3997, 4049] },
    { key: "sony", name: "Sony", color: "220 72% 51%", values: [2800, 2900, 3100, 3400, 3700, 3900, 4050, 4098] },
    { key: "lg", name: "LG", color: "358 72% 53%", values: [3100, 3200, 3300, 3500, 3750, 3950, 4080, 4142] },
    { key: "supreme", name: "Supreme Mobiles", color: "142 70% 41%", values: [2600, 2750, 2950, 3300, 3600, 3800, 3950, 3994] },
    { key: "poorvika", name: "Poorvika", color: "41 91% 43%", values: [3200, 3300, 3400, 3600, 3850, 4050, 4200, 4359] },
    { key: "sonovision", name: "Sonovision", color: "264 65% 57%", values: [2900, 3000, 3150, 3450, 3700, 3900, 4100, 4210] },
    { key: "bajaj", name: "Bajaj Electronics", color: "198 84% 48%", values: [2400, 2550, 2800, 3150, 3500, 3700, 3900, 3968] },
    { key: "darling", name: "Darling Retail", color: "272 67% 37%", values: [3300, 3400, 3500, 3700, 3900, 4100, 4250, 4308] },
    { key: "vasanth", name: "Vasanth Co", color: "141 66% 30%", values: [2300, 2500, 2700, 3050, 3400, 3600, 3800, 3875] },
    { key: "vijaysales", name: "Vijaysales", color: "0 71% 45%", values: [3000, 3150, 3350, 3600, 3850, 4050, 4200, 4265] },
    { key: "reliance", name: "RelianceDigital", color: "191 91% 42%", values: [2700, 2850, 3050, 3400, 3700, 3900, 4100, 4186] },
    { key: "flipkart", name: "Flipkart", color: "359 80% 54%", values: [2650, 2800, 3000, 3350, 3650, 3850, 3970, 4010] },
    { key: "croma", name: "Croma", color: "142 70% 39%", values: [2750, 2900, 3100, 3400, 3700, 3880, 4020, 4068] },
    { key: "amazon", name: "Amazon", color: "38 92% 50%", values: [2500, 2650, 2850, 3200, 3550, 3750, 3870, 3910] },
    { key: "nikshan", name: "Nikshan", color: "160 88% 32%", values: [2200, 2400, 2650, 3000, 3350, 3600, 3780, 3846] },
    { key: "myg", name: "MyG", color: "259 81% 60%", values: [2850, 3000, 3200, 3500, 3750, 3950, 4080, 4124] },
  ];

  // Restored: Your original CSS-based "logos"
  const tableRetailers = [
    { name: "SATHYA", bg: "4 82% 55%", fg: "0 0% 100%", icon: "🔥" },
    { name: "SONY", bg: "0 0% 13%", fg: "0 0% 100%", icon: null },
    { name: "LG", bg: "322 100% 33%", fg: "0 0% 100%", icon: null },
    { name: "supreme mobiles", bg: "142 70% 41%", fg: "0 0% 100%", icon: null },
    { name: "POORVIKA", bg: "345 82% 53%", fg: "0 0% 100%", icon: null },
    { name: "SONOVISION", bg: "0 0% 95%", fg: "220 20% 15%", icon: null },
  ];

  const tableRows = [
    { date: "2026-03-24", prices: ["₹ 3,997", "--", "--", "--", "₹ 3,998", "--"] },
    { date: "2026-03-25", prices: ["₹ 3,997", "--", "--", "--", "₹ 3,998", "--"] },
    { date: "2026-03-26", prices: ["₹ 3,997", "--", "--", "--", "₹ 3,998", "--"] },
    { date: "2026-03-27", prices: ["₹ 4,049", "--", "--", "--", "₹ 4,359", "--"] },
    { date: "2026-03-28", prices: ["₹ 4,049", "--", "--", "--", "₹ 4,359", "--"] },
    { date: "2026-03-29", prices: ["₹ 4,049", "--", "--", "--", "₹ 4,359", "--"] },
    { date: "2026-03-31", prices: ["₹ 4,049", "--", "--", "--", "₹ 4,359", "--"] },
  ];

  // Static chart calculations
  const chartMin = -500;
  const chartMax = 5000;
  const svgWidth = 760;
  const svgHeight = 250;
  const padding = { top: 12, right: 14, bottom: 60, left: 56 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;
  const yTicks = [-500, 0, 1000, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

  const getX = (index) => padding.left + (plotWidth / (chartDates.length - 1)) * index;
  const getY = (value) => padding.top + ((chartMax - value) / (chartMax - chartMin)) * plotHeight;
  const buildPath = (values) => {
    let path = "";
    values.forEach((value, index) => {
      if (value === null || value === undefined) return;
      const command = path === "" || values[index - 1] === null || values[index - 1] === undefined ? "M" : "L";
      path += `${command}${getX(index)} ${getY(value)} `;
    });
    return path.trim();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b101e] text-gray-900 dark:text-gray-100 font-sans pb-12 transition-colors duration-200">
      
      {/* Header Area */}
      <div className="bg-white dark:bg-[#151a2a] px-6 py-4 border-b border-gray-200 dark:border-[#262c3d] transition-colors duration-200">
        <div className="mx-auto max-w-[1280px]">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Manage Product History</h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6">
        
        {/* Filter Area */}
        <div className="flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Range</label>
            <select className="h-10 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0b101e] px-3 py-1 text-sm text-gray-700 dark:text-gray-200 outline-none hover:border-gray-400 dark:hover:border-gray-500 focus:ring-1 focus:ring-teal-500 transition-colors">
              <option>Last 30 Days</option>
              <option>Last 60 Days</option>
            </select>
          </div>

          <div className="flex flex-1 items-center gap-3 min-w-[280px]">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Search Product</label>
            <input
              type="text"
              placeholder="Enter product..."
              className="h-10 w-full max-w-md rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0b101e] px-3 py-1 text-sm text-gray-700 dark:text-gray-200 outline-none hover:border-gray-400 dark:hover:border-gray-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            />
          </div>

          <button
            type="button"
            className="ml-auto inline-flex h-10 items-center justify-center rounded bg-teal-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search
          </button>
        </div>

        {/* Middle Content */}
        <div className="flex flex-col gap-5">
          {/* Top 3 Stat Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((card) => (
              <div key={card.label} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] px-6 py-5 shadow-sm transition-colors duration-200">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-full dark:opacity-90" style={{ backgroundColor: `hsl(${card.iconBg})` }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={`hsl(${card.iconColor})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {card.icon === "trend" && <><path d="M5 7h10" /><path d="M9 11h6" /><path d="M13 15h2" /><path d="m15 9 4 4-4 4" /></>}
                    {card.icon === "bars" && <><path d="M5 19V9" /><path d="M10 19V5" /><path d="M15 19v-7" /><path d="M20 19V3" /></>}
                    {card.icon === "pulse" && <path d="M4 13h4l2-6 4 12 2-6h4" />}
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Grouped Product & Chart Container */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] shadow-sm flex flex-col transition-colors duration-200">
              
              {/* Dark Blue Header Matching the Design */}
              <div className="bg-[#2a4365] py-2 text-center border-b border-[#1e3a5f]">
                <span className="text-sm font-semibold text-white">Price History (Last 30 Days)</span>
              </div>

              <div className="flex flex-col md:flex-row p-4 flex-1">
                {/* Product Area */}
                <div className="w-[220px] flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-[#262c3d] pr-4 transition-colors">
                   <div className="mb-4 flex h-32 items-center justify-center w-full">
                    <svg viewBox="0 0 180 170" className="h-[120px] w-[120px]" aria-hidden="true">
                      <g transform="translate(22 14)">
                        <g transform="translate(14 6)">
                          <rect x="30" y="68" width="48" height="60" rx="18" fill={`hsl(${mixiePinkDark})`} />
                          <rect x="38" y="78" width="32" height="24" rx="8" fill={`hsl(${mixiePink})`} />
                          <circle cx="54" cy="108" r="11" fill="#ffffff" />
                          <circle cx="54" cy="108" r="4.5" fill={`hsl(${mixiePinkDark})`} />
                          <rect x="38" y="0" width="32" height="16" rx="8" fill={`hsl(${mixiePink})`} />
                          <rect x="42" y="14" width="24" height="56" rx="10" fill="#ffffff" stroke={`hsl(${chromeTone})`} strokeWidth="4" />
                          <path d="M67 25c12 1 16 17 8 30" fill="none" stroke={`hsl(${charcoalTone})`} strokeWidth="4" strokeLinecap="round" />
                        </g>
                      </g>
                    </svg>
                  </div>
                  <p className="text-center text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Preethi Mixie Galaxy (MG 225)
                  </p>
                  <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-1">(GALAXY)</p>
                  <p className="mt-3 text-center text-2xl font-bold text-gray-900 dark:text-white">₹4049</p>
                </div>

                {/* Chart Area */}
                <div className="flex-1 pl-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Price History (Last 30 Days)</span>
                    <div className="flex gap-2">
                        <button className="h-6 w-6 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs">&lt;</button>
                        <button className="h-6 w-6 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs">&gt;</button>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1.5">
                    {chartSeries.map((series) => (
                      <div key={series.key} className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: `hsl(${series.color})` }} />
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">{series.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="w-full flex-1 min-h-[220px]">
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-full w-full" aria-label="Static chart" preserveAspectRatio="none">
                      {yTicks.map((tick) => (
                          <g key={tick}>
                          <line x1={padding.left} y1={getY(tick)} x2={padding.left + plotWidth} y2={getY(tick)} className="stroke-gray-200 dark:stroke-[#262c3d]" strokeDasharray="4 4" />
                          <text x={padding.left - 10} y={getY(tick) + 4} textAnchor="end" fontSize="10" className="fill-gray-400 dark:fill-gray-500">{tick}</text>
                          </g>
                      ))}
                      {chartDates.map((label, index) => (
                          <g key={label}>
                          <line x1={getX(index)} y1={padding.top} x2={getX(index)} y2={padding.top + plotHeight} className="stroke-gray-200 dark:stroke-[#262c3d]" strokeDasharray="4 4" />
                          <text transform={`translate(${getX(index)}, ${padding.top + plotHeight + 25}) rotate(45)`} textAnchor="start" fontSize="10" className="fill-gray-400 dark:fill-gray-500">{label}</text>
                          </g>
                      ))}
                      {chartSeries.map((series) => (
                          <path key={series.key} d={buildPath(series.values)} fill="none" stroke={`hsl(${series.color})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      ))}
                      </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights Section */}
            <div className="rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] p-5 shadow-sm transition-colors duration-200">
              <h3 className="mb-5 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#262c3d] pb-2">Insights</h3>

              <div className="mb-4 rounded border border-gray-200 dark:border-[#262c3d] p-3 shadow-sm transition-colors">
                <p className="mb-2 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Lowest Price Alert</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-300">Sathya @ </span>
                    <span className="text-sm font-bold text-[#2a4365] dark:text-blue-400">₹3,997</span>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded border border-gray-200 dark:border-[#262c3d] p-3 shadow-sm transition-colors">
                <p className="mb-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400">Price Stability</p>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">High</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-white">92/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white dark:bg-gray-700">
                  <div className="h-full rounded-full bg-[#2a4365] dark:bg-blue-500 w-[92%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Static Table Section */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#262c3d] bg-white dark:bg-[#151a2a] shadow-sm mt-2 transition-colors duration-200">
            <table className="min-w-[900px] w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#262c3d] bg-gray-50 dark:bg-[#0b101e] transition-colors">
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-800 dark:text-gray-300 w-32">DATE</th>
                  {tableRetailers.map((retailer) => (
                    <th key={retailer.name} className="px-4 py-4 text-center">
                      {/* Restored: Rendering your exact CSS badges */}
                      <span
                        className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: `hsl(${retailer.bg})`, color: `hsl(${retailer.fg})` }}
                      >
                        {retailer.icon && <span>{retailer.icon}</span>}
                        {retailer.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr key={row.date} className={`${index === tableRows.length - 1 ? "" : "border-b border-gray-100 dark:border-[#262c3d]"} hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors`}>
                    <td className="px-5 py-4 text-xs font-semibold text-gray-800 dark:text-gray-300">{row.date}</td>
                    {row.prices.map((price, priceIndex) => (
                      <td key={`${row.date}-${priceIndex}`} className={`px-4 py-4 text-center text-xs ${price === "--" ? "text-gray-400 dark:text-gray-600" : "font-bold text-green-600 dark:text-green-400"}`}>
                        {price}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}