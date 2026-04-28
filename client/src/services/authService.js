import API from '../hooks/useApi';

export const loginUser = (email, password) =>
  API.post('/auth/login', { email, password }).then((r) => r.data);

export const signupUser = (form) =>
  API.post('/auth/signup', form).then((r) => r.data);

export const checkEmailAvailability = (email) =>
  API.get(`/auth/check-email?email=${encodeURIComponent(email)}`).then((r) => r.data);

export const checkCompanyNameAvailability = (companyName) =>
  API.get(`/auth/check-companyname?companyName=${encodeURIComponent(companyName)}`).then((r) => r.data);

export const fetchAllStores = () =>
  API.get('/auth/all-stores').then((r) => r.data);
