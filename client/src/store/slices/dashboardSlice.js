export const createDashboardSlice = (set) => ({
  // ── SAP update status ──────────────────────────────────────────────
  sapUpdateStatus:        null,
  sapUpdateStatusLoading: false,
  sapUpdateStatusError:   null,

  // ── Overall statistics ─────────────────────────────────────────────
  overallStatistics:        null,
  overallStatisticsLoading: false,
  overallStatisticsError:   null,

  // ── Rank analysis ─────────────────────────────────────────────────
  rankAnalysis:        null,
  rankAnalysisLoading: false,
  rankAnalysisError:   null,

  fetchRankAnalysis: async () => {
    set({ rankAnalysisLoading: true, rankAnalysisError: null });
    try {
      const { fetchRankAnalysis } = await import('../../services/dashboardService');
      const data = await fetchRankAnalysis();
      set({ rankAnalysis: data, rankAnalysisLoading: false });
    } catch (err) {
      set({ rankAnalysisError: err.message, rankAnalysisLoading: false });
    }
  },

  // ── Brand analytics ────────────────────────────────────────────────
  brandAnalyticsBrands:        [],
  brandAnalyticsBrandsLoading: false,
  brandAnalyticsCategories:    [],
  brandAnalyticsData:          null,
  brandAnalyticsLoading:       false,
  brandAnalyticsError:         null,

  fetchSapUpdateStatus: async () => {
    set({ sapUpdateStatusLoading: true, sapUpdateStatusError: null });
    try {
      const { fetchSapUpdateStatus } = await import('../../services/dashboardService');
      const data = await fetchSapUpdateStatus();
      set({ sapUpdateStatus: data, sapUpdateStatusLoading: false });
    } catch (err) {
      set({ sapUpdateStatusError: err.message, sapUpdateStatusLoading: false });
    }
  },

  fetchOverallStatistics: async () => {
    set({ overallStatisticsLoading: true, overallStatisticsError: null });
    try {
      const { fetchOverallStatistics } = await import('../../services/dashboardService');
      const data = await fetchOverallStatistics();
      set({ overallStatistics: data, overallStatisticsLoading: false });
    } catch (err) {
      set({ overallStatisticsError: err.message, overallStatisticsLoading: false });
    }
  },

  fetchBrandAnalyticsBrands: async () => {
    set({ brandAnalyticsBrandsLoading: true });
    try {
      const { fetchBrandAnalyticsBrands } = await import('../../services/dashboardService');
      const brands = await fetchBrandAnalyticsBrands();
      set({ brandAnalyticsBrands: brands, brandAnalyticsBrandsLoading: false });
    } catch (err) {
      set({ brandAnalyticsBrandsLoading: false });
    }
  },

  fetchBrandAnalytics: async (brand, category) => {
    set({ brandAnalyticsLoading: true, brandAnalyticsError: null });
    try {
      const { fetchBrandAnalytics } = await import('../../services/dashboardService');
      const result = await fetchBrandAnalytics(brand, category);
      set({
        brandAnalyticsCategories: result.categories,
        brandAnalyticsData:       result.data,
        brandAnalyticsLoading:    false,
      });
    } catch (err) {
      set({ brandAnalyticsError: err.message, brandAnalyticsLoading: false });
    }
  },
});
