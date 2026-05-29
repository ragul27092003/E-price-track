import axios from 'axios';

// Decode JWT token to extract companyId without localStorage
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Auto-attach JWT token and x-tenant-id on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Super admin → activeStoreId from localStorage (switch பண்ணினது)
  // Store admin / user → companyId from JWT token decode
  const activeStoreId = localStorage.getItem('activeStoreId');
  const decoded       = token ? decodeToken(token) : null;
  const storeId       = activeStoreId || decoded?.cmpid;

  if (storeId) {
    config.headers['x-tenant-id'] = storeId;
  }

  return config;
});

// Auto logout when token is expired or invalid
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;