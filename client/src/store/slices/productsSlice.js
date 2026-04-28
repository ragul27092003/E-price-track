export const createProductsSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  products:        [],
  productsLoading: false,
  productsError:   null,
  productsSearch:  '',
  productsPage:    1,

  // ── Actions ────────────────────────────────────────────────────────
  setProducts:        (products) => set({ products }),
  setProductsLoading: (productsLoading) => set({ productsLoading }),
  setProductsError:   (productsError)   => set({ productsError }),
  setProductsSearch:  (productsSearch)  => set({ productsSearch, productsPage: 1 }),
  setProductsPage:    (productsPage)    => set({ productsPage }),
  clearProducts:      () => set({ products: [], productsError: null }),
});
