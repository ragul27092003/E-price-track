import API from '../hooks/useApi';

export const fetchProducts = () =>
  API.get('/products').then((r) => r.data);

export const createProduct = (data) =>
  API.post('/products', data).then((r) => r.data);

export const updateProduct = (id, data) =>
  API.put(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id) =>
  API.delete(`/products/${id}`).then((r) => r.data);
