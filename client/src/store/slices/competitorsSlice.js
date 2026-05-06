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

  toggleCompetitor: (id, isActive, lastSync) =>
    set((state) => ({
      competitors: state.competitors.map((c) =>
        String(c.id) === String(id) ? { ...c, isActive, lastSync: lastSync ?? c.lastSync } : c
      ),
    })),
});
