export const createNotificationsSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  notifications: [],
  unreadCount:   0,

  // ── Actions ────────────────────────────────────────────────────────
  addNotification: (notification) =>
    set((state) => ({
      notifications: [{ ...notification, id: Date.now(), createdAt: new Date() }, ...state.notifications],
      unreadCount:   state.unreadCount + 1,
    })),

  markAllRead: () => set({ unreadCount: 0 }),

  removeNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
});
