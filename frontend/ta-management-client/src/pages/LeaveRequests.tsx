import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { SelectChangeEvent } from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { format, parseISO } from 'date-fns';
import * as leaveService from '../services/leaveService';

const LeaveRequests: React.FC = () => {
  const { authState } = useAuth();
  const { user } = authState;
  
  // State variables for leave requests
  const [leaveRequests, setLeaveRequests] = useState<leaveService.LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<leaveService.LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the new leave request dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [documentation, setDocumentation] = useState<File | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  
  // State for success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
  
  // Fetch leave types and leave requests on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching leave data for TA...');
        
        // Try to get cached data first
        const cachedRequests = localStorage.getItem('ta_leave_requests');
        const cachedTypes = localStorage.getItem('leave_types');
        
        // Set from cache initially if available
        if (cachedRequests) {
          console.log('Using cached leave requests');
          try {
            const parsedRequests = JSON.parse(cachedRequests);
            setLeaveRequests(Array.isArray(parsedRequests) ? parsedRequests : []);
          } catch (e) {
            console.error('Error parsing cached leave requests:', e);
          }
        }
        
        if (cachedTypes) {
          console.log('Using cached leave types');
          try {
            const parsedTypes = JSON.parse(cachedTypes);
            setLeaveTypes(Array.isArray(parsedTypes) ? parsedTypes : []);
          } catch (e) {
            console.error('Error parsing cached leave types:', e);
          }
        }
        
        // Fetch fresh data
        console.log('Fetching fresh leave data from API');
        const [typesData, requestsData] = await Promise.all([
          leaveService.getLeaveTypes(),
          leaveService.getMyLeaveRequests()
        ]);
        console.log('Received leave types:', typesData);
        console.log('Received leave requests:', requestsData);
        
        // Add hardcoded types if none are received from the API
        if (!Array.isArray(typesData) || typesData.length === 0) {
          console.log('Using hardcoded leave types');
          const hardcodedTypes = [
            { id: 1, name: 'Sick Leave', description: 'For medical issues', requires_documentation: true },
            { id: 2, name: 'Academic Leave', description: 'For academic events', requires_documentation: true },
            { id: 3, name: 'Personal Leave', description: 'For personal matters', requires_documentation: false },
            { id: 4, name: 'Family Emergency', description: 'For family emergencies', requires_documentation: true },
            { id: 5, name: 'Conference Leave', description: 'For conferences', requires_documentation: true }
          ];
          setLeaveTypes(hardcodedTypes);
          localStorage.setItem('leave_types', JSON.stringify(hardcodedTypes));
        } else {
          setLeaveTypes(typesData);
          localStorage.setItem('leave_types', JSON.stringify(typesData));
        }
        
        // Update leave requests if received successfully
        if (Array.isArray(requestsData) && requestsData.length > 0) {
          setLeaveRequests(requestsData);
          localStorage.setItem('ta_leave_requests', JSON.stringify(requestsData));
        } else if (!cachedRequests) {
          // Only set empty array if no cached data was available
          setLeaveRequests([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching leave data:', err);
        
        // Even if there's an error, set hardcoded leave types
        const hardcodedTypes = [
          { id: 1, name: 'Sick Leave', description: 'For medical issues', requires_documentation: true },
          { id: 2, name: 'Academic Leave', description: 'For academic events', requires_documentation: true },
          { id: 3, name: 'Personal Leave', description: 'For personal matters', requires_documentation: false },
          { id: 4, name: 'Family Emergency', description: 'For family emergencies', requires_documentation: true },
          { id: 5, name: 'Conference Leave', description: 'For conferences', requires_documentation: true }
        ];
        setLeaveTypes(hardcodedTypes);
        
        // Don't clear existing requests if we're just having a temporary API error
        if (!localStorage.getItem('ta_leave_requests')) {
          setLeaveRequests([]);
        }
        
        setError('Failed to load leave data. Using default leave types.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Dialog handlers
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setStartDate('');
    setEndDate('');
    setLeaveType('');
    setReason('');
    setDocumentation(null);
    setDialogError(null);
  };
  
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };
  
  const handleTypeChange = (event: SelectChangeEvent<number | string>) => {
    setLeaveType(event.target.value as number);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setDocumentation(event.target.files[0]);
    }
  };
  
  const handleSubmitRequest = async () => {
    // Validate form
    if (!startDate || !endDate || !leaveType || !reason) {
      setDialogError('Please fill in all required fields');
      return;
    }
    
    if (new Date(endDate) < new Date(startDate)) {
      setDialogError('End date cannot be before start date');
      return;
    }
    
    try {
      setDialogLoading(true);
      setDialogError(null);
      
      // Create the leave request data
      const leaveRequestData: leaveService.LeaveRequestCreate = {
        leave_type: leaveType as number,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        documentation: documentation
      };
      
      console.log('Submitting leave request:', leaveRequestData);
      
      // Submit the leave request
      const response = await leaveService.createLeaveRequest(leaveRequestData);
      console.log('Leave request created successfully:', response);
      
      // Update the leave requests list
      const updatedRequests = [...leaveRequests, response];
      setLeaveRequests(updatedRequests);
      
      // Update localStorage
      localStorage.setItem('ta_leave_requests', JSON.stringify(updatedRequests));
      
      // Show success message
      setSuccessMessage('Leave request submitted successfully');
      
      // Close the dialog
      handleCloseDialog();
    } catch (err) {
      console.error('Error submitting leave request:', err);
      setDialogError('Failed to submit leave request. Please try again.');
    } finally {
      setDialogLoading(false);
    }
  };
  
  // Delete request handlers
  const handleOpenDeleteDialog = (requestId: number) => {
    setRequestToDelete(requestId);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRequestToDelete(null);
  };
  
  const handleDeleteRequest = async () => {
    if (requestToDelete === null) return;
    
    try {
      setLoading(true);
      await leaveService.cancelLeaveRequest(requestToDelete);
      console.log('Leave request cancelled successfully:', requestToDelete);
      
      // Remove the request from the list
      const updatedRequests = leaveRequests.filter(req => req.id !== requestToDelete);
      setLeaveRequests(updatedRequests);
      
      // Update localStorage
      localStorage.setItem('ta_leave_requests', JSON.stringify(updatedRequests));
      
      // Show success message
      setSuccessMessage('Leave request cancelled successfully');
      
      // Close the dialog
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error cancelling leave request:', err);
      setError('Failed to cancel leave request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper functions
  const getStatusChip = (status: string) => {
    let color: 'warning' | 'success' | 'error' | 'default' = 'default';
    let label = status;
    
    switch (status) {
      case 'PENDING':
        color = 'warning';
        label = 'Pending';
        break;
      case 'APPROVED':
        color = 'success';
        label = 'Approved';
        break;
      case 'REJECTED':
        color = 'error';
        label = 'Rejected';
        break;
      case 'CANCELLED':
        color = 'default';
        label = 'Cancelled';
        break;
    }
    
    return (
      <Chip 
        label={label} 
        color={color}
        size="small"
      />
    );
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (err) {
      return dateString;
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              My Leave Requests
            </Typography>
            {user?.role === 'TA' && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={handleOpenDialog}
                disabled={loading}
              >
                New Request
              </Button>
            )}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            Submit and track your leave requests
          </Typography>
          
          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Loading indicator */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ mt: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Request Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date Range</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body1">
                            No leave requests found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (Array.isArray(leaveRequests) ? leaveRequests : []).map(request => (
                        <TableRow key={request.id}>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>{request.leave_type_name}</TableCell>
                          <TableCell>
                            {formatDate(request.start_date)} to {formatDate(request.end_date)}
                          </TableCell>
                          <TableCell>{request.duration_days} day{request.duration_days !== 1 ? 's' : ''}</TableCell>
                          <TableCell>{getStatusChip(request.status)}</TableCell>
                          <TableCell>
                            {request.status === 'PENDING' && (
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleOpenDeleteDialog(request.id)}
                                title="Cancel request"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip label="Pending" color="warning" size="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">Waiting for approval</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip label="Approved" color="success" size="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">Request approved</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip label="Rejected" color="error" size="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">Request rejected</Typography>
                </Box>
              </Stack>
            </>
          )}
        </Paper>
      </Box>
      
      {/* New Leave Request Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          New Leave Request
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogError}
              </Alert>
            )}
            
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel id="leave-type-label">Leave Type *</InputLabel>
                <Select
                  labelId="leave-type-label"
                  value={leaveType}
                  label="Leave Type *"
                  onChange={handleTypeChange}
                  required
                >
                  {leaveTypes.map(type => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Start Date *"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                required
                fullWidth
              />
              
              <TextField
                label="End Date *"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                required
                fullWidth
              />
              
              <TextField
                label="Reason *"
                multiline
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                fullWidth
              />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Supporting Documentation (Optional)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<FileUploadIcon />}
                  >
                    Upload File
                    <input
                      type="file"
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>
                  {documentation && (
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      {documentation.name}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={dialogLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitRequest} 
            variant="contained"
            disabled={dialogLoading}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : null}
          >
            {dialogLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>
          Cancel Leave Request
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this leave request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            No, Keep It
          </Button>
          <Button 
            onClick={handleDeleteRequest} 
            color="error"
            variant="contained"
          >
            Yes, Cancel Request
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccessMessage(null)} 
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LeaveRequests; 