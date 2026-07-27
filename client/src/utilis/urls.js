import {ROUTE} from '../utils/urls';
// Centralized route builders so URL shape lives in exactly one place.
export const ROUTES = {
  productHistory: `${ROUTE.productHistory}/:ean`,
};

export function buildProductHistoryUrl(ean, range = 30) {
  if (!ean) return ROUTE.productHistory;
  return `${ROUTE.productHistory}/${encodeURIComponent(ean)}?range=${range}`;
}
