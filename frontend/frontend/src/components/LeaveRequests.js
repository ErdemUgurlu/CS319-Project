import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';

const LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newRequest, setNewRequest] = useState({
    leave_type: 'sick',
    start_date: null,
    end_date: null,
    reason: '',
    course: '',
  });

  const LEAVE_TYPES = [
    { value: 'sick', label: 'Sick Leave' },
    { value: 'vacation', label: 'Vacation Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/leave-requests/', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      const data = await response.json();
      setLeaveRequests(data);
    } catch (error) {
      setError(error.message);
      setSnackbar({
        open: true,
        message: 'Failed to fetch leave requests',
        severity: 'error',
      });
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNewRequest({
      leave_type: 'sick',
      start_date: null,
      end_date: null,
      reason: '',
      course: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRequest((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/leave-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newRequest,
          start_date: format(newRequest.start_date, 'yyyy-MM-dd'),
          end_date: format(newRequest.end_date, 'yyyy-MM-dd'),
        }),
      });

      if (!response.ok) throw new Error('Failed to create leave request');
      
      setSnackbar({
        open: true,
        message: 'Leave request created successfully',
        severity: 'success',
      });
      fetchLeaveRequests();
      handleClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error',
      });
    }
  };

  const handleStatusAction = async (id, action) => {
    try {
      const response = await fetch(`http://localhost:8000/api/leave-requests/${id}/${action}/`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`Failed to ${action} leave request`);

      setSnackbar({
        open: true,
        message: `Leave request ${action}ed successfully`,
        severity: 'success',
      });
      fetchLeaveRequests();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Leave Requests
        </Typography>
        <Button
          variant="contained"
          onClick={handleOpen}
          sx={{ backgroundColor: '#0A2647', '&:hover': { backgroundColor: '#144272' } }}
        >
          New Request
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>TA Name</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.user_name}</TableCell>
                <TableCell>{request.course}</TableCell>
                <TableCell>{format(new Date(request.start_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{format(new Date(request.end_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell>
                  <Chip
                    label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    color={getStatusColor(request.status)}
                  />
                </TableCell>
                <TableCell>
                  {request.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="success"
                        onClick={() => handleStatusAction(request.id, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleStatusAction(request.id, 'reject')}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>New Leave Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="course"
                label="Course"
                fullWidth
                value={newRequest.course}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                name="leave_type"
                label="Leave Type"
                fullWidth
                value={newRequest.leave_type}
                onChange={handleInputChange}
                required
              >
                {LEAVE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={newRequest.start_date}
                  onChange={(date) => setNewRequest((prev) => ({ ...prev, start_date: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={newRequest.end_date}
                  onChange={(date) => setNewRequest((prev) => ({ ...prev, end_date: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="reason"
                label="Reason"
                fullWidth
                multiline
                rows={4}
                value={newRequest.reason}
                onChange={handleInputChange}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ backgroundColor: '#0A2647', '&:hover': { backgroundColor: '#144272' } }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveRequests; 