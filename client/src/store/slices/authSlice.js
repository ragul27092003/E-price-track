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
  user:            null,   // { userId, userType, companyId }
  activeStoreId:   null,   // super_admin: switched store
  activeShopName:  null,

  // ── Actions ────────────────────────────────────────────────────────
  login: (data) => {
    const decoded = decodeToken(data.token);
    // Keep localStorage in sync so useApi.js interceptor picks up the token
    localStorage.setItem('token', data.token);
    set({
      token: data.token,
      user: {
        userId:    decoded?.userId,
        userType:  decoded?.userType,
        companyId: decoded?.companyId,
      },
    });
  },

  logout: () => {
    localStorage.clear();
    set({ token: null, user: null, activeStoreId: null, activeShopName: null });
  },

  switchStore: (companyId, companyName) => {
    localStorage.setItem('activeStoreId',  companyId);
    localStorage.setItem('activeShopName', companyName);
    set({ activeStoreId: companyId, activeShopName: companyName });
  },
});
