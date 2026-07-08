import API from '../hooks/useApi';

export const fetchProfile = () =>
  API.get('/settings/profile').then((r) => r.data);

export const updateProfile = (mobile_number) =>
  API.put('/settings/profile', { mobile_number }).then((r) => r.data);

export const updatePassword = (newPassword) =>
  API.put('/settings/password', { newPassword }).then((r) => r.data);

/**
 * Upload a store logo to Cloudinary via the server.
 * Replaces the old base64 approach — sends the raw File, gets back a
 * permanent Cloudinary URL that is stored in the Company collection.
 *
 * @param {File} file - the image File object from <input type="file">
 * @returns {Promise<{ logoUrl: string, message: string }>}
 */
export const uploadStoreLogo = (file) => {
  const form = new FormData();
  form.append('logo', file);
  return API.post('/settings/logo-upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

// Kept for any direct URL updates (e.g. clearing the logo)
export const updateLogo = (logoUrl) =>
  API.put('/settings/logo', { logoUrl }).then((r) => r.data);

export const fetchUsers = () =>
  API.get('/settings/users').then((r) => r.data);

export const addUser = (data) =>
  API.post('/settings/add-user', data).then((r) => r.data);

export const removeUser = (user_id) =>
  API.delete(`/settings/users/${user_id}`).then((r) => r.data);

export const fetchUsersLog = ({ userId, start, end, page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  if (userId && userId !== 'all') params.user_id = userId;
  if (start) params.start = start;
  if (end) params.end = end;
  return API.get('/settings/users-log', { params }).then((r) => r.data);
};

export const fetchLogFilterUsers = () =>
  API.get('/settings/log-users').then((r) => r.data);