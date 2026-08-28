import API from '../hooks/useApi';

export const loginUser = (email, password) =>
  API.post('/auth/login', { email, password }).then((r) => r.data);

export const logoutUser = () =>
  API.post('/auth/logout').catch(() => {});

export const signupUser = (form) =>
  API.post('/auth/signup', form).then((r) => r.data);

export const checkEmailAvailability = (email) =>
  API.get(`/auth/check-email?email=${encodeURIComponent(email)}`).then((r) => r.data);

export const checkCompanyNameAvailability = (companyName) =>
  API.get(`/auth/check-companyname?companyName=${encodeURIComponent(companyName)}`).then((r) => r.data);

export const fetchAllStores = () =>
  API.get('/auth/all-stores').then((r) => r.data);

export const getMerchant = (companyId) =>
  API.get(`/auth/merchant/${companyId}`).then((r) => r.data);

export const requestPasswordOtp = (email) =>
  API.post('/auth/forgot-password', { email }).then((r) => r.data);

export const verifyPasswordOtp = (email, otp) =>
  API.post('/auth/verify-otp', { email, otp }).then((r) => r.data);

export const resetPasswordWithToken = (resetToken, newPassword) =>
  API.post('/auth/reset-password', { resetToken, newPassword }).then((r) => r.data);
