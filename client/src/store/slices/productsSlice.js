export const createProductsSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  products:           [],
  productsLoading:    false,
  productsError:      null,
  productsSearch:     '',
  productsPage:       1,
  productsTotal:      0,
  productsTotalPages: 0,
  productsMeta:       null,   // { brands, categories, ranks, itemGroups }
  lastViewedEan:      null,

  // ── Actions ────────────────────────────────────────────────────────
  setProducts:           (products)           => set({ products }),
  setProductsLoading:    (productsLoading)    => set({ productsLoading }),
  setProductsError:      (productsError)      => set({ productsError }),
  setProductsSearch:     (productsSearch)     => set({ productsSearch, productsPage: 1 }),
  setProductsPage:       (productsPage)       => set({ productsPage }),
  setProductsTotal:      (productsTotal)      => set({ productsTotal }),
  setProductsTotalPages: (productsTotalPages) => set({ productsTotalPages }),
  setProductsMeta:       (productsMeta)       => set({ productsMeta }),
  clearProducts:         () => set({ products: [], productsError: null }),
  setLastViewedEan:      (ean) => set({ lastViewedEan: ean }),
});
