import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { fetchCompetitors, createCompetitor, toggleCompetitorSync } from '../services/competitorsService';

// --- Re-adding your original SVG logic ---
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);

const AutorenewIcon = ({ className }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);

const generateTrend = (seed, delta) => {
  const base = (seed || 20) % 50 || 20;
  const isNeg = String(delta || '').includes('-');
  return Array.from({ length: 7 }, (_, i) => {
    const noise = (((seed || 1) * (i + 3)) % 15) - 7;
    const trend = isNeg ? -i * 0.6 : i * 0.6;
    return Math.max(5, Math.min(95, base + noise + trend));
  });
};

const Sparkline = ({ productsTracked, avgPriceDelta }) => {
  const points = generateTrend(productsTracked, avgPriceDelta);
  const w = 100, h = 30;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `M ${coords[0]} L ${coords.join(' L ')} L ${w},${h} L 0,${h} Z`;
  const isNeg = String(avgPriceDelta || '').includes('-');
  const line = isNeg ? '#ef5350' : '#1976d2';
  const fill = isNeg ? '#ffebee' : '#e3f2fd';

  return (
    <div className="w-[120px] h-[35px] flex items-end">
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={areaD} fill={fill} fillOpacity="0.6" />
        <path d={pathD} fill="none" stroke={line} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const CompetitorRow = ({ data, onToggleSync }) => {
  const [isActive, setIsActive] = useState(data?.isActive || false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (data) setIsActive(data.isActive);
  }, [data?.isActive]);

  const handleToggle = async () => {
    const newValue = !isActive;
    setIsActive(newValue);
    setIsSyncing(true);
    await onToggleSync(data.id, newValue);
    setIsSyncing(false);
  };

  if (!data) return null;
  const isNegDelta = String(data.avgPriceDelta || '').includes('-');
  const safeName = data.name || 'Unknown';

  return (
    <div className="flex flex-col md:flex-row md:items-center p-4 border border-blue-200 rounded-lg mb-3 bg-white hover:shadow-sm transition-shadow gap-3 md:gap-0">
      {/* Name & Logo */}
      <div className="flex items-center gap-3 w-full md:w-[20%]">
        <div className="w-10 h-10 rounded border border-gray-100 flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: data.color || '#475e77' }}>
          {data.logo ? <img src={`http://localhost:5100${data.logo}`} className="w-full h-full object-contain" /> : <span className="text-[10px] font-bold text-white uppercase">{safeName.substring(0, 2)}</span>}
        </div>
        <span className="text-sm font-medium text-gray-800 truncate">{safeName}</span>
      </div>

      {/* Status */}
      <div className="w-full md:w-[20%] flex justify-between md:block">
        <span className="md:hidden text-[11px] font-bold text-gray-400 uppercase">Status</span>
        <div>
          {isSyncing ? (
            <div className="flex items-center gap-1 text-blue-600 font-bold text-sm md:justify-start">
              <span>Syncing...</span>
              <AutorenewIcon className="animate-spin" />
            </div>
          ) : isActive ? (
            <span className="text-green-600 font-bold text-sm">● Online</span>
          ) : (
            <span className="text-gray-400 font-bold text-sm">○ Offline</span>
          )}
          <p className="text-[11px] text-gray-500 mt-0.5">{data.lastSync || 'Never'}</p>
        </div>
      </div>

      {/* Delta */}
      <div className="w-full md:w-[15%] flex justify-between md:block">
        <span className="md:hidden text-[11px] font-bold text-gray-400 uppercase">Avg Delta</span>
        <span className={`text-sm font-bold ${isNegDelta ? 'text-red-600' : 'text-green-600'}`}>
          {isNegDelta ? '▼' : '▲'} {data.avgPriceDelta || '+0.0%'}
        </span>
      </div>

      {/* Tracked */}
      <div className="w-full md:w-[15%] flex justify-between md:block">
        <span className="md:hidden text-[11px] font-bold text-gray-400 uppercase">Tracked</span>
        <div className="text-sm font-medium text-gray-800">{data.productsTracked ?? 0}</div>
      </div>

      {/* Trend */}
      <div className="w-full md:w-[20%] flex justify-between items-center md:block">
        <span className="md:hidden text-[11px] font-bold text-gray-400 uppercase">7-Day Trend</span>
        <Sparkline productsTracked={data.productsTracked} avgPriceDelta={data.avgPriceDelta} />
      </div>

      {/* Activation */}
      <div className="w-full md:w-[10%] flex justify-between md:justify-end items-center">
        <span className="md:hidden text-[11px] font-bold text-gray-400 uppercase">Activation</span>
        <button
          onClick={handleToggle}
          disabled={isSyncing}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'} ${isSyncing ? 'opacity-50' : 'cursor-pointer'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
};

const CompetitorSection = ({ title, items = [], onToggleSync }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden mb-8 shadow-sm">
    <div className="bg-[#475e77] text-white px-5 py-3">
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
    <div className="bg-[#f8fafd] p-4 md:p-5">
        {/* Desktop Header - Only visible on MD+ screens */}
        <div className="hidden md:flex px-4 mb-3">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[20%]">Competitor</span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[20%]">Status & Last Sync</span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[15%]">Avg. Price Delta</span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[15%]">Products Tracked</span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[20%]">7-Day Trend</span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[10%] text-right">Activation</span>
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No competitors found.</div>
        ) : (
          items.map((item) => <CompetitorRow key={item.id} data={item} onToggleSync={onToggleSync} />)
        )}
    </div>
  </div>
);

const Competitors = () => {
  const competitors = useStore((s) => s.competitors);
  const setCompetitors = useStore((s) => s.setCompetitors);
  const addCompetitor = useStore((s) => s.addCompetitor);
  const toggleCompetitor = useStore((s) => s.toggleCompetitor);
  const competitorsLoading = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const activeStoreId = useStore((s) => s.activeStoreId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: '', website: '', searchUrl: '', color: '#000000', mappingType: 'EAN',
  });

  const loadCompetitors = async () => {
    setCompetitorsLoading(true);
    try {
      const data = await fetchCompetitors();
      setCompetitors(data || []);
    } catch (err) { console.error(err); } 
    finally { setCompetitorsLoading(false); }
  };

  useEffect(() => { loadCompetitors(); }, [activeStoreId]);

  const handleToggleSync = async (id, isActive) => {
    try {
      await toggleCompetitorSync(id, isActive);
      toggleCompetitor(id, isActive);
    } catch (err) { console.error(err); }
  };

  const handleSaveCompetitor = async () => {
    if (!newCompetitor.name.trim()) return;
    try {
      const data = await createCompetitor(newCompetitor);
      addCompetitor(data);
      setIsModalOpen(false);
      setNewCompetitor({ name: '', website: '', searchUrl: '', color: '#000000', mappingType: 'EAN' });
    } catch (err) { console.error(err); }
  };

  const filtered = (competitors || []).filter((c) =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const eanList = filtered.filter((c) => c.mappingType === 'EAN');
  const nonEanList = filtered.filter((c) => c.mappingType === 'NON_EAN');

  if (competitorsLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#475e77]"></div></div>;
  }

  return (
    <div className="p-3 md:p-8 bg-white min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-8">
        <div className="relative w-full sm:w-[300px]">
          <div className="absolute left-3 top-2.5 text-gray-300"><SearchIcon /></div>
          <input
            type="text"
            placeholder="Search competitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#475e77] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#36495c]"
        >
          New Competitor
        </button>
      </div>

      {eanList.length > 0 && <CompetitorSection title="EAN Based Competitor Listings" items={eanList} onToggleSync={handleToggleSync} />}
      {nonEanList.length > 0 && <CompetitorSection title="NON EAN Based Competitor Listings" items={nonEanList} onToggleSync={handleToggleSync} />}

      {/* Original Modal Design */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Add Competitor</h2></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Competitor Name</label>
                <input className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" value={newCompetitor.name} onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Website</label>
                <input className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" value={newCompetitor.website} onChange={(e) => setNewCompetitor({ ...newCompetitor, website: e.target.value })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Search URL</label>
                <input className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" value={newCompetitor.searchUrl} onChange={(e) => setNewCompetitor({ ...newCompetitor, searchUrl: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 bg-gray-500 text-white rounded text-sm">Close</button>
              <button onClick={handleSaveCompetitor} className="px-5 py-2 bg-green-600 text-white rounded text-sm">Save Competitor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competitors;