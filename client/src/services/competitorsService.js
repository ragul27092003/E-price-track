import API from '../hooks/useApi';

export const fetchCompetitors = () =>
  API.get('/competitors').then((r) => r.data);

export const createCompetitor = (data) =>
  API.post('/competitors', data).then((r) => r.data);

export const toggleCompetitorSync = (id, isActive) =>
  API.patch(`/competitors/${id}/toggle`, { isActive }).then((r) => r.data);
