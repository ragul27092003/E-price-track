import API from '../hooks/useApi';

export const fetchCompetitors = () =>
  API.get('/competitors').then((r) => r.data);

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
