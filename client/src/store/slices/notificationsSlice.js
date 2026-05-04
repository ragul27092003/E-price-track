export const createNotificationsSlice = (set) => ({
  // ── Toast / badge notifications ────────────────────────────────────
  notifications: [],
  unreadCount:   0,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [{ ...notification, id: Date.now(), createdAt: new Date() }, ...state.notifications],
      unreadCount:   state.unreadCount + 1,
    })),

  markAllRead: () => set({ unreadCount: 0 }),

  removeNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  // ── Alert products (Notifications page) ───────────────────────────
  alertProducts:        [],
  alertProductsLoading: false,
  alertProductsError:   null,

  setAlertProducts:        (alertProducts)        => set({ alertProducts }),
  setAlertProductsLoading: (alertProductsLoading) => set({ alertProductsLoading }),
  setAlertProductsError:   (alertProductsError)   => set({ alertProductsError }),
});
