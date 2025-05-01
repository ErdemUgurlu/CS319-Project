import React, { useState } from 'react';
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
  TextField,
  Grid,
  Alert,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, SwapHoriz as SwapIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';

const ProctoringSwap = () => {
  const [open, setOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedProctoring, setSelectedProctoring] = useState('');
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    examDate: '',
    examTime: '',
    course: '',
    reason: '',
    preferredTA: '',
  });
  
  // Mock data for swap requests
  const [requests, setRequests] = useState([
    {
      id: 1,
      examDate: '2024-04-25',
      examTime: '09:00',
      course: 'CS101',
      reason: 'Conflict with another exam',
      preferredTA: 'John Doe',
      status: 'Pending',
      requestedBy: 'Jane Smith',
      requestedById: 'TA2',
    },
    {
      id: 2,
      examDate: '2024-05-01',
      examTime: '14:00',
      course: 'CS102',
      reason: 'Medical appointment',
      preferredTA: 'Jane Smith',
      status: 'Approved',
      requestedBy: 'John Doe',
      requestedById: 'TA1',
    },
    {
      id: 3,
      examDate: '2024-05-10',
      examTime: '10:00',
      course: 'CS103',
      reason: 'Conference attendance',
      preferredTA: 'Any TA',
      status: 'Pending',
      requestedBy: 'Alice Johnson',
      requestedById: 'TA3',
    },
  ]);

  // Mock data for current user's proctoring tasks
  const userProctoringTasks = [
    {
      id: 1,
      date: '2024-04-25',
      time: '10:00',
      course: 'CS104',
      location: 'Room 101',
    },
    {
      id: 2,
      date: '2024-05-15',
      time: '14:00',
      course: 'CS105',
      location: 'Room 102',
    },
    {
      id: 3,
      date: '2024-05-20',
      time: '09:00',
      course: 'CS106',
      location: 'Room 103',
    },
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleClickOpen = () => {
    setOpen(true);
    setEditRequest(null);
    setFormData({
      examDate: '',
      examTime: '',
      course: '',
      reason: '',
      preferredTA: '',
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditRequest(null);
    setFormData({
      examDate: '',
      examTime: '',
      course: '',
      reason: '',
      preferredTA: '',
    });
  };

  const handleEdit = (request) => {
    setEditRequest(request);
    setFormData({
      examDate: request.examDate,
      examTime: request.examTime,
      course: request.course,
      reason: request.reason,
      preferredTA: request.preferredTA,
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    // Here you would typically make an API call to save the swap request
    console.log('Saving swap request:', formData);
    handleClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = (requestId) => {
    setRequests(prev => prev.filter(request => request.id !== requestId));
  };

  const handleSwapClick = (request) => {
    setSelectedRequest(request);
    setSelectedProctoring('');
    setSwapDialogOpen(true);
  };

  const handleSwapDialogClose = () => {
    setSwapDialogOpen(false);
    setSelectedRequest(null);
    setSelectedProctoring('');
  };

  const handleProctoringChange = (event) => {
    setSelectedProctoring(event.target.value);
  };

  const handleSwapConfirm = () => {
    if (!selectedProctoring) {
      setSnackbar({
        open: true,
        message: 'Please select a proctoring task to swap with',
        severity: 'error'
      });
      return;
    }

    // Here you would typically make an API call to process the swap
    console.log('Swapping proctoring duties:', {
      requestId: selectedRequest.id,
      selectedProctoringId: selectedProctoring
    });

    // Update the request status
    setRequests(prev => 
      prev.map(r => 
        r.id === selectedRequest.id ? { ...r, status: 'Approved', preferredTA: currentUser.name } : r
      )
    );

    // Show success message
    setSnackbar({
      open: true,
      message: `You have successfully swapped proctoring duties with ${selectedRequest.requestedBy}`,
      severity: 'success'
    });

    // Close the dialog
    handleSwapDialogClose();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Filter requests based on tab
  const filteredRequests = tabValue === 0 
    ? requests.filter(request => request.requestedById === currentUser?.id)
    : requests.filter(request => request.requestedById !== currentUser?.id && request.status === 'Pending');

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Proctoring Swap Requests
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          New Swap Request
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="My Requests" />
          <Tab label="Available Swaps" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Exam Date</TableCell>
              <TableCell>Exam Time</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Preferred TA</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.examDate}</TableCell>
                <TableCell>{request.examTime}</TableCell>
                <TableCell>{request.course}</TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell>{request.requestedBy}</TableCell>
                <TableCell>{request.preferredTA}</TableCell>
                <TableCell>
                  <Chip 
                    label={request.status} 
                    color={getStatusColor(request.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {tabValue === 0 ? (
                    <>
                      <Button 
                        size="small" 
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(request)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(request.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      color="primary"
                      variant="contained"
                      startIcon={<SwapIcon />}
                      onClick={() => handleSwapClick(request)}
                      disabled={request.status !== 'Pending'}
                    >
                      Swap
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                    {tabValue === 0 ? 'You have not made any swap requests yet.' : 'No available swap requests at the moment.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Swap Request Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editRequest ? 'Edit Swap Request' : 'New Swap Request'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="examDate"
                label="Exam Date"
                type="date"
                value={formData.examDate}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="examTime"
                label="Exam Time"
                type="time"
                value={formData.examTime}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="course"
                label="Course"
                value={formData.course}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="preferredTA"
                label="Preferred TA"
                value={formData.preferredTA}
                onChange={handleChange}
                variant="outlined"
                placeholder="Enter TA name or email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="reason"
                label="Reason for Swap"
                value={formData.reason}
                onChange={handleChange}
                variant="outlined"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editRequest ? 'Save Changes' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Swap Confirmation Dialog */}
      <Dialog open={swapDialogOpen} onClose={handleSwapDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Select Proctoring Task to Swap</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Swap Request Details:
              </Typography>
              <Typography variant="body2">
                <strong>Course:</strong> {selectedRequest.course}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {selectedRequest.examDate}
              </Typography>
              <Typography variant="body2">
                <strong>Time:</strong> {selectedRequest.examTime}
              </Typography>
              <Typography variant="body2">
                <strong>Requested By:</strong> {selectedRequest.requestedBy}
              </Typography>
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Your Proctoring Tasks:
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="proctoring-select-label">Select Proctoring Task</InputLabel>
            <Select
              labelId="proctoring-select-label"
              id="proctoring-select"
              value={selectedProctoring}
              label="Select Proctoring Task"
              onChange={handleProctoringChange}
            >
              {userProctoringTasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.course} - {task.date} {task.time} ({task.location})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedProctoring && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Task Details:
              </Typography>
              {userProctoringTasks.find(task => task.id === selectedProctoring) && (
                <>
                  <Typography variant="body2">
                    <strong>Course:</strong> {userProctoringTasks.find(task => task.id === selectedProctoring).course}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong> {userProctoringTasks.find(task => task.id === selectedProctoring).date}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Time:</strong> {userProctoringTasks.find(task => task.id === selectedProctoring).time}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Location:</strong> {userProctoringTasks.find(task => task.id === selectedProctoring).location}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSwapDialogClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSwapConfirm}
            disabled={!selectedProctoring}
          >
            Confirm Swap
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProctoringSwap; 