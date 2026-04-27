import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, Stack, Paper, InputAdornment, 
  Switch, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, Grid, FormControl, Select, MenuItem
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// --- Custom Mini Chart (Sparkline) ---
const Sparkline = () => (
  <Box sx={{ width: 120, height: 35, display: 'flex', alignItems: 'flex-end' }}>
    <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#bbdefb" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e3f2fd" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path d="M0,20 Q10,10 20,20 T40,15 T60,25 T80,10 T100,20 L100,30 L0,30 Z" fill="url(#gradient)" />
      <path d="M0,20 Q10,10 20,20 T40,15 T60,25 T80,10 T100,20" fill="none" stroke="#1976d2" strokeWidth="2" />
    </svg>
  </Box>
);

// --- Reusable Competitor Card Row with Dynamic Syncing ---
const CompetitorRow = ({ data, onToggleSync }) => {
  const [isActive, setIsActive] = useState(data.isActive);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleToggle = async (e) => {
    const newValue = e.target.checked;
    setIsActive(newValue);
    
    setIsSyncing(true);
    await onToggleSync(data.id, newValue);
    setIsSyncing(false);
  };

  // Helper to determine color and arrow for Price Delta
  const isNegativeDelta = data.avgPriceDelta?.toString().includes('-');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, border: '1px solid #90caf9', borderRadius: 2, mb: 1.5, bgcolor: '#ffffff' }}>
      
      {/* 1. Logo & Name */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '20%' }}>
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

      {/* 2. Status & Sync Time */}
      <Box sx={{ width: '20%' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isSyncing ? (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>Syncing...</Typography>
              <AutorenewIcon sx={{ color: '#1976d2', fontSize: 16, animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
            </Stack>
          ) : isActive ? (
            <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>Online</Typography>
          ) : (
             <Typography variant="body2" sx={{ color: '#9e9e9e', fontWeight: 'bold' }}>Offline</Typography>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">{data.lastSync || 'Just now'}</Typography>
      </Box>

      {/* 3. NEW COLUMN: Avg Price Delta */}
      <Box sx={{ width: '15%' }}>
        <Typography variant="body2" sx={{ color: isNegativeDelta ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>
          {isNegativeDelta ? '▼' : '▲'} {data.avgPriceDelta || '+2.5%'}
        </Typography>
      </Box>

      {/* 4. NEW COLUMN: Products Tracked */}
      <Box sx={{ width: '15%' }}>
        <Typography variant="body2" fontWeight="500" color="#333">
          {data.productsTracked || '335'}
        </Typography>
      </Box>

      {/* 5. Chart & Timeframe (7-Day Trend) */}
      <Box sx={{ width: '20%' }}>
        <Sparkline />
      </Box>

      {/* 6. Toggle Switch (Activation) */}
      <Box sx={{ width: '10%', display: 'flex', justifyContent: 'flex-end' }}>
        <Switch checked={isActive} onChange={handleToggle} color="success" disabled={isSyncing} />
      </Box>

    </Box>
  );
};

// --- Reusable Section Wrapper ---
const CompetitorSection = ({ title, items, onToggleSync }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 4, borderColor: '#cfd8dc' }}>
    <Box sx={{ bgcolor: '#475e77', color: '#fff', p: 1.5, px: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
    </Box>
    
    {/* NEW HEADER ROW for Columns */}
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
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>No competitors found.</Typography>
      ) : (
        items.map((item) => <CompetitorRow key={item.id} data={item} onToggleSync={onToggleSync} />)
      )}
    </Box>
  </Paper>
);

// --- MAIN PAGE COMPONENT ---
const Competitors = () => {
  const [competitors, setCompetitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: '', website: '', searchUrl: '', color: '#000000', mappingType: 'EAN', avgPriceDelta: '+0.0%', productsTracked: 0
  });

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
      setIsLoading(false);
    }
  };

  const handleToggleSync = async (id, isActive) => {
    try {
      await axios.patch(`http://localhost:5000/api/competitors/${id}/toggle`, { isActive });
      setCompetitors(prev => prev.map(comp => 
        comp.id === id ? { ...comp, isActive, lastSync: new Date().toLocaleString() } : comp
      ));
    } catch (error) {
      console.error("Failed to toggle sync", error);
    }
  };

  const handleSaveCompetitor = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/competitors', newCompetitor);
      setCompetitors([res.data, ...competitors]);
      setIsModalOpen(false); 
      setNewCompetitor({ name: '', website: '', searchUrl: '', color: '#000000', mappingType: 'EAN', avgPriceDelta: '+0.0%', productsTracked: 0 }); 
    } catch (error) {
      console.error("Failed to save competitor", error);
    }
  };

  const filteredCompetitors = competitors.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const eanList = filteredCompetitors.filter(c => c.mappingType === 'EAN');
  const urlList = filteredCompetitors.filter(c => c.mappingType === 'URL');

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <TextField
          placeholder="Search competitors..." size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300, bgcolor: '#f9f9f9' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#aaa' }} /></InputAdornment> }}
        />
        <Button variant="contained" sx={{ bgcolor: '#475e77', textTransform: 'none', px: 3 }} onClick={() => setIsModalOpen(true)}>
          New Competitor
        </Button>
      </Stack>

      <CompetitorSection title="EAN Based Competitor Listings" items={eanList} onToggleSync={handleToggleSync} />
      <CompetitorSection title="NON EAN Based Competitor Listings" items={urlList} onToggleSync={handleToggleSync} />

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
          <Typography fontWeight="bold">Add Competitor</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Competitor Name</Typography>
              <TextField fullWidth size="small" placeholder="Enter competitor name" value={newCompetitor.name} onChange={(e) => setNewCompetitor({...newCompetitor, name: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Competitor Website</Typography>
              <TextField fullWidth size="small" placeholder="https://example.com" value={newCompetitor.website} onChange={(e) => setNewCompetitor({...newCompetitor, website: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Search URL</Typography>
              <TextField fullWidth size="small" value={newCompetitor.searchUrl} onChange={(e) => setNewCompetitor({...newCompetitor, searchUrl: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Competitor Color</Typography>
              <TextField fullWidth size="small" type="color" value={newCompetitor.color} onChange={(e) => setNewCompetitor({...newCompetitor, color: e.target.value})} sx={{ p: 0 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">Mapping Type</Typography>
              <FormControl fullWidth size="small">
                <Select value={newCompetitor.mappingType} onChange={(e) => setNewCompetitor({...newCompetitor, mappingType: e.target.value})}>
                  <MenuItem value="EAN">EAN</MenuItem>
                  <MenuItem value="URL">Direct URL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setIsModalOpen(false)} sx={{ bgcolor: '#6c757d', color: '#fff', '&:hover': { bgcolor: '#5a6268' }, textTransform: 'none' }}>
            Close
          </Button>
          <Button onClick={handleSaveCompetitor} sx={{ bgcolor: '#28a745', color: '#fff', '&:hover': { bgcolor: '#218838' }, textTransform: 'none' }}>
            Save Competitor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Competitors;