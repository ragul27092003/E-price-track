export const createCompetitorsSlice = (set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  competitors:        [],
  competitorsLoading: false,
  competitorsError:   null,

  // ── Actions ────────────────────────────────────────────────────────
  setCompetitors:        (competitors)        => set({ competitors }),
  setCompetitorsLoading: (competitorsLoading) => set({ competitorsLoading }),
  setCompetitorsError:   (competitorsError)   => set({ competitorsError }),

  addCompetitor: (competitor) =>
    set((state) => ({ competitors: [...state.competitors, competitor] })),

  toggleCompetitor: (id, isActive) =>
    set((state) => ({
      competitors: state.competitors.map((c) =>
        c.id === id ? { ...c, isActive, lastSync: new Date().toLocaleString() } : c
      ),
    })),
});
