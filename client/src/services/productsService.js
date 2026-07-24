import API from '../hooks/useApi';

// Paginated product fetch — all filter params are optional
export const fetchProducts = ({
  page = 1, limit = 15, status= "completed",
  competitorSlug = null,
  search, brand, category, rank, itemGroup,
} = {}) => {
  const params = new URLSearchParams({ page, limit, status });
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

export const fetchPendingProducts = ({
  page = 1, limit = 15, status = 'pending',
  competitorSlug = null,
  search, brandsearch, itemgroupsearch, categorysearch,
} = {}) => {
  const params = new URLSearchParams({ page, limit, status });
  if (competitorSlug) params.set('competitor', competitorSlug);
  if (search)     params.set('search',     search);
  if (brandsearch) params.set('brand',      brandsearch);
  if (categorysearch)   params.set('category',   categorysearch);
  if (itemgroupsearch)  params.set('itemGroup',  itemgroupsearch);
  return API.get(`/products?${params}`).then((r) => r.data);
};
 
export const saveProductMapping = (data) =>
  API.post('/products/pendingmapping', data).then((r) => r.data);

export const saveWebPriceData = (data) =>
  API.post('/products/webpriceupdation', data).then((r) => r.data);

export const fetchFullsiteMappingProducts = ({
  page = 1, limit = 1, 
  search, competitor, mappingstatus
} = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (competitor) params.set('competitor', competitor);
  if (mappingstatus) params.set('mappingstatus', mappingstatus);
  return API.get(`/products/fullsitemapping?${params}`).then((r) => r.data);
};

export const updatefullsiteProductMapping = (data) =>
  API.post('/products/fullsitemapping/update', data).then((r) => r.data);