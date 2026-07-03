import API from '../hooks/useApi';

export const fetchAlertProducts = (page = 1, limit = 9,search = "") =>
  API.get(`/products/alert?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`).then((r) => r.data);
