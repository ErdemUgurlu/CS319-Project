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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { proctoringAPI } from '../services/api';

const CrossDepartmentRequest = ({ examData, onRequestComplete }) => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await proctoringAPI.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDepartment('');
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
  };

  const handleSubmit = async () => {
    try {
      await proctoringAPI.requestCrossDepartment(examData.id, {
        target_department_id: selectedDepartment
      });
      
      setSnackbar({
        open: true,
        message: 'Cross-department request sent successfully',
        severity: 'success'
      });
      
      handleCloseDialog();
      onRequestComplete();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to send cross-department request',
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
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenDialog}
        disabled={examData.status !== 'pending'}
      >
        Request Cross-Department TA
      </Button>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request Cross-Department TA</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Exam Details:
            </Typography>
            <Typography>Course: {examData.course}</Typography>
            <Typography>Date: {new Date(examData.date).toLocaleString()}</Typography>
            <Typography>Required Proctors: {examData.required_proctors}</Typography>

            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel id="department-label">Select Department</InputLabel>
              <Select
                labelId="department-label"
                value={selectedDepartment}
                label="Select Department"
                onChange={handleDepartmentChange}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!selectedDepartment}
          >
            Submit Request
          </Button>
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

export default CrossDepartmentRequest; 