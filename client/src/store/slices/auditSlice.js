export const createAuditSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────
  auditData: null,
  // auditData shape: { totalProducts, totalIssues, healthScore, issues: { high, medium, low, others }, lastChecked }
  auditLoading:    false,
  auditError:      null,
  auditRefreshing: false,

  // ── Actions ────────────────────────────────────────────────────────
  setAuditData:      (auditData)      => set({ auditData }),
  setAuditLoading:   (auditLoading)   => set({ auditLoading }),
  setAuditError:     (auditError)     => set({ auditError }),
  setAuditRefreshing:(auditRefreshing)=> set({ auditRefreshing }),
  clearAudit:        () => set({ auditData: null, auditError: null }),
});
