import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Stack, Paper, CircularProgress, Tooltip } from '@mui/material';
import { useStore } from '../store';
import { fetchCompetitors } from '../services/competitorsService';

// ─── Single competitor row ────────────────────────────────────────────────────
const CompetitorRow = ({ data, onClick }) => {
  const isNegDelta = String(data.avgPriceDelta).includes('-');
  const isOffline  = !data.isActive;

  return (
    <Tooltip
      title={isOffline ? 'This competitor is offline. Enable it in Competitors to view products.' : ''}
      placement="top"
      arrow
    >
      <Box
        onClick={() => !isOffline && onClick(data)}
        sx={{
          display: 'flex', alignItems: 'center', p: 1.5,
          border: '1px solid #90caf9', borderRadius: 2, mb: 1.5,
          bgcolor: isOffline ? '#f5f5f5' : '#ffffff',
          cursor: isOffline ? 'not-allowed' : 'pointer',
          opacity: isOffline ? 0.55 : 1,
          transition: 'box-shadow 0.15s, background 0.15s',
          '&:hover': !isOffline ? { boxShadow: 3, bgcolor: '#f0f7ff' } : {},
        }}
      >
        {/* Logo + Name */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '45%' }}>
          <Box sx={{
            width: 44, height: 44, bgcolor: data.color || '#475e77',
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
              <Typography variant="caption" fontWeight="bold" color="#fff" fontSize={13}>
                {data.name.substring(0, 2).toUpperCase()}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight="600" color={isOffline ? '#9e9e9e' : '#333'}>
              {data.name}
            </Typography>
            {isOffline && (
              <Typography variant="caption" sx={{
                bgcolor: '#f5f5f5', color: '#9e9e9e', border: '1px solid #e0e0e0',
                borderRadius: 1, px: 0.8, py: 0.2, fontSize: 10, fontWeight: 600,
              }}>
                OFFLINE
              </Typography>
            )}
          </Box>
        </Stack>

        {/* Avg Price Delta */}
        <Box sx={{ width: '20%' }}>
          <Typography variant="body2" sx={{
            color: isOffline ? '#bdbdbd' : isNegDelta ? '#d32f2f' : '#4caf50',
            fontWeight: 'bold',
          }}>
            {isNegDelta ? '▼' : '▲'} {data.avgPriceDelta || '+0.0%'}
          </Typography>
        </Box>

        {/* Products Tracked */}
        <Box sx={{ width: '20%' }}>
          <Typography variant="body2" fontWeight="500" color={isOffline ? '#bdbdbd' : '#333'}>
            {data.productsTracked ?? 0} products
          </Typography>
        </Box>

        {/* Arrow hint for online competitors */}
        <Box sx={{ width: '15%', display: 'flex', justifyContent: 'flex-end', pr: 1 }}>
          {!isOffline && (
            <Typography variant="body2" sx={{ color: '#90caf9', fontSize: 18 }}>›</Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const MarketCompetitor = () => {
  const navigate              = useNavigate();
  const competitors           = useStore((s) => s.competitors);
  const setCompetitors        = useStore((s) => s.setCompetitors);
  const competitorsLoading    = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  // ── FIX: watch activeStoreId → re-fetch on tenant switch ──
  const activeStoreId         = useStore((s) => s.activeStoreId);

  const load = async () => {
    setCompetitorsLoading(true);
    try {
      const data = await fetchCompetitors();
      setCompetitors(data);
    } catch (err) {
      console.error('MarketCompetitor: failed to fetch competitors', err);
    } finally {
      setCompetitorsLoading(false);
    }
  };

  // ── FIX: re-fetch when tenant switches ──
  useEffect(() => { load(); }, [activeStoreId]);

  // Clicking a competitor → navigate to Products filtered by that competitor's slug
  // Products page reads ?competitor= from URL and passes it to the backend
  const handleCompetitorClick = (comp) => {
    navigate(`/products?competitor=${comp.slug}&name=${encodeURIComponent(comp.name)}`);
  };

  if (competitorsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{
        borderRadius: 2, overflow: 'hidden', mb: 4,
        borderColor: '#cfd8dc', width: '100%', maxWidth: 1000, height: 'fit-content',
      }}>
        <Box sx={{ bgcolor: '#475e77', color: '#fff', p: 1.5, px: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Competitor Listings — Click a competitor to view their products
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', px: 3.5, pt: 2, pb: 1, bgcolor: '#f8fafd' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '45%' }}>Competitor</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '20%' }}>Avg. Price Delta</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '20%' }}>Products Tracked</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '15%' }} />
        </Box>
        <Box sx={{ px: 2, pb: 2, pt: 0.5, bgcolor: '#f8fafd' }}>
          {competitors.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
              No competitors found.
            </Typography>
          ) : (
            competitors.map((item) => (
              <CompetitorRow key={item.id} data={item} onClick={handleCompetitorClick} />
            ))
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MarketCompetitor;
