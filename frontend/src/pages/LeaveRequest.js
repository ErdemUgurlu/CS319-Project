import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const LeaveRequest = () => {
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: '',
  });

  const [leaves, setLeaves] = useState([
    {
      id: 1,
      startDate: '2024-05-01',
      endDate: '2024-05-03',
      type: 'Sick Leave',
      reason: 'Medical appointment',
      status: 'Pending',
    },
  ]);

  const leaveTypes = [
    'Sick Leave',
    'Personal Leave',
    'Academic Leave',
    'Emergency Leave',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newLeave = {
      id: leaves.length + 1,
      ...leaveForm,
      status: 'Pending',
    };
    setLeaves((prev) => [...prev, newLeave]);
    setLeaveForm({
      startDate: '',
      endDate: '',
      reason: '',
      type: '',
    });
  };

  const handleDelete = (leaveId) => {
    setLeaves((prev) => prev.filter((leave) => leave.id !== leaveId));
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Leave Request
      </Typography>

      {/* Leave Request Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Submit Leave Request
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                name="startDate"
                value={leaveForm.startDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                name="endDate"
                value={leaveForm.endDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  name="type"
                  value={leaveForm.type}
                  onChange={handleInputChange}
                  label="Leave Type"
                >
                  {leaveTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                name="reason"
                value={leaveForm.reason}
                onChange={handleInputChange}
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
              >
                Submit Request
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Leave Requests Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Leave Requests
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>{leave.startDate}</TableCell>
                  <TableCell>{leave.endDate}</TableCell>
                  <TableCell>{leave.type}</TableCell>
                  <TableCell>{leave.reason}</TableCell>
                  <TableCell>
                    <Chip
                      label={leave.status}
                      color={getStatusColor(leave.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(leave.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default LeaveRequest; 