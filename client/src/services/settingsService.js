import API from '../hooks/useApi';

export const fetchProfile = () =>
  API.get('/settings/profile').then((r) => r.data);

export const updateProfile = (mobile_number) =>
  API.put('/settings/profile', { mobile_number }).then((r) => r.data);

export const updatePassword = (newPassword) =>
  API.put('/settings/password', { newPassword }).then((r) => r.data);

export const updateLogo = (logoUrl) =>
  API.put('/settings/logo', { logoUrl }).then((r) => r.data);

export const fetchUsers = () =>
  API.get('/settings/users').then((r) => r.data);

export const addUser = (data) =>
  API.post('/settings/add-user', data).then((r) => r.data);

export const removeUser = (user_id) =>
  API.delete(`/settings/users/${user_id}`).then((r) => r.data);

export const fetchUsersLog = () =>
  API.get('/settings/users-log').then((r) => r.data);
