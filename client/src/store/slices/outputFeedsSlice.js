export const createOutputFeedsSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  outputFeeds:        [],
  outputFeedsLoading: false,
  outputFeedsError:   null,

  // ── Actions ────────────────────────────────────────────────────────
  setOutputFeeds:        (outputFeeds)        => set({ outputFeeds }),
  setOutputFeedsLoading: (outputFeedsLoading) => set({ outputFeedsLoading }),
  setOutputFeedsError:   (outputFeedsError)   => set({ outputFeedsError }),

  addOutputFeed: (feed) =>
    set((state) => ({ outputFeeds: [...state.outputFeeds, feed] })),

  updateOutputFeed: (id, changes) =>
    set((state) => ({
      outputFeeds: state.outputFeeds.map((f) => (f._id === id ? { ...f, ...changes } : f)),
    })),

  removeOutputFeed: (id) =>
    set((state) => ({ outputFeeds: state.outputFeeds.filter((f) => f._id !== id) })),
});
