import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Checkbox,
  CircularProgress
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront'; 
import LanguageIcon from '@mui/icons-material/Language'; 
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'; 
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const ManageFeedSetup = () => {

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    feedName: '',
    feedFormat: 'JSON',
    feedUrl: '',
    urlFormat: '',
    importSchedule: 'Daily',
    importTime: '12:00 PM', 
    textEncoding: 'UTF-8',
    useProxy: false,
    proxyIp: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: ''
  });


  const activityLogs = [
    { id: 1, date: 'Oct 26, 2024, 12:00 PM', status: 'Success', message: 'Feed synced successfully. 500 products updated.' },
    { id: 2, date: 'Oct 25, 2024, 12:00 PM', status: 'Success', message: 'Feed synced successfully. 498 products updated.' },
    { id: 3, date: 'Oct 24, 2024, 12:00 PM', status: 'Error', message: 'Connection timed out. Please check the URL.' },
    { id: 4, date: 'Oct 23, 2024, 12:00 PM', status: 'Success', message: 'Feed synced successfully. 500 products updated.' },
    { id: 5, date: 'Oct 22, 2024, 12:00 PM', status: 'Success', message: 'Feed synced successfully. 495 products updated.' },
  ];

  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
       
        setTimeout(() => {
          const mockBackendData = {
            feedName: 'Suryaelectronics',
            feedFormat: 'JSON',
            feedUrl: 'https://epricetrack.com/eprice/admin/uploads/surya_electronics/products.json',
            urlFormat: 'https://epricetrack.com/eprice/admin/uploads/surya_electronics/products.json',
            importSchedule: 'Daily',
            importTime: '12:00 PM',
            textEncoding: 'UTF-8',
            useProxy: false,
            proxyIp: '',
            proxyPort: '',
            proxyUsername: '',
            proxyPassword: ''
          };
          setFormData(mockBackendData);
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error fetching feed setup:", error);
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

 
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };


  const handleSave = async () => {
    console.log("Submitting payload to backend:", formData);

    alert("Configuration saved! Check console for payload.");
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%', bgcolor: '#ffffff', color: '#333' }}>

      <Box mb={4}>
        <Typography variant="body2" sx={{ mb: 2, color: '#555' }}>
          Select and configure your product data source.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e0e0e0' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <StorefrontIcon sx={{ fontSize: 40, color: '#96bf48' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">Shopify</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Connect your Shopify store for<br/>automatic sync.
                  </Typography>
                </Box>
              </CardContent>
              <Box p={1.5} pt={0} textAlign="center">
                <Button variant="outlined" size="small" sx={{ textTransform: 'none', color: '#555', borderColor: '#ccc' }}>Connect</Button>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e0e0e0' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <LanguageIcon sx={{ fontSize: 40, color: '#21759b' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">WordPress</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Link your WooCommerce store for<br/>seamless integration.
                  </Typography>
                </Box>
              </CardContent>
              <Box p={1.5} pt={0} textAlign="center">
                <Button variant="outlined" size="small" sx={{ textTransform: 'none', color: '#555', borderColor: '#ccc' }}>Connect</Button>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#9bb8d9', bgcolor: '#eef3fb' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <InsertDriveFileIcon sx={{ fontSize: 40, color: '#3b6eac' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">URL Feed</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Import a product feed via URL (CSV,<br/>XML, JSON).
                  </Typography>
                </Box>
              </CardContent>
              <Box p={1.5} pt={0} textAlign="center">
                <Button variant="contained" size="small" sx={{ textTransform: 'none', bgcolor: '#3b6eac', boxShadow: 'none' }}>Import</Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          URL Feed Configuration
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Feed Name</Typography>
            <TextField 
              fullWidth size="small" variant="outlined" 
              name="feedName" value={formData.feedName} onChange={handleChange} 
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Feed Format</Typography>
            <FormControl fullWidth size="small">
              <Select name="feedFormat" value={formData.feedFormat} onChange={handleChange}>
                <MenuItem value="JSON">JSON</MenuItem>
                <MenuItem value="CSV">CSV</MenuItem>
                <MenuItem value="XML">XML</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>URL for Import</Typography>
            <TextField 
              fullWidth size="small" variant="outlined" 
              name="feedUrl" value={formData.feedUrl} onChange={handleChange} 
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>URL Format</Typography>
            <TextField 
              fullWidth size="small" variant="outlined" 
              name="urlFormat" value={formData.urlFormat} onChange={handleChange} 
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Import Schedule</Typography>
                <FormControl fullWidth size="small">
                  <Select name="importSchedule" value={formData.importSchedule} onChange={handleChange}>
                    <MenuItem value="Daily">Daily</MenuItem>
                    <MenuItem value="Weekly">Weekly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', visibility: 'hidden' }}>Time</Typography>
                <TextField
                  fullWidth size="small"
                  name="importTime" value={formData.importTime} onChange={handleChange}
                  InputProps={{
                    startAdornment: <AccessTimeIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />,
                    sx: { bgcolor: '#f4f5f8' }
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      <Box mb={4} sx={{ bgcolor: '#f8f9fc', p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: 'pointer' }} onClick={() => setAdvancedOpen(!advancedOpen)}>
          {advancedOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          <Typography variant="subtitle2" fontWeight="bold">Advanced Settings</Typography>
          <Switch size="small" checked={advancedOpen} onChange={() => setAdvancedOpen(!advancedOpen)} />
        </Stack>
        
        <Collapse in={advancedOpen}>
          <Box pt={3}>
            <Grid container spacing={3} alignItems="flex-end">
              <Grid item xs={12} md={3}>
                <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Text Encoding</Typography>
                <FormControl fullWidth size="small">
                  <Select name="textEncoding" value={formData.textEncoding} onChange={handleChange}>
                    <MenuItem value="UTF-8">UTF-8</MenuItem>
                    <MenuItem value="ASCII">ASCII</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={9}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box>
                    <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>Proxy Settings</Typography>
                    <FormControlLabel
                      control={<Checkbox size="small" name="useProxy" checked={formData.useProxy} onChange={handleChange} />}
                      label={<Typography variant="body2">Use Proxy</Typography>}
                      sx={{ m: 0 }}
                    />
                  </Box>
                  <TextField fullWidth placeholder="IP" size="small" sx={{ bgcolor: '#fff' }} 
                    name="proxyIp" value={formData.proxyIp} onChange={handleChange} disabled={!formData.useProxy} 
                  />
                  <TextField fullWidth placeholder="Port" size="small" sx={{ bgcolor: '#fff' }} 
                    name="proxyPort" value={formData.proxyPort} onChange={handleChange} disabled={!formData.useProxy} 
                  />
                  <TextField fullWidth placeholder="Username" size="small" sx={{ bgcolor: '#fff' }} 
                    name="proxyUsername" value={formData.proxyUsername} onChange={handleChange} disabled={!formData.useProxy} 
                  />
                  <TextField fullWidth placeholder="Password" type="password" size="small" sx={{ bgcolor: '#fff' }} 
                    name="proxyPassword" value={formData.proxyPassword} onChange={handleChange} disabled={!formData.useProxy} 
                  />
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>

      <Box mb={4}>
        <Typography variant="subtitle1" fontWeight="bold">Activity Log</Typography>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 1 }}>
          Last 5 sync attempts
        </Typography>
        
        <TableContainer sx={{ borderTop: '1px solid #eee' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#555' }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#555' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#555' }}>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activityLogs.map((log) => (
                <TableRow key={log.id} sx={{ '& td': { borderBottom: '1px solid #f5f5f5' } }}>
                  <TableCell sx={{ fontSize: '0.85rem', py: 1.5, color: '#333' }}>{log.date}</TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {log.status === 'Success' ? (
                        <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                      ) : (
                        <CancelIcon sx={{ color: '#d32f2f', fontSize: 18 }} />
                      )}
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', color: log.status === 'Success' ? '#2e7d32' : '#d32f2f' }}>
                        {log.status}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', py: 1.5, color: '#555' }}>{log.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box textAlign="right">
         <Button variant="contained" color="primary" onClick={handleSave} sx={{ bgcolor: '#3b6eac', textTransform: 'none' }}>
           Save Configuration
         </Button>
      </Box>
      
    </Box>
  );
};

export default ManageFeedSetup;