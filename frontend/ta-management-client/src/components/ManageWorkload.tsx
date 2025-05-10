import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid as MuiGrid,
  TextField,
  Button,
  LinearProgress,
  Divider,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Interface for TA
interface TA {
  id: number;
  full_name: string;
  email: string;
  academic_level: string;
  employment_type: string;
}

// Interface for Workload data
interface WorkloadData {
  ta_id: number;
  ta_name: string;
  email: string;
  employment_type: string;
  current_weekly_hours: number;
  max_weekly_hours: number;
  is_overloaded: boolean;
  total_assigned_hours: number;
  manual_adjustments: number;
  completed_task_hours: number;
  academic_level: string;
}

// Interface for Workload adjustment history
interface AdjustmentHistory {
  id: number;
  instructor: string;
  hours: number;
  reason: string;
  date: string;
  created_at: string;
}

const ManageWorkload: React.FC = () => {
  const { authState } = useAuth();
  const { taId } = useParams<{ taId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [ta, setTA] = useState<TA | null>(null);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistory[]>([]);
  
  // Adjustment form
  const [openAdjustmentDialog, setOpenAdjustmentDialog] = useState(false);
  const [adjustmentHours, setAdjustmentHours] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  
  useEffect(() => {
    // Only allow instructors to access this page
    if (authState.user?.role !== 'INSTRUCTOR') {
      setError('Only instructors can manage TA workloads');
      return;
    }
    
    fetchData();
  }, [authState.user, taId]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get workload data
      const workloadResponse = await axios.get(`${API_URL}/workload/instructor/ta-workloads/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      
      console.log('Workload data received:', workloadResponse.data);
      
      // Ensure workloadResponse.data is an array
      const workloads = Array.isArray(workloadResponse.data) ? workloadResponse.data : [];
      
      // Find the current TA's workload
      const taWorkload = workloads.find((wl: WorkloadData) => wl.ta_id === Number(taId));
      
      if (!taWorkload) {
        throw new Error('No workload data found for this TA');
      }
      
      setWorkload(taWorkload);
      setTA({
        id: taWorkload.ta_id,
        full_name: taWorkload.ta_name,
        email: taWorkload.email,
        academic_level: taWorkload.academic_level,
        employment_type: taWorkload.employment_type
      });
      
      // Get adjustment history
      const historyResponse = await axios.get(`${API_URL}/workload/instructor/adjustment-history/`, {
        params: { ta_id: taId },
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      
      console.log('Adjustment history received:', historyResponse.data);
      
      // Ensure historyResponse.data is an array
      const history = Array.isArray(historyResponse.data) ? historyResponse.data : [];
      setAdjustmentHistory(history);
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching workload data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load workload data');
      setAdjustmentHistory([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitAdjustment = async () => {
    if (!adjustmentHours || !adjustmentReason) return;
    
    setAdjusting(true);
    try {
      await axios.post(`${API_URL}/workload/instructor/adjust-workload/`, 
        {
          ta_id: taId,
          hours: parseFloat(adjustmentHours),
          reason: adjustmentReason
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      
      setSuccess('Workload adjustment has been recorded successfully');
      setOpenAdjustmentDialog(false);
      setAdjustmentHours('');
      setAdjustmentReason('');
      
      // Refresh data
      fetchData();
    } catch (err: any) {
      console.error('Error adjusting workload:', err);
      setError(err.response?.data?.error || 'Failed to adjust workload');
    } finally {
      setAdjusting(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };
  
  const getWorkloadUtilizationPercent = (): number => {
    if (!workload) return 0;
    return Math.min(100, (workload.current_weekly_hours / workload.max_weekly_hours) * 100);
  };
  
  const getWorkloadColor = (): 'success' | 'warning' | 'error' => {
    const percent = getWorkloadUtilizationPercent();
    if (percent < 70) return 'success';
    if (percent < 90) return 'warning';
    return 'error';
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!ta || !workload) {
    return (
      <Box sx={{ my: 4 }}>
        <Typography color="error" variant="h6">
          No data available for this teaching assistant.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={() => navigate('/manage-tas')}
        >
          Back to TA Management
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Manage Workload: {ta.full_name}
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/manage-tas')}
        >
          Back to All TAs
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
        {/* TA Information Card */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.3% - 16px)' } }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>TA Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body1">{ta.full_name}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1">{ta.email}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Academic Level</Typography>
              <Chip
                label={ta.academic_level === 'PHD' ? 'PhD' : ta.academic_level === 'MASTERS' ? 'Master\'s' : ta.academic_level}
                color={ta.academic_level === 'PHD' ? 'success' : 'info'}
                size="small"
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Employment Type</Typography>
              <Chip
                label={ta.employment_type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'}
                color={ta.employment_type === 'FULL_TIME' ? 'primary' : 'secondary'}
                size="small"
              />
            </Box>
          </Paper>
        </Box>
        
        {/* Workload Summary Card */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.7% - 16px)' } }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Workload Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  Weekly Hours: {workload.current_weekly_hours} / {workload.max_weekly_hours}
                </Typography>
                <Typography variant="body2" color={workload.is_overloaded ? "error" : "inherit"}>
                  {workload.is_overloaded ? "Overloaded" : "Within Limit"}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getWorkloadUtilizationPercent()} 
                color={getWorkloadColor()}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.3% - 8px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h5" align="center">{workload.completed_task_hours}</Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Completed Task Hours
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.3% - 8px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h5" align="center">{workload.manual_adjustments}</Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Manual Adjustments
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.3% - 8px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h5" align="center">{workload.total_assigned_hours}</Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Total Assigned Hours
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => setOpenAdjustmentDialog(true)}
              >
                Adjust Workload
              </Button>
            </Box>
          </Paper>
        </Box>
        
        {/* Adjustment History */}
        <Box sx={{ width: '100%' }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Adjustment History</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {adjustmentHistory.length === 0 ? (
              <Typography color="text.secondary">
                No workload adjustments have been made for this TA.
              </Typography>
            ) : (
              <List>
                {adjustmentHistory.map((adjustment) => (
                  <ListItem key={adjustment.id} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography component="span">
                            {adjustment.hours >= 0 
                              ? `Added ${adjustment.hours} hours` 
                              : `Reduced ${Math.abs(adjustment.hours)} hours`}
                          </Typography>
                          <Chip 
                            label={adjustment.hours >= 0 ? "Increase" : "Decrease"} 
                            color={adjustment.hours >= 0 ? "success" : "error"}
                            size="small" 
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            Reason: {adjustment.reason}
                          </Typography>
                          <br />
                          <Typography component="span" variant="caption" color="text.secondary">
                            By {adjustment.instructor} on {new Date(adjustment.date).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
      
      {/* Adjustment Dialog */}
      <Dialog open={openAdjustmentDialog} onClose={() => !adjusting && setOpenAdjustmentDialog(false)}>
        <DialogTitle>Adjust Workload</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Add or remove hours from the TA's workload. Use positive values to add hours
            or negative values to reduce hours.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Hours Adjustment"
            type="number"
            fullWidth
            value={adjustmentHours}
            onChange={(e) => setAdjustmentHours(e.target.value)}
            inputProps={{ step: "0.5" }}
            helperText="Use positive values to add hours, negative values to reduce"
            disabled={adjusting}
          />
          
          <TextField
            margin="dense"
            label="Reason for Adjustment"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            disabled={adjusting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdjustmentDialog(false)} disabled={adjusting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitAdjustment} 
            variant="contained" 
            color="primary"
            disabled={!adjustmentHours || !adjustmentReason || adjusting}
          >
            {adjusting ? <CircularProgress size={24} /> : "Save Adjustment"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbars for feedback */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageWorkload; 