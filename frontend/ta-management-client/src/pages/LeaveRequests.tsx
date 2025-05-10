import React, { useState } from 'react';
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
  MenuItem
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { SelectChangeEvent } from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';

// Leave request status options
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' }
];

// Leave request type options
const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'academic', label: 'Academic Leave' },
  { value: 'family', label: 'Family Emergency' }
];

interface LeaveRequest {
  id: number;
  startDate: Date;
  endDate: Date;
  type: string;
  reason: string;
  status: string;
  createdAt: Date;
}

const LeaveRequests: React.FC = () => {
  const { authState } = useAuth();
  const { user } = authState;
  
  // Sample leave requests
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: 1,
      startDate: new Date(2023, 11, 10),
      endDate: new Date(2023, 11, 12),
      type: 'sick',
      reason: 'Medical appointment',
      status: 'approved',
      createdAt: new Date(2023, 11, 5)
    },
    {
      id: 2,
      startDate: new Date(2023, 12, 15),
      endDate: new Date(2023, 12, 17),
      type: 'personal',
      reason: 'Family event',
      status: 'pending',
      createdAt: new Date(2023, 12, 1)
    }
  ]);
  
  // For dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setStartDate(null);
    setEndDate(null);
    setLeaveType('');
    setReason('');
  };
  
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };
  
  const handleTypeChange = (event: SelectChangeEvent) => {
    setLeaveType(event.target.value);
  };
  
  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReason(event.target.value);
  };
  
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = event.target.value ? new Date(event.target.value) : null;
    setStartDate(date);
  };
  
  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = event.target.value ? new Date(event.target.value) : null;
    setEndDate(date);
  };
  
  const formatDateToInput = (date: Date | null) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };
  
  const handleSubmitRequest = () => {
    if (!startDate || !endDate || !leaveType || !reason) {
      // Validation error
      alert('Please fill in all fields');
      return;
    }
    
    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return;
    }
    
    // Create a new leave request
    const newRequest: LeaveRequest = {
      id: leaveRequests.length + 1,
      startDate,
      endDate,
      type: leaveType,
      reason,
      status: 'pending',
      createdAt: new Date()
    };
    
    setLeaveRequests([...leaveRequests, newRequest]);
    handleCloseDialog();
  };
  
  const getStatusChip = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return (
      <Chip 
        label={option?.label || status} 
        color={(option?.color || 'default') as any}
        size="small"
      />
    );
  };
  
  const getTypeLabel = (type: string) => {
    const option = LEAVE_TYPES.find(opt => opt.value === type);
    return option?.label || type;
  };
  
  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy');
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Leave Requests
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleOpenDialog}
            >
              New Request
            </Button>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            Submit and track your leave requests
          </Typography>
          
          <TableContainer sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Request Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date Range</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body1">
                        No leave requests found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map(request => (
                    <TableRow key={request.id}>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell>{getTypeLabel(request.type)}</TableCell>
                      <TableCell>{formatDate(request.startDate)} to {formatDate(request.endDate)}</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>{getStatusChip(request.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            {STATUS_OPTIONS.map(option => (
              <Box key={option.value} sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  label={option.label} 
                  color={option.color as any}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2">
                  {option.value === 'pending' && 'Waiting for approval'}
                  {option.value === 'approved' && 'Request approved'}
                  {option.value === 'rejected' && 'Request rejected'}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
      
      {/* Leave Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          New Leave Request
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel id="leave-type-label">Leave Type</InputLabel>
                <Select
                  labelId="leave-type-label"
                  value={leaveType}
                  label="Leave Type"
                  onChange={handleTypeChange}
                >
                  {LEAVE_TYPES.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Start Date"
                type="date"
                value={formatDateToInput(startDate)}
                onChange={handleStartDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
              
              <TextField
                label="End Date"
                type="date"
                value={formatDateToInput(endDate)}
                onChange={handleEndDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
              
              <TextField
                label="Reason"
                multiline
                rows={4}
                value={reason}
                onChange={handleReasonChange}
                fullWidth
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitRequest} variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeaveRequests; 