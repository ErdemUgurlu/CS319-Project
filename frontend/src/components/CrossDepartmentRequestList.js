import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon } from '@mui/icons-material';
import { proctoringAPI } from '../services/api';

const CrossDepartmentRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await proctoringAPI.getCrossDepartmentRequests();
      setRequests(response.data);
    } catch (error) {
      setError('Failed to fetch cross-department requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (request) => {
    setSelectedRequest(request);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequest(null);
  };

  const handleApprove = async () => {
    try {
      await proctoringAPI.approveCrossDepartmentRequest(selectedRequest.id);
      setSnackbar({
        open: true,
        message: 'Request approved successfully',
        severity: 'success'
      });
      fetchRequests();
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to approve request',
        severity: 'error'
      });
    }
  };

  const handleReject = async () => {
    try {
      await proctoringAPI.rejectCrossDepartmentRequest(selectedRequest.id);
      setSnackbar({
        open: true,
        message: 'Request rejected successfully',
        severity: 'success'
      });
      fetchRequests();
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to reject request',
        severity: 'error'
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Cross-Department Proctoring Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Exam</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Requesting Department</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.exam.name}</TableCell>
                <TableCell>{request.exam.course}</TableCell>
                <TableCell>{request.requesting_department.name}</TableCell>
                <TableCell>{new Date(request.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={request.status} 
                    color={getStatusColor(request.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        startIcon={<ApproveIcon />}
                        color="success"
                        onClick={() => handleOpenDialog(request)}
                        sx={{ mr: 1 }}
                      >
                        Approve
                      </Button>
                      <Button
                        startIcon={<RejectIcon />}
                        color="error"
                        onClick={() => handleOpenDialog(request)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {selectedRequest?.status === 'pending' ? 'Review Request' : 'Request Details'}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Exam Details:
              </Typography>
              <Typography>Course: {selectedRequest.exam.course}</Typography>
              <Typography>Date: {new Date(selectedRequest.exam.date).toLocaleString()}</Typography>
              <Typography>Location: {selectedRequest.exam.location}</Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
                Department Details:
              </Typography>
              <Typography>Requesting Department: {selectedRequest.requesting_department.name}</Typography>
              <Typography>Target Department: {selectedRequest.target_department.name}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button onClick={handleReject} color="error">
                Reject
              </Button>
              <Button onClick={handleApprove} variant="contained" color="success">
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CrossDepartmentRequestList; 