import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { fetchCompetitors } from '../services/competitorsService';

// ─── Single competitor row ────────────────────────────────────────────────────
const CompetitorRow = ({ data, onClick }) => {
  const isNegDelta = String(data.avgPriceDelta).includes('-');
  const isOffline = !data.isActive;

  return (
    <div className="group relative">
      <div
        onClick={() => !isOffline && onClick(data)}
        className={`flex flex-col sm:flex-row sm:items-center p-4 border rounded-lg mb-3 transition-all duration-150 shadow-sm gap-3 sm:gap-0
          ${isOffline 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
            : 'bg-white border-blue-200 cursor-pointer hover:shadow-md hover:bg-blue-50'
          }`}
      >
        {/* Logo + Name */}
        <div className="flex items-center gap-4 w-full sm:w-[45%]">
          <div 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
            style={{ backgroundColor: data.color || '#475e77' }}
          >
            {data.logo ? (
              <img
                src={`http://localhost:5100${data.logo}`}
                alt={data.name}
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="text-[12px] font-bold text-white uppercase">
                {data.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-bold truncate ${isOffline ? 'text-gray-400' : 'text-gray-800'}`}>
              {data.name}
            </span>
            {isOffline ? (
              <span className="mt-0.5 w-fit bg-gray-200 text-gray-500 rounded px-1.5 py-0.5 text-[9px] font-black uppercase">
                Offline
              </span>
            ) : (
              <span className="sm:hidden text-[10px] text-blue-500 font-medium">Tap to view products</span>
            )}
          </div>
        </div>

        {/* Info Container for Mobile Layout */}
        <div className="flex items-center justify-between sm:contents w-full border-t sm:border-none pt-2 sm:pt-0">
          
          {/* Avg Price Delta */}
          <div className="sm:w-[20%] flex flex-col sm:block">
            <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Avg Delta</span>
            <span className={`text-sm font-black ${
              isOffline ? 'text-gray-300' : isNegDelta ? 'text-red-600' : 'text-green-600'
            }`}>
              {isNegDelta ? '▼' : '▲'} {data.avgPriceDelta || '+0.0%'}
            </span>
          </div>

          {/* Products Tracked */}
          <div className="sm:w-[20%] flex flex-col sm:block text-right sm:text-left">
            <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Tracking</span>
            <span className={`text-sm font-bold sm:font-medium ${isOffline ? 'text-gray-300' : 'text-gray-800'}`}>
              {data.productsTracked ?? 0} <span className="text-[10px] sm:text-sm uppercase sm:normal-case">Items</span>
            </span>
          </div>

          {/* Arrow hint (Desktop only) */}
          <div className="hidden sm:flex sm:w-[15%] justify-end pr-2">
            {!isOffline && (
              <span className="text-blue-300 text-xl font-light group-hover:translate-x-1 transition-transform">›</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const MarketCompetitor = () => {
  const navigate = useNavigate();
  const competitors = useStore((s) => s.competitors);
  const setCompetitors = useStore((s) => s.setCompetitors);
  const competitorsLoading = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const activeStoreId = useStore((s) => s.activeStoreId);

  const load = async () => {
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

  useEffect(() => { load(); }, [activeStoreId]);

  const handleCompetitorClick = (comp) => {
    navigate(`/products?competitor=${comp.slug}&name=${encodeURIComponent(comp.name)}`);
  };

  if (competitorsLoading) {
    return (
      <div className="flex justify-center p-20 bg-white min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-white min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-[1000px] h-fit border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-[#475e77] text-white p-4 px-5">
          <h2 className="text-xs sm:text-sm font-bold">
            Competitor Listings <span className="hidden sm:inline">— Click a competitor to view their products</span>
          </h2>
        </div>
        
        {/* Table Headings - Hidden on mobile, shown on SM+ screens */}
        <div className="hidden sm:flex px-8 pt-5 pb-2 bg-[#f8fafd] border-b border-gray-100">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest w-[45%]">Competitor</span>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%]">Avg. Price Delta</span>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%]">Products Tracked</span>
          <span className="w-[15%]" />
        </div>

        {/* Competitor Rows Container */}
        <div className="p-3 sm:p-6 bg-[#f8fafd]">
          {competitors.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 italic">
              No competitors found.
            </div>
          ) : (
            competitors.map((item) => (
              <CompetitorRow key={item.id} data={item} onClick={handleCompetitorClick} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketCompetitor;