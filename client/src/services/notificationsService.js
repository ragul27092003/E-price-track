import API from '../hooks/useApi';

export const fetchAlertProducts = () =>
  API.get('/products/alert').then((r) => r.data);
