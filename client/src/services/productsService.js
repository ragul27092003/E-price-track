import API from '../hooks/useApi';

// competitorSlug is optional — passed when navigating from MarketCompetitor
// GET /api/products?competitor=amazon → backend filters products to those amazon sells
export const fetchProducts = (competitorSlug = null) => {
  const url = competitorSlug
    ? `/products?competitor=${competitorSlug}`
    : '/products';
  return API.get(url).then((r) => r.data);
};

export const createProduct = (data) =>
  API.post('/products', data).then((r) => r.data);

export const updateProduct = (id, data) =>
  API.put(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id) =>
  API.delete(`/products/${id}`).then((r) => r.data);

export const fetchAdminUsers = () =>
  API.get('/products/admin-users').then((r) => r.data);

export const configureProduct = (id, data) =>
  API.patch(`/products/${id}/configure`, data).then((r) => r.data);

export const removeProductConfiguration = (id) =>
  API.patch(`/products/${id}/remove-configuration`).then((r) => r.data);
