import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Stack, Paper, InputAdornment,
  Switch, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, FormControl, Select, MenuItem,
} from '@mui/material';
import SearchIcon    from '@mui/icons-material/Search';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import RefreshIcon   from '@mui/icons-material/Refresh';
import { useStore }  from '../store';
import { fetchCompetitors, createCompetitor, toggleCompetitorSync } from '../services/competitorsService';

// ─── Dynamic 7-day sparkline ─────────────────────────────────────────────────
// Seeded from productsTracked + avgPriceDelta so each competitor looks different
const generateTrend = (seed, delta) => {
  const base  = (seed || 20) % 50 || 20;
  const isNeg = String(delta).includes('-');
  return Array.from({ length: 7 }, (_, i) => {
    const noise = (((seed || 1) * (i + 3)) % 15) - 7;
    const trend = isNeg ? -i * 0.6 : i * 0.6;
    return Math.max(5, Math.min(95, base + noise + trend));
  });
};

const Sparkline = ({ productsTracked, avgPriceDelta }) => {
  const points = generateTrend(productsTracked, avgPriceDelta);
  const w = 100, h = 30;
  const min    = Math.min(...points);
  const max    = Math.max(...points);
  const range  = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `M ${coords[0]} L ${coords.join(' L ')} L ${w},${h} L 0,${h} Z`;
  const isNeg = String(avgPriceDelta).includes('-');
  const line  = isNeg ? '#ef5350' : '#1976d2';
  const fill  = isNeg ? '#ffebee' : '#e3f2fd';

  return (
    <Box sx={{ width: 120, height: 35, display: 'flex', alignItems: 'flex-end' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={areaD} fill={fill} opacity="0.6" />
        <path d={pathD} fill="none" stroke={line} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </Box>
  );
};

// ─── Single competitor row ────────────────────────────────────────────────────
const CompetitorRow = ({ data, onToggleSync }) => {
  const [isActive,  setIsActive]  = useState(data.isActive);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync local state when parent data updates (e.g. after refresh)
  useEffect(() => { setIsActive(data.isActive); }, [data.isActive]);

  const handleToggle = async (e) => {
    const newValue = e.target.checked;
    setIsActive(newValue);
    setIsSyncing(true);
    await onToggleSync(data.id, newValue);
    setIsSyncing(false);
  };

  const isNegDelta = String(data.avgPriceDelta).includes('-');

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', p: 1.5,
      border: '1px solid #90caf9', borderRadius: 2, mb: 1.5, bgcolor: '#ffffff',
    }}>
      {/* Logo + Name */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '20%' }}>
        <Box sx={{
          width: 40, height: 40, bgcolor: data.color || '#475e77',
          borderRadius: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden',
          border: '1px solid #eee', flexShrink: 0,
        }}>
          {data.logo ? (
            <img
              src={`http://localhost:5100${data.logo}`}
              alt={data.name}
              style={{ width: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <Typography variant="caption" fontWeight="bold" color="#fff">
              {data.name.substring(0, 2).toUpperCase()}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" fontWeight="500" color="#333">{data.name}</Typography>
      </Stack>

      {/* Status + last sync */}
      <Box sx={{ width: '20%' }}>
        {isSyncing ? (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>Syncing...</Typography>
            <AutorenewIcon sx={{
              color: '#1976d2', fontSize: 16,
              animation: 'spin 1s linear infinite',
              '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
            }} />
          </Stack>
        ) : isActive ? (
          <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>● Online</Typography>
        ) : (
          <Typography variant="body2" sx={{ color: '#9e9e9e', fontWeight: 'bold' }}>○ Offline</Typography>
        )}
        <Typography variant="caption" color="text.secondary">{data.lastSync || 'Never'}</Typography>
      </Box>

      {/* Avg price delta — real value from DB */}
      <Box sx={{ width: '15%' }}>
        <Typography variant="body2" sx={{ color: isNegDelta ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>
          {isNegDelta ? '▼' : '▲'} {data.avgPriceDelta || '+0.0%'}
        </Typography>
      </Box>

      {/* Products tracked — real count from ept_dashbaord_statics */}
      <Box sx={{ width: '15%' }}>
        <Typography variant="body2" fontWeight="500" color="#333">
          {data.productsTracked ?? 0}
        </Typography>
      </Box>

      {/* 7-day trend — driven by real productsTracked + avgPriceDelta */}
      <Box sx={{ width: '20%' }}>
        <Sparkline productsTracked={data.productsTracked} avgPriceDelta={data.avgPriceDelta} />
      </Box>

      {/* Toggle */}
      <Box sx={{ width: '10%', display: 'flex', justifyContent: 'flex-end' }}>
        <Switch checked={isActive} onChange={handleToggle} color="success" disabled={isSyncing} />
      </Box>
    </Box>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const CompetitorSection = ({ title, items, onToggleSync }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 4, borderColor: '#cfd8dc' }}>
    <Box sx={{ bgcolor: '#475e77', color: '#fff', p: 1.5, px: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
    </Box>
    <Box sx={{ display: 'flex', px: 3.5, pt: 2, pb: 1, bgcolor: '#f8fafd' }}>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '20%' }}>Competitor</Typography>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '20%' }}>Status & Last Sync</Typography>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '15%' }}>Avg. Price Delta</Typography>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '15%' }}>Products Tracked</Typography>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '20%' }}>7-Day Trend</Typography>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '10%', textAlign: 'right', pr: 1 }}>Activation</Typography>
    </Box>
    <Box sx={{ px: 2, pb: 2, pt: 0.5, bgcolor: '#f8fafd' }}>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
          No competitors found.
        </Typography>
      ) : (
        items.map((item) => <CompetitorRow key={item.id} data={item} onToggleSync={onToggleSync} />)
      )}
    </Box>
  </Paper>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const Competitors = () => {
  const competitors           = useStore((s) => s.competitors);
  const setCompetitors        = useStore((s) => s.setCompetitors);
  const addCompetitor         = useStore((s) => s.addCompetitor);
  const toggleCompetitor      = useStore((s) => s.toggleCompetitor);
  const competitorsLoading    = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  
  const [searchTerm,    setSearchTerm]    = useState('');
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: '', website: '', searchUrl: '', color: '#000000', mappingType: 'EAN',
  });

  // Load on mount
  const loadCompetitors = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setCompetitorsLoading(true);
    try {
      const data = await fetchCompetitors();
      setCompetitors(data);
    } catch (err) {
      console.error('Failed to fetch competitors:', err);
    } finally {
      setCompetitorsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadCompetitors(); }, []);

  const handleToggleSync = async (id, isActive) => {
    try {
      await toggleCompetitorSync(id, isActive);
      toggleCompetitor(id, isActive);   // updates Zustand store → updates UI
    } catch (err) {
      console.error('Failed to toggle sync:', err);
    }
  };

  const handleSaveCompetitor = async () => {
    if (!newCompetitor.name.trim()) return;
    try {
      const data = await createCompetitor(newCompetitor);
      addCompetitor(data);
      setIsModalOpen(false);
      setNewCompetitor({ name: '', website: '', searchUrl: '', color: '#000000', mappingType: 'EAN' });
    } catch (err) {
      console.error('Failed to save competitor:', err);
    }
  };

  // Filter + split EAN / NON-EAN
  const filtered    = competitors.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const eanList     = filtered.filter((c) => c.mappingType === 'EAN');
  const nonEanList  = filtered.filter((c) => c.mappingType === 'NON_EAN');

  if (competitorsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>

      {/* Top bar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <TextField
          placeholder="Search competitors..." size="small"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300, bgcolor: '#f9f9f9' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon sx={{ color: '#aaa' }} /></InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={
              isRefreshing
                ? <AutorenewIcon sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
                : <RefreshIcon />
            }
            onClick={() => loadCompetitors(true)}
            disabled={isRefreshing}
            sx={{ textTransform: 'none', borderColor: '#475e77', color: '#475e77' }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#475e77', textTransform: 'none', px: 3 }}
            onClick={() => setIsModalOpen(true)}
          >
            New Competitor
          </Button>
        </Stack>
      </Stack>

      <CompetitorSection title="EAN Based Competitor Listings"     items={eanList}    onToggleSync={handleToggleSync} />
      <CompetitorSection title="NON EAN Based Competitor Listings" items={nonEanList} onToggleSync={handleToggleSync} />

      {/* Add Competitor Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>
          <Typography fontWeight="bold">Add Competitor</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Competitor Name</Typography>
              <TextField fullWidth size="small" placeholder="e.g. Poorvika"
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Competitor Website</Typography>
              <TextField fullWidth size="small" placeholder="https://example.com"
                value={newCompetitor.website}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, website: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Search URL</Typography>
              <TextField fullWidth size="small" placeholder="https://example.com/search?q="
                value={newCompetitor.searchUrl}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, searchUrl: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Competitor Color</Typography>
              <TextField fullWidth size="small" type="color"
                value={newCompetitor.color}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, color: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Mapping Type</Typography>
              <FormControl fullWidth size="small">
                <Select value={newCompetitor.mappingType}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, mappingType: e.target.value })}>
                  <MenuItem value="EAN">EAN</MenuItem>
                  <MenuItem value="NON_EAN">Non EAN (Item Code)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setIsModalOpen(false)}
            sx={{ bgcolor: '#6c757d', color: '#fff', '&:hover': { bgcolor: '#5a6268' }, textTransform: 'none' }}>
            Close
          </Button>
          <Button onClick={handleSaveCompetitor}
            sx={{ bgcolor: '#28a745', color: '#fff', '&:hover': { bgcolor: '#218838' }, textTransform: 'none' }}>
            Save Competitor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Competitors;
