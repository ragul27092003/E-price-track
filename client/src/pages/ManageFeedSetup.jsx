import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, TextField,
  Select, MenuItem, FormControl, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert, Chip,
} from '@mui/material';
import StorefrontIcon      from '@mui/icons-material/Storefront';
import LanguageIcon        from '@mui/icons-material/Language';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import CancelIcon          from '@mui/icons-material/Cancel';
import SyncIcon            from '@mui/icons-material/Sync';
import API                 from '../hooks/useApi';

const ManageFeedSetup = () => {
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [logsLoading,  setLogsLoading]  = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [snack,        setSnack]        = useState({ open: false, msg: '', severity: 'success' });

  const [formData, setFormData] = useState({
    store_name:          '',
    cms_upload_type:     'none',
    feed_type:           'JSON',
    feed_url:            '',
    shopify_name:        '',
    shopify_accesstoken: '',
    schedule_info:       'Daily',
    import_time:         '12:00 PM',
  });

  // ── Load feed config ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await API.get('/feeds');
        const d   = res.data || {};
        setFormData((prev) => ({
          ...prev,
          store_name:          d.store_name          || d.feed_name || '',
          cms_upload_type:     d.cms_upload_type     || 'none',
          feed_type:           d.feed_type           ? d.feed_type.toUpperCase() : 'JSON',
          feed_url:            d.feed_url            || '',
          shopify_name:        d.shopify_name        || '',
          shopify_accesstoken: d.shopify_accesstoken || '',
          schedule_info:       d.schedule_info       || 'Daily',
          import_time:         d.import_time         || '12:00 PM',
        }));
      } catch (err) {
        console.error('Error fetching feed setup:', err);
        showSnack('Failed to load feed configuration', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
    loadActivityLog();
  }, []);

  const loadActivityLog = async () => {
    setLogsLoading(true);
    try {
      const res = await API.get('/feeds/activity-log');
      setActivityLogs(res.data?.logs || []);
    } catch (err) {
      setActivityLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const showSnack = (msg, severity = 'success') =>
    setSnack({ open: true, msg, severity });

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Clicking a card sets cms_upload_type; clicking the active card again resets to 'none'
  const handleCardSelect = (type) =>
    setFormData((prev) => ({
      ...prev,
      cms_upload_type: prev.cms_upload_type === type ? 'none' : type,
    }));

  const handleSave = async () => {
    if (isShopify) {
      if (!formData.shopify_name.trim() || !formData.shopify_accesstoken.trim()) {
        showSnack('Shopify Store Name and Access Token are required', 'error');
        return;
      }
    } else {
      if (!formData.feed_url.trim()) {
        showSnack('Feed URL is required', 'error');
        return;
      }
    }
    setIsSaving(true);
    try {
      await API.put('/feeds', {
        store_name:          formData.store_name,
        cms_upload_type:     formData.cms_upload_type,
        feed_type:           formData.feed_type.toLowerCase(),
        feed_url:            formData.feed_url,
        shopify_name:        formData.shopify_name,
        shopify_accesstoken: formData.shopify_accesstoken,
        schedule_info:       formData.schedule_info,
        import_time:         formData.import_time,
      });
      showSnack('Configuration saved successfully');
      loadActivityLog();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isShopify   = formData.cms_upload_type === 'shopify';
  const isWordPress = formData.cms_upload_type === 'wordpress';

  // Card border highlight when active
  const cardSx = (type) => ({
    borderRadius: 2,
    cursor: 'pointer',
    borderColor: formData.cms_upload_type === type ? '#3b9d9d' : '#e0e0e0',
    borderWidth: formData.cms_upload_type === type ? 2 : 1,
    boxShadow:   formData.cms_upload_type === type ? '0 0 0 2px #3b9d9d22' : 'none',
    transition:  'border-color 0.2s, box-shadow 0.2s',
  });

  return (
    <Box sx={{ p: 3, maxWidth: '100%', bgcolor: '#ffffff', color: '#333' }}>

      {/* ── Description ── */}
      <Typography variant="body2" sx={{ color: '#555', mb: 3 }}>
        Please set the format, text encoding and upload product feed file for us to process.
      </Typography>

      {/* ── 3 source cards — clicking sets cms_upload_type ── */}
      <Box mb={4}>
        <Grid container spacing={2}>

          {/* Shopify card */}
          <Grid item xs={12} md={4}>
            <Card
              variant="outlined"
              sx={cardSx('shopify')}
              onClick={() => handleCardSelect('shopify')}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <StorefrontIcon sx={{ fontSize: 40, color: '#96bf48' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">Shopify</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Connect your Shopify store for<br />automatic sync.
                  </Typography>
                </Box>
                {isShopify && (
                  <Chip label="Active" size="small" sx={{ ml: 'auto', bgcolor: '#3b9d9d', color: '#fff', fontSize: 10 }} />
                )}
              </CardContent>
              <Box p={1.5} pt={0} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant={isShopify ? 'contained' : 'outlined'}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    minWidth: 100,
                    color:        isShopify ? '#fff' : '#555',
                    borderColor:  '#ccc',
                    bgcolor:      isShopify ? '#3b9d9d' : 'transparent',
                    '&:hover':    { bgcolor: isShopify ? '#2e8080' : undefined },
                  }}
                  onClick={(e) => { e.stopPropagation(); handleCardSelect('shopify'); }}
                >
                  {isShopify ? 'Connected' : 'Connect'}
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* WordPress card */}
          <Grid item xs={12} md={4}>
            <Card
              variant="outlined"
              sx={cardSx('wordpress')}
              onClick={() => handleCardSelect('wordpress')}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <LanguageIcon sx={{ fontSize: 40, color: '#21759b' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">WordPress</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Link your WooCommerce store for<br />seamless integration.
                  </Typography>
                </Box>
                {isWordPress && (
                  <Chip label="Active" size="small" sx={{ ml: 'auto', bgcolor: '#3b9d9d', color: '#fff', fontSize: 10 }} />
                )}
              </CardContent>
              <Box p={1.5} pt={0} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant={isWordPress ? 'contained' : 'outlined'}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    minWidth: 100,
                    color:        isWordPress ? '#fff' : '#555',
                    borderColor:  '#ccc',
                    bgcolor:      isWordPress ? '#3b9d9d' : 'transparent',
                    '&:hover':    { bgcolor: isWordPress ? '#2e8080' : undefined },
                  }}
                  onClick={(e) => { e.stopPropagation(); handleCardSelect('wordpress'); }}
                >
                  {isWordPress ? 'Connected' : 'Connect'}
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* URL Feed card */}
          <Grid item xs={12} md={4}>
            <Card
              variant="outlined"
              sx={{
                ...cardSx('none'),
                borderColor: (!isShopify && !isWordPress) ? '#9bb8d9' : '#e0e0e0',
                bgcolor:     (!isShopify && !isWordPress) ? '#eef3fb' : '#fff',
              }}
              onClick={() => handleCardSelect('none')}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <InsertDriveFileIcon sx={{ fontSize: 40, color: '#3b6eac' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">URL Feed</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Import a product feed via URL (CSV,<br />XML, JSON).
                  </Typography>
                </Box>
                {(!isShopify && !isWordPress) && (
                  <Chip label="Active" size="small" sx={{ ml: 'auto', bgcolor: '#3b6eac', color: '#fff', fontSize: 10 }} />
                )}
              </CardContent>
              <Box p={1.5} pt={0} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ textTransform: 'none', minWidth: 100, bgcolor: '#3b6eac', boxShadow: 'none', '&:hover': { bgcolor: '#2d5a8e' } }}
                  onClick={(e) => { e.stopPropagation(); handleCardSelect('none'); }}
                >
                  Import
                </Button>
              </Box>
            </Card>
          </Grid>

        </Grid>
      </Box>

      {/* ── Feed Name (read-only red label from store_name in DB) ── */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#555', minWidth: 110 }}>Feed Name:</Typography>
        <Typography variant="body1" sx={{ color: '#d32f2f', fontWeight: 600 }}>
          {formData.store_name || '—'}
        </Typography>
      </Stack>

      {/* ── SHOPIFY: Store Name + Access Token + Get Products button ── */}
      {isShopify && (
        <Box mb={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Shopify Configuration</Typography>
            {/* Get Products only shows when Shopify is active */}
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              sx={{ bgcolor: '#3b9d9d', textTransform: 'none', '&:hover': { bgcolor: '#2e8080' } }}
              onClick={loadActivityLog}
            >
              Get Products
            </Button>
          </Stack>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>
                Shopify Store Name:
              </Typography>
              <TextField
                fullWidth size="small" variant="outlined"
                placeholder="e.g. my-store.myshopify.com"
                name="shopify_name"
                value={formData.shopify_name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>
                Shopify Access Token:
              </Typography>
              <TextField
                fullWidth size="small" variant="outlined"
                placeholder="shpat_xxxxxxxxxxxxxxxx"
                name="shopify_accesstoken"
                value={formData.shopify_accesstoken}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── URL Feed / WordPress: original URL Feed Configuration form ── */}
      {!isShopify && (
        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            URL Feed Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Feed Format</Typography>
              <FormControl fullWidth size="small">
                <Select name="feed_type" value={formData.feed_type} onChange={handleChange}>
                  <MenuItem value="JSON">JSON</MenuItem>
                  <MenuItem value="CSV">CSV</MenuItem>
                  <MenuItem value="XML">XML</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>URL for Import</Typography>
              <TextField
                fullWidth size="small" variant="outlined"
                name="feed_url"
                value={formData.feed_url}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Import Schedule</Typography>
                  <FormControl fullWidth size="small">
                    <Select name="schedule_info" value={formData.schedule_info} onChange={handleChange}>
                      <MenuItem value="Daily">Daily</MenuItem>
                      <MenuItem value="Weekly">Weekly</MenuItem>
                      <MenuItem value="Hourly">Hourly</MenuItem>
                      <MenuItem value="Monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', visibility: 'hidden' }}>At</Typography>
                  <TextField
                    fullWidth size="small"
                    name="import_time"
                    value={formData.import_time}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <AccessTimeIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />,
                      sx: { bgcolor: '#f4f5f8' },
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── Shopify: import schedule ── */}
      {isShopify && (
        <Box mb={3}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Import Schedule</Typography>
              <FormControl fullWidth size="small">
                <Select name="schedule_info" value={formData.schedule_info} onChange={handleChange}>
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Hourly">Hourly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', visibility: 'hidden' }}>At</Typography>
              <TextField
                fullWidth size="small"
                name="import_time"
                value={formData.import_time}
                onChange={handleChange}
                InputProps={{
                  startAdornment: <AccessTimeIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />,
                  sx: { bgcolor: '#f4f5f8' },
                }}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── Save button ── */}
      <Box mt={4} mb={5}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ bgcolor: '#3b9d9d', textTransform: 'none', '&:hover': { bgcolor: '#2e8080' } }}
        >
          {isSaving ? 'Saving...' : '→ Save'}
        </Button>
      </Box>

      {/* ── Activity Log ── */}
      <Box mb={4}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">Activity Log</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Last sync attempts
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<SyncIcon fontSize="small" />}
            onClick={loadActivityLog}
            disabled={logsLoading}
            sx={{ textTransform: 'none', color: '#3b9d9d' }}
          >
            Refresh
          </Button>
        </Stack>

        <TableContainer sx={{ borderTop: '1px solid #eee' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#555', whiteSpace: 'nowrap' }}>
                  Date &amp; Time
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#555' }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#555' }}>
                  Message
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : activityLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#999', fontSize: '0.85rem' }}>
                    No activity logs found
                  </TableCell>
                </TableRow>
              ) : (
                activityLogs.map((log, idx) => (
                  <TableRow key={idx} sx={{ '& td': { borderBottom: '1px solid #f5f5f5' } }}>
                    <TableCell sx={{ fontSize: '0.82rem', py: 1.5, color: '#333', whiteSpace: 'nowrap' }}>
                      {log.date}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {log.status === 'Success'
                          ? <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                          : <CancelIcon      sx={{ color: '#d32f2f', fontSize: 18 }} />
                        }
                        <Typography
                          variant="body2"
                          sx={{ fontSize: '0.82rem', color: log.status === 'Success' ? '#2e7d32' : '#d32f2f', fontWeight: 500 }}
                        >
                          {log.status}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', py: 1.5, color: '#555' }}>
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default ManageFeedSetup;
