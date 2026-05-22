export const createSettingsSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  profile:         null,   // current user profile
  storeUsers:      [],     // users in same company
  usersLog:        [],     // login activity log
  settingsLoading: false,
  settingsError:   null,
  storeLogoMap:    {},     // { [storeId]: base64DataUrl } — logo per store

  // ── Actions ────────────────────────────────────────────────────────
  setProfile:         (profile)         => set({ profile }),
  setStoreUsers:      (storeUsers)      => set({ storeUsers }),
  setUsersLog:        (usersLog)        => set({ usersLog }),
  setSettingsLoading: (settingsLoading) => set({ settingsLoading }),
  setSettingsError:   (settingsError)   => set({ settingsError }),

  setStoreLogo: (storeId, logoUrl) =>
    set((state) => ({
      storeLogoMap: { ...state.storeLogoMap, [storeId]: logoUrl },
    })),

  addStoreUser: (user) =>
    set((state) => ({ storeUsers: [...state.storeUsers, user] })),

  removeStoreUser: (user_id) =>
    set((state) => ({ storeUsers: state.storeUsers.filter((u) => u.user_id !== user_id) })),
});
