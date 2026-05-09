function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export const createAuthSlice = (set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  token:           null,
  user:            null,
  activeStoreId:   null,
  activeShopName:  null,
  exportType:      '',

  // ── Actions ────────────────────────────────────────────────────────
  login: (data) => {
    const decoded = decodeToken(data.token);
    localStorage.setItem('token', data.token);
    set({
      token: data.token,
      user: {
        userId:      decoded?.userId,
        userType:    decoded?.userType,
        companyId:   decoded?.companyId,
        // Store these from the API response — JWT does NOT encode them
        companyName: data.companyName || '',
        companyUrl:  data.companyUrl  || '',
        email:       data.email       || '',
      },
    });
  },

  logout: () => {
    // Remove only auth-specific keys — DO NOT use localStorage.clear()
    // because that would wipe storeLogoMap, darkMode, and other persisted UI state
    localStorage.removeItem('token');
    localStorage.removeItem('activeStoreId');
    localStorage.removeItem('activeShopName');
    set({ token: null, user: null, activeStoreId: null, activeShopName: null, exportType: '' });
  },

  setExportType: (type) => set({ exportType: type }),

  fetchMerchant: async (companyId) => {
    const { user } = get();
    const targetCompanyId = companyId || user?.companyId;
    if (!targetCompanyId) return;
    try {
      const { getMerchant } = await import('../../services/authService');
      const merchant = await getMerchant(targetCompanyId);
      set({ exportType: merchant.export_type || '' });
    } catch (error) {
      console.error('Failed to fetch merchant:', error);
      set({ exportType: '' });
    }
  },

  // ── FIX: Clear cached competitors + products when switching tenant ──
  // Without this, old tenant's data stays in Zustand and pages don't refetch
  switchStore: (companyId, companyName) => {
    localStorage.setItem('activeStoreId',  companyId);
    localStorage.setItem('activeShopName', companyName);
    set({
      activeStoreId:  companyId,
      activeShopName: companyName,
      exportType:     '',
      // Clear stale data so pages re-fetch from new tenant DB
      competitors:    [],
      products:       [],
    });
    get().fetchMerchant(companyId);
  },
});
