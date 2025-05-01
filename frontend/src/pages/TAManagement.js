import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Snackbar,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { taAPI } from '../services/api';

const TAManagement = () => {
  const [tas, setTAs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTA, setSelectedTA] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    workload: 0,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchTAs();
  }, []);

  const fetchTAs = async () => {
    try {
      setLoading(true);
      const response = await taAPI.getTAs();
      setTAs(response.data.results || []);
    } catch (err) {
      setError('Failed to fetch TAs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (ta = null) => {
    if (ta) {
      setFormData({
        name: ta.name,
        department: ta.department,
        workload: ta.workload,
      });
      setSelectedTA(ta);
    } else {
      setFormData({
        name: '',
        department: '',
        workload: 0,
      });
      setSelectedTA(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTA(null);
    setFormData({
      name: '',
      department: '',
      workload: 0,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (selectedTA) {
        await taAPI.updateTA(selectedTA.id, formData);
        setSnackbar({
          open: true,
          message: 'TA updated successfully',
          severity: 'success',
        });
      } else {
        await taAPI.createTA(formData);
        setSnackbar({
          open: true,
          message: 'TA created successfully',
          severity: 'success',
        });
      }
      fetchTAs();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: selectedTA ? 'Failed to update TA' : 'Failed to create TA',
        severity: 'error',
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taId) => {
    if (window.confirm('Are you sure you want to delete this TA?')) {
      try {
        setLoading(true);
        await taAPI.deleteTA(taId);
        setSnackbar({
          open: true,
          message: 'TA deleted successfully',
          severity: 'success',
        });
        fetchTAs();
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to delete TA',
          severity: 'error',
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getWorkloadColor = (workload) => {
    if (workload < 10) return 'success';
    if (workload < 20) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          TA Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New TA
        </Button>
      </Box>

      <Grid container spacing={3}>
        {tas.map((ta) => (
          <Grid item xs={12} sm={6} md={4} key={ta.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {ta.name}
                  </Typography>
                  <Chip
                    label={`${ta.workload} hrs/week`}
                    color={getWorkloadColor(ta.workload)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Department: {ta.department}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(ta)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(ta.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTA ? 'Edit TA' : 'Add New TA'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Workload (hours/week)"
                type="number"
                value={formData.workload}
                onChange={(e) => setFormData({ ...formData, workload: parseInt(e.target.value, 10) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedTA ? 'Save Changes' : 'Add TA'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TAManagement; 