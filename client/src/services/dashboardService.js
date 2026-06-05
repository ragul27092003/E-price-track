import API from '../hooks/useApi';

export const fetchSapUpdateStatus = () =>
  API.get('/dashboard/sap-status').then((r) => r.data);

export const fetchOverallStatistics = () =>
  API.get('/dashboard/overall-statistics').then((r) => r.data);

export const fetchRankAnalysis = () =>
  API.get('/dashboard/rank-analysis').then((r) => r.data);

export const fetchBrandAnalyticsBrands = () =>
  API.get('/dashboard/brand-analytics/brands').then((r) => r.data);

export const fetchBrandAnalytics = (brand, category) => {
  const params = new URLSearchParams({ brand });
  if (category) params.set('category', category);
  return API.get(`/dashboard/brand-analytics?${params}`).then((r) => r.data);
};
export const fetchCompetitorCountsData = () =>
  API.get('/dashboard/competitor-counts').then((r) => r.data);