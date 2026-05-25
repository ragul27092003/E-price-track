import API from '../hooks/useApi';

export const fetchAlertProducts = (page = 1, limit = 9) =>
  API.get(`/products/alert?page=${page}&limit=${limit}`).then((r) => r.data);
