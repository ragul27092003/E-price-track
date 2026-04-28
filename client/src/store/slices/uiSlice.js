export const createUISlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  sidebarCollapsed: false,
  globalLoading:    false,
  activeModal:      null,   // string name of open modal, or null

  // ── Actions ────────────────────────────────────────────────────────
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar:       () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalLoading:    (globalLoading)    => set({ globalLoading }),
  openModal:           (modalName)        => set({ activeModal: modalName }),
  closeModal:          ()                 => set({ activeModal: null }),
});
