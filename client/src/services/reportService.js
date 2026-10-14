import API from '../hooks/useApi';

export const fetchReportPageData = () =>
  API.get('/report/product-data').then((r) => r.data);

export const fetchUsersNotificationData = () =>
  API.get('/report/user-notifications').then((r) => r.data);

export const fetchRandomProduct = () =>
  API.get('/report/RandomProduct').then((r) => r.data);