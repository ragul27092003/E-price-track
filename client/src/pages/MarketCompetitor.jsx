import React, { useEffect } from 'react';
import { Box, Typography, Stack, Paper, CircularProgress } from '@mui/material';
import { useStore } from '../store';
import { fetchCompetitors } from '../services/competitorsService';

const CompetitorRow = ({ data }) => {
  const isNegativeDelta = data.avgPriceDelta?.toString().includes('-');

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    return `http://localhost:5100${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, border: '1px solid #90caf9', borderRadius: 2, mb: 1.5, bgcolor: '#ffffff', cursor: 'pointer', '&:hover': { boxShadow: 1 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '50%' }}>
        <Box sx={{ width: 40, height: 40, bgcolor: data.color || '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #eee' }}>
          {data.logo
            ? <img src={getLogoUrl(data.logo)} alt={data.name} style={{ width: '100%', objectFit: 'contain' }} />
            : <Typography variant="caption" fontWeight="bold" color={data.color ? '#fff' : 'text.secondary'}>{data.name.substring(0, 2).toUpperCase()}</Typography>
          }
        </Box>
        <Typography variant="body1" fontWeight="500" color="#333">{data.name}</Typography>
      </Stack>
      <Box sx={{ width: '25%' }}>
        <Typography variant="body2" sx={{ color: isNegativeDelta ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>
          {isNegativeDelta ? '▼' : '▲'} {data.avgPriceDelta || '+2.5%'}
        </Typography>
      </Box>
      <Box sx={{ width: '25%' }}>
        <Typography variant="body2" fontWeight="500" color="#333">{data.productsTracked || '335'}</Typography>
      </Box>
    </Box>
  );
};

const MarketCompetitor = () => {
  const competitors           = useStore((s) => s.competitors);
  const setCompetitors        = useStore((s) => s.setCompetitors);
  const competitorsLoading    = useStore((s) => s.competitorsLoading);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);

  const loadCompetitors = async (forceRefresh = false) => {
    if (!forceRefresh && competitors.length > 0) return; 
    setCompetitorsLoading(true);
    try {
      const data = await fetchCompetitors();
      setCompetitors(data);
    } catch {
      setCompetitors([
        { id: 1, name: 'Amazon',       logo: 'https://logo.clearbit.com/amazon.com', color: '#f59e0b', avgPriceDelta: '+2.5%', productsTracked: 335 },
        { id: 2, name: 'Croma',        logo: '',                                     color: '#0d9488', avgPriceDelta: '+2.5%', productsTracked: 335 },
        { id: 3, name: 'Vasanth & Co', logo: '',                                     color: '#dc2626', avgPriceDelta: '-1.2%', productsTracked: 335 },
      ]);
    } finally {
      setCompetitorsLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitors();

    // SAFE LISTENER: Only refreshes when explicitly told to by the Header
    const handleForceRefresh = () => {
      loadCompetitors(true);
    };

    window.addEventListener('force-tenant-refresh', handleForceRefresh);

    return () => {
      window.removeEventListener('force-tenant-refresh', handleForceRefresh);
    };
  }, []); 

  if (competitorsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 4, borderColor: '#cfd8dc', width: '100%', maxWidth: 1000, height: 'fit-content' }}>
        <Box sx={{ bgcolor: '#475e77', color: '#fff', p: 1.5, px: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">Competitor Listings</Typography>
        </Box>
        <Box sx={{ display: 'flex', px: 3.5, pt: 2, pb: 1, bgcolor: '#f8fafd' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '50%' }}>Competitor</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '25%' }}>Avg. Price Delta</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '25%' }}>Products Tracked</Typography>
        </Box>
        <Box sx={{ px: 2, pb: 2, pt: 0.5, bgcolor: '#f8fafd' }}>
          {competitors.length === 0
            ? <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>No competitors found.</Typography>
            : competitors.map((item) => <CompetitorRow key={item.id} data={item} />)
          }
        </Box>
      </Paper>
    </Box>
  );
};

export default MarketCompetitor;