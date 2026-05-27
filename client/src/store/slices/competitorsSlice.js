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

  /**
   * After super_admin uploads a logo, update the logo URL for that competitor
   * across ALL items in state (matched by slug) so every store reflects the change.
   */
  updateCompetitorLogo: (slug, logoUrl) =>
    set((state) => ({
      competitors: state.competitors.map((c) =>
        c.slug === slug ? { ...c, logo: logoUrl, fullLogo: logoUrl } : c
      ),
    })),
});
