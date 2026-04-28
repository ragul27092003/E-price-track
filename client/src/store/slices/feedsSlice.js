export const createFeedsSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  feedConfig:    null,   // { feedName, feedFormat, importUrl, schedule, scheduleTime, ... }
  feedsLoading:  false,
  feedsError:    null,

  // ── Actions ────────────────────────────────────────────────────────
  setFeedConfig:    (feedConfig)   => set({ feedConfig }),
  setFeedsLoading:  (feedsLoading) => set({ feedsLoading }),
  setFeedsError:    (feedsError)   => set({ feedsError }),
  clearFeedConfig:  () => set({ feedConfig: null, feedsError: null }),
});
