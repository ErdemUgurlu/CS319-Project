import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Grid as MuiGrid,
  IconButton,
  Card,
  CardContent,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BalanceIcon from '@mui/icons-material/Balance';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Interface for TA Assignment
interface TAAssignment {
  id: number;
  ta: number;
  ta_full_name: string;
  ta_email: string;
  ta_employment_type: string;
  ta_academic_level: string;
  assigned_at: string;
  department: number;
}

// Interface for Available TA
interface AvailableTA {
  id: number;
  email: string;
  full_name: string;
  department: string;
  department_name: string;
  academic_level: string;
  employment_type: string;
}

const ManageTeachingAssistants: React.FC = () => {
  const { authState } = useAuth();
  const [myTAs, setMyTAs] = useState<TAAssignment[]>([]);
  const [availableTAs, setAvailableTAs] = useState<AvailableTA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [selectedTA, setSelectedTA] = useState<TAAssignment | null>(null);
  const [selectedAvailableTA, setSelectedAvailableTA] = useState<AvailableTA | null>(null);
  
  useEffect(() => {
    // Only allow instructors to access this page
    if (authState.user?.role !== 'INSTRUCTOR') {
      setError('Only instructors can manage teaching assistants');
      return;
    }
    
    fetchTAs();
  }, [authState.user]);
  
  const fetchTAs = async () => {
    setLoading(true);
    try {
      console.log('Fetching TAs with auth token:', localStorage.getItem('access_token'));
      console.log('Current user role:', authState.user?.role);
      console.log('API URL being used:', API_URL);
      
      const [myTAsResponse, availableTAsResponse] = await Promise.all([
        axios.get(`${API_URL}/accounts/instructor/tas/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }),
        axios.get(`${API_URL}/accounts/instructor/available-tas/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        })
      ]);
      
      console.log('Raw myTAs response:', myTAsResponse);
      console.log('Raw availableTAs response:', availableTAsResponse);
      
      // Process myTAs response - handle different possible response formats
      let taData: TAAssignment[] = [];
      if (myTAsResponse.data) {
        if (Array.isArray(myTAsResponse.data)) {
          taData = myTAsResponse.data;
        } else if (Array.isArray(myTAsResponse.data.results)) {
          taData = myTAsResponse.data.results;
        } else if (typeof myTAsResponse.data === 'object') {
          // Try to extract any array property from the response
          const arrayProp = Object.values(myTAsResponse.data).find(val => Array.isArray(val));
          if (arrayProp) {
            taData = arrayProp as TAAssignment[];
          }
        }
      }
      console.log('Processed TA Data:', taData);
      setMyTAs(taData);
      
      // Process availableTAs response - handle different possible response formats
      let availableTaData: AvailableTA[] = [];
      if (availableTAsResponse.data) {
        if (Array.isArray(availableTAsResponse.data)) {
          availableTaData = availableTAsResponse.data;
        } else if (Array.isArray(availableTAsResponse.data.results)) {
          availableTaData = availableTAsResponse.data.results;
        } else if (typeof availableTAsResponse.data === 'object') {
          // Try to extract any array property from the response
          const arrayProp = Object.values(availableTAsResponse.data).find(val => Array.isArray(val));
          if (arrayProp) {
            availableTaData = arrayProp as AvailableTA[];
          }
        }
      }
      console.log('Processed Available TA Data:', availableTaData);
      setAvailableTAs(availableTaData);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching TAs:', err);
      if (axios.isAxiosError(err)) {
        console.error('Axios error details:', {
          status: err.response?.status,
          data: err.response?.data,
          headers: err.response?.headers,
          message: err.message
        });
      }
      setError('Failed to load teaching assistants data');
      setMyTAs([]);
      setAvailableTAs([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddTA = async () => {
    if (!selectedAvailableTA) return;
    
    try {
      await axios.post(`${API_URL}/accounts/instructor/assign-ta/`, 
        { ta_id: selectedAvailableTA.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      
      setSuccess(`${selectedAvailableTA.full_name} has been added to your TAs`);
      setOpenAddDialog(false);
      fetchTAs(); // Refresh the lists
    } catch (err: any) {
      console.error('Error adding TA:', err);
      setError(err.response?.data?.error || 'Failed to add TA');
    }
  };
  
  const handleRemoveTA = async () => {
    if (!selectedTA) return;
    
    try {
      await axios.post(`${API_URL}/accounts/instructor/remove-ta/`, 
        { assignment_id: selectedTA.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      
      setSuccess(`${selectedTA.ta_full_name} has been removed from your TAs`);
      setOpenRemoveDialog(false);
      fetchTAs(); // Refresh the lists
    } catch (err: any) {
      console.error('Error removing TA:', err);
      setError(err.response?.data?.error || 'Failed to remove TA');
    }
  };
  
  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };
  
  const getEmploymentTypeChip = (type: string) => {
    if (type === 'FULL_TIME') {
      return <Chip label="Full-Time" color="primary" size="small" />;
    } else if (type === 'PART_TIME') {
      return <Chip label="Part-Time" color="secondary" size="small" />;
    }
    return null;
  };
  
  const getAcademicLevelChip = (level: string) => {
    if (level === 'PHD') {
      return <Chip label="PhD" color="success" size="small" />;
    } else if (level === 'MASTERS') {
      return <Chip label="Master's" color="info" size="small" />;
    }
    return null;
  };
  
  if (loading) {
    return <Typography>Loading teaching assistants data...</Typography>;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Manage Teaching Assistants
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* My TAs section */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">My Teaching Assistants</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenAddDialog(true)}
            >
              Add TA
            </Button>
          </Box>
          
          {myTAs.length === 0 ? (
            <Typography color="textSecondary">
              You don't have any teaching assistants assigned to you yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Assigned Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myTAs.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell>{ta.ta_full_name}</TableCell>
                      <TableCell>{ta.ta_email}</TableCell>
                      <TableCell>
                        {getEmploymentTypeChip(ta.ta_employment_type)}
                      </TableCell>
                      <TableCell>
                        {getAcademicLevelChip(ta.ta_academic_level)}
                      </TableCell>
                      <TableCell>
                        {new Date(ta.assigned_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="View/Adjust Workload">
                            <IconButton 
                              component={RouterLink} 
                              to={`/manage-workload/${ta.ta}`}
                              color="primary"
                            >
                              <BalanceIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Assign Tasks">
                            <IconButton 
                              component={RouterLink} 
                              to={`/assign-tasks/${ta.ta}`}
                              color="secondary"
                            >
                              <AssignmentIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove TA">
                            <IconButton 
                              color="error" 
                              onClick={() => {
                                setSelectedTA(ta);
                                setOpenRemoveDialog(true);
                              }}
                            >
                              <PersonRemoveIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
      
      {/* Add TA Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
        <DialogTitle>Add Teaching Assistant</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Select a TA from the available TAs in your department:
          </Typography>
          
          {availableTAs.length === 0 ? (
            <Typography color="textSecondary">
              No available teaching assistants found in your department.
              <br />
              <em>(Debug info: API returned empty array - availableTAs.length: {availableTAs.length})</em>
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {availableTAs.map((ta) => (
                <Card 
                  key={ta.id}
                  variant={selectedAvailableTA?.id === ta.id ? "outlined" : "elevation"}
                  sx={{ 
                    cursor: 'pointer', 
                    border: selectedAvailableTA?.id === ta.id ? '2px solid #1976d2' : 'none',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => setSelectedAvailableTA(ta)}
                >
                  <CardContent>
                    <Typography variant="h6">{ta.full_name}</Typography>
                    <Typography color="textSecondary" gutterBottom>{ta.email}</Typography>
                    <Box display="flex" gap={1} mt={1}>
                      {getAcademicLevelChip(ta.academic_level)}
                      {getEmploymentTypeChip(ta.employment_type)}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddTA} 
            color="primary" 
            variant="contained"
            disabled={!selectedAvailableTA}
          >
            Add TA
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Remove TA Dialog */}
      <Dialog open={openRemoveDialog} onClose={() => setOpenRemoveDialog(false)}>
        <DialogTitle>Remove Teaching Assistant</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{selectedTA?.ta_full_name}</strong> from your teaching assistants?
          </Typography>
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            This TA will no longer be assigned to you and you will not be able to assign tasks to them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveDialog(false)}>Cancel</Button>
          <Button onClick={handleRemoveTA} color="error" variant="contained">
            Remove TA
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

export default ManageTeachingAssistants; 