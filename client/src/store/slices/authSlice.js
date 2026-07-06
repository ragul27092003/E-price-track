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
  exportType:      localStorage.getItem('exportType') || '',
  showLsp:         localStorage.getItem('showLsp') === 'true',
  exportOption:    'yes',

  // ── Actions ────────────────────────────────────────────────────────
  login: (data) => {
    const decoded = decodeToken(data.token);
    localStorage.setItem('token', data.token);

    // Super admin: pin sathya as default tenant so every API call immediately
    // sends x-tenant-id: sathya before the stores list is fetched.
    // Restore a previously chosen store if the admin had switched before.
    let activeStoreId  = null;
    let activeShopName = null;
    if (decoded?.user_type === 'super_admin') {
      activeStoreId  = localStorage.getItem('activeStoreId')  || 'sathya';
      activeShopName = localStorage.getItem('activeShopName') || null;
      localStorage.setItem('activeStoreId', activeStoreId);
    }

    const exportType   = data.export_type   ?? 'A';
    const showLsp      = data.show_lsp      ?? false;
    const exportOption = data.export_option ?? 'yes';
    localStorage.setItem('exportType', exportType);
    localStorage.setItem('showLsp',    String(showLsp));

    set({
      token: data.token,
      activeStoreId,
      activeShopName,
      exportType,
      showLsp,
      exportOption,
      user: {
        user_id:       decoded?.user_id,
        user_type:     decoded?.user_type,
        cmpid:         decoded?.cmpid,
        companyName:   data.companyName   || '',
        website:       data.website       || '',
        email_address: data.email_address || '',
      },
    });
  },

  logout: () => {
    // Remove only auth-specific keys — DO NOT use localStorage.clear()
    // because that would wipe storeLogoMap, darkMode, and other persisted UI state
    localStorage.removeItem('token');
    localStorage.removeItem('activeStoreId');
    localStorage.removeItem('activeShopName');
    localStorage.removeItem('exportType');
    localStorage.removeItem('showLsp');
    set({ token: null, user: null, activeStoreId: null, activeShopName: null, exportType: '', showLsp: false, exportOption: 'yes' });
  },

  setExportType: (type) => set({ exportType: type }),

  fetchMerchant: async (companyId) => {
    const { user } = get();
    const targetCompanyId = companyId || user?.cmpid;
    if (!targetCompanyId) return;
    try {
      const { getMerchant } = await import('../../services/authService');
      const merchant = await getMerchant(targetCompanyId);
      const exportType = merchant.export_type ?? 'A';
      const showLsp    = merchant.show_lsp    ?? false;
      localStorage.setItem('exportType', exportType);
      localStorage.setItem('showLsp',    String(showLsp));
      set({ exportType, showLsp });
    } catch (error) {
      console.error('Failed to fetch merchant:', error);
      set({ exportType: '', showLsp: false });
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
      showLsp:        false,
      // Clear stale data so pages re-fetch from new tenant DB
      competitors:    [],
      products:       [],
    });
    get().fetchMerchant(companyId);
  },
});
