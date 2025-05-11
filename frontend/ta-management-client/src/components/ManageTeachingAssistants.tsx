import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Card,
  CardContent,
  Chip,
  Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BalanceIcon from '@mui/icons-material/Balance';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  
  // Import TAs states
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedTaDetails, setImportedTaDetails] = useState<Array<{ email: string; name: string; bilkent_id: string; temporary_password: string }> | null>(null);

  const fetchTAs = useCallback(async () => {
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
      
      let taData: TAAssignment[] = [];
      if (myTAsResponse.data) {
        if (Array.isArray(myTAsResponse.data)) {
          taData = myTAsResponse.data;
        } else if (Array.isArray(myTAsResponse.data.results)) {
          taData = myTAsResponse.data.results;
        } else if (typeof myTAsResponse.data === 'object') {
          const arrayProp = Object.values(myTAsResponse.data).find(val => Array.isArray(val));
          if (arrayProp) {
            taData = arrayProp as TAAssignment[];
          }
        }
      }
      console.log('Processed TA Data:', taData);
      setMyTAs(taData);
      
      let availableTaData: AvailableTA[] = [];
      if (availableTAsResponse.data) {
        if (Array.isArray(availableTAsResponse.data)) {
          availableTaData = availableTAsResponse.data;
        } else if (Array.isArray(availableTAsResponse.data.results)) {
          availableTaData = availableTAsResponse.data.results;
        } else if (typeof availableTAsResponse.data === 'object') {
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
  }, [authState.user?.role]);
  
  useEffect(() => {
    if (!authState.user || !['INSTRUCTOR', 'STAFF', 'ADMIN'].includes(authState.user.role)) {
      setError('You are not authorized to view this page.');
      setLoading(false);
      return;
    }
    
    if (authState.user.role === 'INSTRUCTOR') {
      fetchTAs();
    } else {
      if (authState.user.role !== 'INSTRUCTOR') {
        setLoading(false);
      }
    }
  }, [authState.user, fetchTAs]);
  
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
    setImportSummary(null);
    setImportErrors([]);
    setImportedTaDetails(null);
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
  
  // Handler for file selection in the import dialog
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // Handler for submitting the import TA file
  const handleImportTAs = async () => {
    if (!selectedFile) {
      setError('Please select a file to import.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/accounts/import-tas/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      setSuccess(response.data.message || 'TAs imported successfully.');
      if (response.data.summary) setImportSummary(response.data.summary);
      
      if (response.data.imported_tas && response.data.imported_tas.length > 0) {
        setImportedTaDetails(response.data.imported_tas);
      }

      if (response.data.errors && response.data.errors.length > 0) {
        setImportErrors(response.data.errors.map((err: {row: number; errors: string[]}) => `Row ${err.row}: ${err.errors.join(', ')}`));
        setError("Import completed with some errors. See details below.");
      } else {
        setImportErrors([]);
      }
      setOpenImportDialog(false);
      setSelectedFile(null);
      if (authState.user?.role === 'INSTRUCTOR') {
         fetchTAs();
      }
    } catch (err) {
      console.error('Error importing TAs:', err);
      let errorMessage = 'Failed to import TAs.';
      if (axios.isAxiosError(err)) {
        const serverError = err.response?.data;
        if (serverError) {
          if (serverError.detail) {
            errorMessage = serverError.detail;
          } else if (serverError.message) {
            errorMessage = serverError.message;
          } else if (Array.isArray(serverError.errors) && serverError.errors.length > 0) {
             errorMessage = "Import failed. See details below.";
             setImportErrors(serverError.errors.map((e: {row: number; errors: string[]}) => `Row ${e.row}: ${e.errors.join(', ')}`));
          } else if (typeof serverError === 'string') {
            errorMessage = serverError;
          }
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !openImportDialog) { 
    return <Typography>Loading teaching assistants data...</Typography>;
  }
  
  const canImportTAs = authState.user && (authState.user.role === 'STAFF' || authState.user.role === 'ADMIN');

  if (!authState.user || (!canImportTAs && authState.user.role !== 'INSTRUCTOR')) {
    if (error) return <Typography color="error">{error}</Typography>; 
    if (loading) return <Typography>Loading...</Typography>; 
    return <Typography>You do not have permission to view this specific content.</Typography>; 
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import Teaching Assistants
      </Typography>
      
      {canImportTAs && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<UploadFileIcon />}
            onClick={() => setOpenImportDialog(true)}
          >
            Import TAs
          </Button>
        </Box>
      )}

      <Dialog open={openImportDialog} onClose={() => { setOpenImportDialog(false); setSelectedFile(null); setImportErrors([]); }}>
        <DialogTitle>Import TAs from Excel</DialogTitle>
        <DialogContent>
          <input
            accept=".xlsx"
            style={{ display: 'none' }}
            id="raised-button-file"
            multiple={false}
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="raised-button-file">
            <Button variant="outlined" component="span" startIcon={<UploadFileIcon />} sx={{ mb: 2 }}>
              Choose Excel File
            </Button>
          </label>
          {selectedFile && <Typography variant="body2" sx={{ mb: 2 }}>Selected file: {selectedFile.name}</Typography>}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Please ensure your Excel (.xlsx) file includes these column headers (case-insensitive):
            Name, Surname, Bilkent ID, IBAN, Phone Number, Email, Academic Level, Undergraduate University, Workload Number, Employment Type.
          </Alert>
          
          {importErrors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Import Errors:</Typography>
              {importErrors.map((errMsg, index) => (
                <Typography variant="caption" display="block" key={index}>- {errMsg}</Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenImportDialog(false); setSelectedFile(null); setImportErrors([]); }}>Cancel</Button>
          <Button onClick={handleImportTAs} color="primary" disabled={!selectedFile || loading}>
            Upload and Process
          </Button>
        </DialogActions>
      </Dialog>

      {authState.user?.role === 'INSTRUCTOR' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
      )}
      
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
      
      <Snackbar 
        open={Boolean(
          error || 
          success || 
          importSummary || 
          (importErrors && importErrors.length > 0) || 
          (importedTaDetails && importedTaDetails.length > 0)
        )}
        autoHideDuration={15000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={error && !success ? "error" : "success"} sx={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}>
          {success || error || importSummary}
          {importedTaDetails && importedTaDetails.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="subtitle2">Successfully Imported TAs & Temporary Passwords:</Typography>
              <TableContainer component={Paper} sx={{ mt: 1, maxHeight: '250px' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Bilkent ID</TableCell>
                      <TableCell>Temporary Password</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importedTaDetails.map((ta, index) => (
                      <TableRow key={index}>
                        <TableCell>{ta.name}</TableCell>
                        <TableCell>{ta.email}</TableCell>
                        <TableCell>{ta.bilkent_id}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-all' }}>{ta.temporary_password}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          {importErrors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Import Errors:</Typography>
              {importErrors.map((errMsg, index) => (
                <Typography variant="caption" display="block" key={index}>- {errMsg}</Typography>
              ))}
            </Box>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageTeachingAssistants; 