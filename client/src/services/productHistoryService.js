import API from '../hooks/useApi';

// GET /api/product-history/:ean
// Returns: { product, dates, series, stats, tableData, insights }
export const fetchProductHistory = (ean) =>
  API.get(`/product-history/${ean}`).then((r) => r.data);
