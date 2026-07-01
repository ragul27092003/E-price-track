// Centralized route builders so URL shape lives in exactly one place.
export const ROUTES = {
  productHistory: "/product-history/:ean",
};

export function buildProductHistoryUrl(ean, range = 30) {
  if (!ean) return "/product-history";
  return `/product-history/${encodeURIComponent(ean)}?range=${range}`;
}
