import { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

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
  }, []);

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

  const handleCardSelect = (type) =>
    setFormData((prev) => ({
      ...prev,
      cms_upload_type: prev.cms_upload_type === type ? 'none' : type,
    }));

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

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full bg-white text-gray-800 font-sans">
      {/* Description */}
      <p className="text-sm text-gray-600 mb-6">
        Please set the format, text encoding and upload product feed file for us to process.
      </p>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Shopify Card */}
        <div 
          onClick={() => handleCardSelect('shopify')}
          className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
            isShopify ? 'border-teal-600 ring-2 ring-teal-600 ring-opacity-20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-4 mb-3">
            <StorefrontIcon className="text-4xl text-[#96bf48]" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">Shopify</h4>
              <p className="text-xs text-gray-500 leading-tight">Connect your Shopify store for automatic sync.</p>
            </div>
            {isShopify && (
              <span className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Active</span>
            )}
          </div>
          <button 
            className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
              isShopify ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isShopify ? 'Connected' : 'Connect'}
          </button>
        </div>

        {/* WordPress Card */}
        <div 
          onClick={() => handleCardSelect('wordpress')}
          className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
            isWordPress ? 'border-teal-600 ring-2 ring-teal-600 ring-opacity-20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-4 mb-3">
            <LanguageIcon className="text-4xl text-[#21759b]" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">WordPress</h4>
              <p className="text-xs text-gray-500 leading-tight">Link your WooCommerce store for seamless integration.</p>
            </div>
            {isWordPress && (
              <span className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Active</span>
            )}
          </div>
          <button 
            className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
              isWordPress ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isWordPress ? 'Connected' : 'Connect'}
          </button>
        </div>

        {/* URL Feed Card */}
        <div 
          onClick={() => handleCardSelect('none')}
          className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
            (!isShopify && !isWordPress) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-4 mb-3">
            <InsertDriveFileIcon className="text-4xl text-[#3b6eac]" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">URL Feed</h4>
              <p className="text-xs text-gray-500 leading-tight">Import a product feed via URL (CSV, XML, JSON).</p>
            </div>
            {(!isShopify && !isWordPress) && (
              <span className="bg-[#3b6eac] text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Active</span>
            )}
          </div>
          <button className="w-full py-1.5 bg-[#3b6eac] hover:bg-[#2d5a8e] text-white rounded text-sm font-medium transition-colors">
            Import
          </button>
        </div>
      </div>

      {/* Feed Name */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-gray-600 min-w-[110px]">Feed Name:</span>
        <span className="text-base font-semibold text-red-600">{formData.store_name || '—'}</span>
      </div>

      {/* Shopify Configuration Section */}
      {isShopify && (
        <div className="mb-6 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold">Shopify Configuration</h3>
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
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Shopify Access Token:</label>
              <input 
                name="shopify_accesstoken"
                value={formData.shopify_accesstoken}
                onChange={handleChange}
                placeholder="shpat_xxxxxxxxxxxxxxxx"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* URL / Schedule Section */}
      {!isShopify && (
        <div className="mb-6 space-y-4">
          <h3 className="text-md font-bold">URL Feed Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold mb-1">Feed Format</label>
              <select 
                name="feed_type" 
                value={formData.feed_type} 
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
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
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Common Import Schedule Section */}
      <div className="mb-6 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Import Schedule</label>
            <select 
              name="schedule_info" 
              value={formData.schedule_info} 
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Hourly">Hourly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs invisible mb-1">At</label>
            <div className="relative">
              <AccessTimeIcon className="absolute left-3 top-2.5 text-gray-400 text-sm" />
              <input 
                name="import_time"
                value={formData.import_time}
                onChange={handleChange}
                className="w-full border border-gray-300 bg-gray-50 rounded pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 mb-10">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
        >
          {isSaving ? (
            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
          ) : '→'} Save
        </button>
      </div>

      {/* Activity Log */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-md font-bold">Activity Log</h3>
            <p className="text-[11px] text-gray-500">Last sync attempts</p>
          </div>
          <button 
            onClick={loadActivityLog} 
            disabled={logsLoading}
            className="text-teal-600 hover:text-teal-800 text-xs font-medium flex items-center gap-1"
          >
            <SyncIcon fontSize="inherit" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs uppercase font-bold">
                <th className="py-3 border-b border-gray-100">Date & Time</th>
                <th className="py-3 border-b border-gray-100">Status</th>
                <th className="py-3 border-b border-gray-100">Message</th>
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
                  <td colSpan="3" className="py-8 text-center text-gray-400 italic">No activity logs found</td>
                </tr>
              ) : (
                activityLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 border-b border-gray-50 whitespace-nowrap">{log.date}</td>
                    <td className="py-3 border-b border-gray-50">
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
                    <td className="py-3 border-b border-gray-50 text-gray-600">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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