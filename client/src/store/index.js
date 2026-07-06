import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createAuthSlice }          from './slices/authSlice';
import { createProductsSlice }      from './slices/productsSlice';
import { createFeedsSlice }         from './slices/feedsSlice';
import { createOutputFeedsSlice }   from './slices/outputFeedsSlice';
import { createCompetitorsSlice }   from './slices/competitorsSlice';
import { createAuditSlice }         from './slices/auditSlice';
import { createSettingsSlice }      from './slices/settingsSlice';
import { createNotificationsSlice } from './slices/notificationsSlice';
import { createUISlice }            from './slices/uiSlice';
import { createDashboardSlice }     from './slices/dashboardSlice';

export const useStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createProductsSlice(set, get),
      ...createFeedsSlice(set, get),
      ...createOutputFeedsSlice(set, get),
      ...createCompetitorsSlice(set, get),
      ...createAuditSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createNotificationsSlice(set, get),
      ...createUISlice(set, get),
      ...createDashboardSlice(set, get),
    }),
    {
      name: 'eprice-store',
      partialize: (state) => ({
        // Auth — persisted so user stays logged in on refresh
        token:           state.token,
        user:            state.user,
        activeStoreId:   state.activeStoreId,
        activeShopName:  state.activeShopName,
        exportType:      state.exportType,
        exportOption:    state.exportOption,
        // Last viewed product — persisted so ProductHistory remembers across navigation
        lastViewedEan:   state.lastViewedEan,
        // UI — persisted so layout preference survives refresh
        sidebarCollapsed: state.sidebarCollapsed,
        // Notifications — persisted so unread badge survives refresh
        notifications:   state.notifications,
        unreadCount:     state.unreadCount,
        // Branding — persisted so store logos survive refresh
        storeLogoMap:    state.storeLogoMap,
      }),
    }
  )
); 

// ── Selectors ───────────────────────────────────────────────────────────────
// Use these in components instead of deriving values inline

export const selectIsSuperAdmin  = (s) => s.user?.user_type === 'super_admin';
export const selectIsStoreAdmin  = (s) => s.user?.user_type === 'store_admin';
export const selectCanEdit       = (s) => s.user?.user_type === 'super_admin';
export const selectCurrentStoreId = (s) =>
  s.user?.user_type === 'super_admin' ? s.activeStoreId : s.user?.cmpid;
