import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Stack, Paper, CircularProgress } from '@mui/material';

// --- Reusable Competitor Card Row ---
const CompetitorRow = ({ data }) => {
  // Helper to determine color and arrow for Price Delta
  const isNegativeDelta = data.avgPriceDelta?.toString().includes('-');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, border: '1px solid #90caf9', borderRadius: 2, mb: 1.5, bgcolor: '#ffffff', cursor: 'pointer', '&:hover': { boxShadow: 1 } }}>
      
      {/* 1. Logo & Name */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '50%' }}>
        <Box sx={{ width: 40, height: 40, bgcolor: data.color || '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #eee' }}>
           {data.logo ? (
             <img src={data.logo} alt={data.name} style={{ width: '100%', objectFit: 'contain' }} />
           ) : (
             <Typography variant="caption" fontWeight="bold" color={data.color ? '#fff' : 'text.secondary'}>
               {data.name.substring(0, 2).toUpperCase()}
             </Typography>
           )}
        </Box>
        <Typography variant="body1" fontWeight="500" color="#333">{data.name}</Typography>
      </Stack>

      {/* 2. Avg Price Delta */}
      <Box sx={{ width: '25%' }}>
        <Typography variant="body2" sx={{ color: isNegativeDelta ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>
          {isNegativeDelta ? '▼' : '▲'} {data.avgPriceDelta || '+2.5%'}
        </Typography>
      </Box>

      {/* 3. Products Tracked */}
      <Box sx={{ width: '25%' }}>
        <Typography variant="body2" fontWeight="500" color="#333">
          {data.productsTracked || '335'}
        </Typography>
      </Box>

    </Box>
  );
};

// --- MAIN PAGE COMPONENT ---
const MarketCompetitor = () => {
  const [competitors, setCompetitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/competitors');
      setCompetitors(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch competitors", error);
      // Mock data for display
      setCompetitors([
        { id: 1, name: 'Amazon', logo: 'https://logo.clearbit.com/amazon.com', color: '#f59e0b', avgPriceDelta: '+2.5%', productsTracked: 335 },
        { id: 2, name: 'Croma', logo: '', color: '#0d9488', avgPriceDelta: '+2.5%', productsTracked: 335 },
        { id: 3, name: 'Vasanth & Co', logo: '', color: '#dc2626', avgPriceDelta: '-1.2%', productsTracked: 335 },
      ]);
      setIsLoading(false);
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 4, borderColor: '#cfd8dc', width: '100%', maxWidth: 1000, height: 'fit-content' }}>
        
        {/* Header */}
        <Box sx={{ bgcolor: '#475e77', color: '#fff', p: 1.5, px: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">Competitor Listings</Typography>
        </Box>
        
        {/* Column Headers */}
        <Box sx={{ display: 'flex', px: 3.5, pt: 2, pb: 1, bgcolor: '#f8fafd' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '50%' }}>Competitor</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '25%' }}>Avg. Price Delta</Typography>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: '25%' }}>Products Tracked</Typography>
        </Box>

        {/* List Content */}
        <Box sx={{ px: 2, pb: 2, pt: 0.5, bgcolor: '#f8fafd' }}>
          {competitors.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>No competitors found.</Typography>
          ) : (
            competitors.map((item) => <CompetitorRow key={item.id} data={item} />)
          )}
        </Box>

      </Paper>
    </Box>
  );
};

export default MarketCompetitor;