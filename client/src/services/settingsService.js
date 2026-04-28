import API from '../hooks/useApi';

export const fetchProfile = () =>
  API.get('/settings/profile').then((r) => r.data);

export const updateProfile = (phone) =>
  API.put('/settings/profile', { phone }).then((r) => r.data);

export const updatePassword = (newPassword) =>
  API.put('/settings/password', { newPassword }).then((r) => r.data);

export const fetchUsers = () =>
  API.get('/settings/users').then((r) => r.data);

export const addUser = (data) =>
  API.post('/settings/add-user', data).then((r) => r.data);

export const removeUser = (userId) =>
  API.delete(`/settings/users/${userId}`).then((r) => r.data);

export const fetchUsersLog = () =>
  API.get('/settings/users-log').then((r) => r.data);
