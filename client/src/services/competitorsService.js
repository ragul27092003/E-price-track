import API from '../hooks/useApi';

export const fetchCompetitors = () =>
  API.get('/competitors').then((r) => r.data);

/**
 * Fetch competitors from the global admin pool (plm_admin_competitor)
 * that have NOT yet been assigned to the current store.
 */
export const fetchAvailableCompetitors = () =>
  API.get('/competitors/available').then((r) => r.data);

/**
 * Assign a competitor from the global admin pool to the current store.
 * Marks it as selected (server-side) and adds it to this store's list.
 *
 * @param {string} slug - competitor slug, e.g. "amazon"
 */
export const assignCompetitor = (slug) =>
  API.post(`/competitors/assign/${slug}`).then((r) => r.data);

/**
 * Remove a competitor from the current store (super_admin only —
 * the server enforces this via roleCheck).
 */
export const deleteCompetitor = (id) =>
  API.delete(`/competitors/${id}`).then((r) => r.data);

export const createCompetitor = (data) =>
  API.post('/competitors', data).then((r) => r.data);

export const toggleCompetitorSync = (id, isActive) =>
  API.patch(`/competitors/${id}/toggle`, { isActive }).then((r) => r.data);

/**
 * Upload (or replace) a competitor logo.
 * Only callable by super_admin — the server enforces this via roleCheck.
 *
 * @param {string} slug  - competitor slug, e.g. "amazon"
 * @param {File}   file  - the image File object from an <input type="file">
 * @returns {Promise<{ logoUrl: string, slug: string, message: string }>}
 */
export const uploadCompetitorLogo = (slug, file) => {
  const form = new FormData();
  form.append('logo', file);
  return API.patch(`/competitors/${slug}/logo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};


export const fetchCompetitorProducts = ({
  page = 1,
  limit = 6,
  competitor,
  search,
  status,
} = {}) => {
  const params = new URLSearchParams();

  params.set("page", page);
  params.set("limit", limit);

  if (competitor) params.set("competitor", competitor);
  if (search) params.set("search", search);
  if (status && status !== "all") params.set("status", status);
  return API.get(`/competitors/products?${params}`).then((r) => r.data);
};