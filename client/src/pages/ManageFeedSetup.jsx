import { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  Storefront as StorefrontIcon,
  Language as LanguageIcon,
  InsertDriveFile as InsertDriveFileIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import API from '../hooks/useApi';

const ManageFeedSetup = () => {
  const activeStoreId = useStore((s) => s.activeStoreId);
  const userType = useStore((s) => s.user?.user_type);
  const isRestrictedUser = userType === 'user' || userType === 'store_admin';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const isSuperAdmin = userType === 'super_admin';

  const [formData, setFormData] = useState({
    store_name: '',
    cms_upload_type: 'none',
    feed_type: 'JSON',
    feed_url: '',
    shopify_name: '',
    shopify_accesstoken: '',
    schedule_info: 'Daily',
    import_time: '12:00 PM',
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await API.get('/feeds');
        const d = res.data || {};
        setFormData((prev) => ({
          ...prev,
          store_name: d.store_name || d.feed_name || '',
          cms_upload_type: d.cms_upload_type || 'none',
          feed_type: d.feed_type ? d.feed_type.toUpperCase() : 'JSON',
          feed_url: d.feed_url || '',
          shopify_name: d.shopify_name || '',
          shopify_accesstoken: d.shopify_accesstoken || '',
          schedule_info: d.schedule_info || 'Daily',
          import_time: d.import_time || '12:00 PM',
        }));
      } catch (err) {
        showSnack('Failed to load feed configuration', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
    loadActivityLog();
  }, [activeStoreId]);

  const loadActivityLog = async () => {
    setLogsLoading(true);
    try {
      const res = await API.get('/feeds/activity-log');
      setActivityLogs(res.data?.logs || []);
    } catch (err) {
      setActivityLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const showSnack = (msg, severity = 'success') => {
    setSnack({ open: true, msg, severity });
    setTimeout(() => setSnack({ open: false, msg: '', severity: 'success' }), 4000);
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCardSelect = (type) => {
    if (isRestrictedUser) return;
    setFormData((prev) => ({
      ...prev,
      cms_upload_type: prev.cms_upload_type === type ? 'none' : type,
    }));
  };

  const isShopify = formData.cms_upload_type === 'shopify';
  const isWordPress = formData.cms_upload_type === 'wordpress';

  const handleSave = async () => {
    if (isShopify) {
      if (!formData.shopify_name.trim() || !formData.shopify_accesstoken.trim()) {
        showSnack('Shopify Store Name and Access Token are required', 'error');
        return;
      }
    } else {
      if (!formData.feed_url.trim()) {
        showSnack('Feed URL is required', 'error');
        return;
      }
    }
    setIsSaving(true);
    try {
      await API.put('/feeds', {
        ...formData,
        feed_type: formData.feed_type.toLowerCase(),
      });
      showSnack('Configuration saved successfully');
      loadActivityLog();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Shared card shell so every section reads as a distinct, self-contained block
  const SectionCard = ({ children, className = '' }) => (
    <div
      className={`bg-white dark:bg-[#10162a] border border-gray-200 dark:border-slate-700/60 rounded-xl shadow-sm p-6 ${className}`}
    >
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full dark:bg-[#070b16] text-gray-800 dark:text-white font-sans space-y-6">

      {/* Page intro — sits outside the cards, sets context for the whole page */}
      <div>
        <h2 className="text-lg font-bold">Feed Setup</h2>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
          Please set the format, text encoding and upload product feed file for us to process.
        </p>
      </div>

      {/* CARD 1 — Feed Source selection */}
      <SectionCard>

        {/* Feed Name — styled as a status strip rather than plain label/value text */}
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-600/10 text-teal-600">
              <InsertDriveFileIcon fontSize="small" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-teal-700/70 dark:text-teal-400/70">
                Feed Name
              </p>
              <p className="text-base font-bold text-gray-800 dark:text-white leading-tight">
                {formData.store_name || 'Untitled feed'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-teal-600 text-white whitespace-nowrap">
            {isShopify ? 'Shopify' : isWordPress ? 'WordPress' : 'URL Feed'}
          </span>
        </div>

        <h3 className="text-md font-bold mb-1">Feed Source</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Choose how product data gets into your store.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* URL Feed Card */}
          <div
            onClick={() => handleCardSelect('none')}
            className={`relative p-4 border rounded-lg transition-all duration-200 ${isRestrictedUser ? 'cursor-not-allowed' : 'cursor-pointer'} ${
              (!isShopify && !isWordPress)
                ? 'border-teal-600 ring-2 ring-teal-600 ring-opacity-20 bg-teal-600/10'
                : 'border-gray-200 dark:border-slate-700 bg-transparent'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <InsertDriveFileIcon className={`text-4xl ${(!isShopify && !isWordPress) ? 'text-teal-500' : 'text-[#3b6eac]'}`} />
              <div className="flex-1">
                <h4 className="text-sm font-bold">URL Feed</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">Import a product feed via URL (CSV, XML, JSON).</p>
              </div>
              {(!isShopify && !isWordPress) && (
                <span className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Active</span>
              )}
            </div>
            <button
              disabled={isRestrictedUser}
              className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                isRestrictedUser
                  ? 'bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                  : (!isShopify && !isWordPress)
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-transparent border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151a2a]'
              }`}
            >
              {(!isShopify && !isWordPress) ? 'Selected' : 'Import'}
            </button>
          </div>

          {/* Shopify Card */}
          <div
            onClick={() => handleCardSelect('shopify')}
            className={`relative p-4 border rounded-lg transition-all duration-200 ${isRestrictedUser ? 'cursor-not-allowed' : 'cursor-pointer'} ${
              isShopify ? 'border-teal-600 ring-2 ring-teal-600 ring-opacity-20' : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <StorefrontIcon className="text-4xl text-[#96bf48]" />
              <div className="flex-1">
                <h4 className="text-sm font-bold">Shopify</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">Connect your Shopify store for automatic sync.</p>
              </div>
              {isShopify && (
                <span className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Active</span>
              )}
            </div>
            <button
              disabled={isRestrictedUser}
              className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                isRestrictedUser
                  ? 'bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                  : isShopify
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-transparent border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-[#151a2a]'
              }`}
            >
              {isShopify ? 'Connected' : 'Connect'}
            </button>
          </div>

          {/* WordPress Card */}
          <div
            onClick={() => handleCardSelect('wordpress')}
            className={`relative p-4 border rounded-lg transition-all duration-200 ${isRestrictedUser ? 'cursor-not-allowed' : 'cursor-pointer'} ${
              isWordPress ? 'border-teal-600 ring-2 ring-teal-600 ring-opacity-20' : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <LanguageIcon className="text-4xl text-[#21759b]" />
              <div className="flex-1">
                <h4 className="text-sm font-bold">WordPress</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">Link your WooCommerce store for seamless integration.</p>
              </div>
              {isWordPress && (
                <span className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Active</span>
              )}
            </div>
            <button
              disabled={isRestrictedUser}
              className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                isRestrictedUser
                  ? 'bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                  : isWordPress
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-transparent border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-[#151a2a]'
              }`}
            >
              {isWordPress ? 'Connected' : 'Connect'}
            </button>
          </div>

        </div>

      </SectionCard>

      {/* CARD 2 — Connection details (Shopify OR URL, depending on selection) */}
      <SectionCard>
        {isShopify ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold">Shopify Configuration</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Credentials used to pull products from your Shopify store.</p>
              </div>
              <button
                onClick={loadActivityLog}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                <SyncIcon fontSize="small" /> Get Products
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold mb-1">Shopify Store Name:</label>
                <input
                  name="shopify_name"
                  value={formData.shopify_name}
                  onChange={handleChange}
                  placeholder="e.g. my-store.myshopify.com"
                  className="bg-white dark:bg-[#1e2535] text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Shopify Access Token:</label>
                <input
                  name="shopify_accesstoken"
                  value={formData.shopify_accesstoken}
                  onChange={handleChange}
                  placeholder="shpat_xxxxxxxxxxxxxxxx"
                  className="bg-white dark:bg-[#1e2535] text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-bold">URL Feed Configuration</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Where we fetch your product feed from, and in what format.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold mb-1">Feed Format</label>
                <select
                  name="feed_type"
                  value={formData.feed_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-[#1e2535] text-gray-800 dark:text-slate-200"
                >
                  <option value="JSON">JSON</option>
                  <option value="CSV">CSV</option>
                  <option value="XML">XML</option>
                </select>
              </div>
              <div className="md:col-span-9">
                <label className="block text-xs font-bold mb-1">URL for Import</label>
                <input
                  name="feed_url"
                  value={formData.feed_url}
                  onChange={handleChange}
                  disabled={isRestrictedUser}
                  readOnly={isRestrictedUser}
                  onCopy={(e) => { if (isRestrictedUser) e.preventDefault(); }}
                  onCut={(e) => { if (isRestrictedUser) e.preventDefault(); }}
                  onContextMenu={(e) => { if (isRestrictedUser) e.preventDefault(); }}
                  style={isRestrictedUser ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                    isRestrictedUser
                      ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-white dark:bg-[#1e2535] text-gray-800 dark:text-slate-200 border-gray-300 dark:border-slate-700'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* CARD 3 — Import schedule + Save action */}
      <SectionCard>
        <h3 className="text-md font-bold mb-1">Import Schedule</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">How often we re-check the source and pull in new data.</p>

        <div className="max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Frequency</label>
              <select
                name="schedule_info"
                value={formData.schedule_info}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-[#1e2535] text-gray-800 dark:text-slate-200"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Hourly">Hourly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">At</label>
              <div className="relative">
                <AccessTimeIcon className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500 text-sm" />
                <input
                  name="import_time"
                  value={formData.import_time}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-[#151a2a] text-gray-800 dark:text-slate-200 rounded pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {!isRestrictedUser && (
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/60">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
            >
              {isSaving ? (
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
              ) : '→'} Save Configuration
            </button>
          </div>
        )}
      </SectionCard>

      {/* CARD 4 — Activity Log */}
      {isSuperAdmin && (
      <SectionCard>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-md font-bold">Activity Log</h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">Last sync attempts</p>
          </div>
          <button
            onClick={loadActivityLog}
            disabled={logsLoading}
            className="text-teal-600 hover:text-teal-800 text-xs font-medium flex items-center gap-1"
          >
            <SyncIcon fontSize="inherit" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[200px] border-t border-gray-100 dark:border-slate-700/60 scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-[#0f1420] z-10">
              <tr className="text-gray-500 dark:text-slate-400 text-xs uppercase font-bold">
                <th className="py-3 border-b border-gray-100 dark:border-slate-700/60">Date & Time</th>
                <th className="py-3 border-b border-gray-100 dark:border-slate-700/60">Status</th>
                <th className="py-3 border-b border-gray-100 dark:border-slate-700/60">Message</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logsLoading ? (
                <tr>
                  <td colSpan="3" className="py-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                  </td>
                </tr>
              ) : activityLogs.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-gray-400 dark:text-slate-500 italic">No activity logs found</td>
                </tr>
              ) : (
                activityLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#151a2a] transition-colors">
                    <td className="py-3 border-b border-gray-50 dark:border-slate-700/40 whitespace-nowrap">{log.date}</td>
                    <td className="py-3 border-b border-gray-50 dark:border-slate-700/40">
                      <div className="flex items-center gap-1.5">
                        {log.status === 'Success' ? (
                          <CheckCircleIcon className="text-[#2e7d32] !text-lg" />
                        ) : (
                          <CancelIcon className="text-[#d32f2f] !text-lg" />
                        )}
                        <span className={`font-medium ${log.status === 'Success' ? 'text-green-700' : 'text-red-700'}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 border-b border-gray-50 dark:border-slate-700/40 text-gray-600 dark:text-slate-400">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
      )}

      {/* Snackbar / Alert */}
      {snack.open && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 min-w-[300px] shadow-lg animate-bounceIn">
          <div className={`p-3 rounded-lg text-white text-sm flex justify-between items-center ${
            snack.severity === 'error' ? 'bg-red-600' : 'bg-teal-700'
          }`}>
            <span>{snack.msg}</span>
            <button onClick={() => setSnack({ ...snack, open: false })} className="ml-4 font-bold">×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageFeedSetup;