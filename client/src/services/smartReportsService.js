import API from '../hooks/useApi';

export const fetchSmartReportTabCounts = (refresh = false) => {
  const params = refresh ? '?refresh=1' : '';
  return API.get(`/smart-reports/tab-counts${params}`).then((r) => r.data);
};

export const fetchSmartReportProducts = ({
  tab,
  page = 1,
  limit = 50,
  search = '',
} = {}) => {
  const params = new URLSearchParams({ tab, page, limit });
  if (search.trim()) params.set('search', search.trim());
  return API.get(`/smart-reports?${params}`).then((r) => r.data);
};

export const fetchSmartReportProductDetail = (ean) =>
  API.get(`/smart-reports/product/${encodeURIComponent(ean)}`).then((r) => r.data);

export const exportSmartReportProducts = ({ tab, search = '' } = {}) => {
  const params = new URLSearchParams({ tab });
  if (search.trim()) params.set('search', search.trim());
  return API.get(`/smart-reports/export?${params}`).then((r) => r.data);
};
