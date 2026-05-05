function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export const createAuthSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  token:           null,
  user:            null,
  activeStoreId:   null,
  activeShopName:  null,

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
    localStorage.clear();
    set({ token: null, user: null, activeStoreId: null, activeShopName: null });
  },

  // ── FIX: Clear cached competitors + products when switching tenant ──
  // Without this, old tenant's data stays in Zustand and pages don't refetch
  switchStore: (companyId, companyName) => {
    localStorage.setItem('activeStoreId',  companyId);
    localStorage.setItem('activeShopName', companyName);
    set({
      activeStoreId:  companyId,
      activeShopName: companyName,
      // Clear stale data so pages re-fetch from new tenant DB
      competitors:    [],
      products:       [],
    });
  },
});
