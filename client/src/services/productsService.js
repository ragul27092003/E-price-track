import API from '../hooks/useApi';

// Paginated product fetch — all filter params are optional
export const fetchProducts = ({
  page = 1, limit = 5,
  competitorSlug = null,
  search, brand, category, rank, itemGroup,
} = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (competitorSlug) params.set('competitor', competitorSlug);
  if (search)     params.set('search',     search);
  if (brand)      params.set('brand',      brand);
  if (category)   params.set('category',   category);
  if (rank)       params.set('rank',       rank);
  if (itemGroup)  params.set('itemGroup',  itemGroup);
  return API.get(`/products?${params}`).then((r) => r.data);
};

// Lightweight dropdown metadata (brands / categories / ranks / itemGroups)
export const fetchProductsMeta = () =>
  API.get('/products/meta').then((r) => r.data);

export const exportProductsCSV = ({
  competitorSlug = null,
  search, brand, category, rank, itemGroup,
} = {}) => {
  const params = new URLSearchParams();
  if (competitorSlug) params.set('competitor', competitorSlug);
  if (search)         params.set('search',     search);
  if (brand)          params.set('brand',      brand);
  if (category)       params.set('category',   category);
  if (rank)           params.set('rank',       rank);
  if (itemGroup)      params.set('itemGroup',  itemGroup);
  return API.get(`/products/export?${params}`).then((r) => r.data);
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
