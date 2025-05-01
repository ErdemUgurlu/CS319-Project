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
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { proctoringAPI } from '../services/api';

const ProctorAssignment = ({ examData, onAssignmentComplete }) => {
  const [availableTAs, setAvailableTAs] = useState([]);
  const [selectedTA, setSelectedTA] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [manualAssignments, setManualAssignments] = useState([]);
  const [autoAssignCount, setAutoAssignCount] = useState(0);
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    if (examData) {
      fetchAvailableTAs();
    }
  }, [examData]);

  const fetchAvailableTAs = async () => {
    try {
      const response = await proctoringAPI.getAvailableTAs(examData.course.id);
      setAvailableTAs(response.data);
    } catch (error) {
      console.error('Failed to fetch available TAs:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch available TAs',
        severity: 'error'
      });
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setManualAssignments([]);
    setAutoAssignCount(0);
    setSelectedTA('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setManualAssignments([]);
    setAutoAssignCount(0);
    setSelectedTA('');
  };

  const handleTAChange = (event) => {
    setSelectedTA(event.target.value);
  };

  const handleAddManualAssignment = () => {
    if (!selectedTA) return;

    const selectedTAData = availableTAs.find(ta => ta.user.id === selectedTA);
    if (selectedTAData) {
      setManualAssignments([...manualAssignments, selectedTAData]);
      setSelectedTA('');
    }
  };

  const handleRemoveManualAssignment = (index) => {
    setManualAssignments(manualAssignments.filter((_, i) => i !== index));
  };

  const handleAutoAssignCountChange = (event) => {
    const value = parseInt(event.target.value) || 0;
    const maxAllowed = examData.required_proctors - manualAssignments.length;
    setAutoAssignCount(Math.min(value, maxAllowed));
  };

  const handleSubmit = async () => {
    try {
      const response = await proctoringAPI.assignProctors(examData.id, {
        manual_proctor_ids: manualAssignments.map(ta => ta.user.id),
        auto_assign_count: autoAssignCount
      });
      
      setSnackbar({
        open: true,
        message: 'Proctors assigned successfully',
        severity: 'success'
      });
      
      handleCloseDialog();
      onAssignmentComplete();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to assign proctors',
        severity: 'error'
      });
    }
  };

  const remainingAssignments = examData.required_proctors - manualAssignments.length - autoAssignCount;

  return (
    <Box>
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenDialog}
        disabled={examData.status !== 'scheduled'}
      >
        Assign Proctors
      </Button>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Assign Proctors</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Exam Details:
            </Typography>
            <Typography>Course: {examData.course.code}</Typography>
            <Typography>Date: {new Date(examData.date).toLocaleString()}</Typography>
            <Typography>Location: {examData.location}</Typography>
            <Typography color="primary" sx={{ mt: 1 }}>
              Required Proctors: {examData.required_proctors} (Remaining: {remainingAssignments})
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Manual Assignments
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="ta-label">Select TA</InputLabel>
                  <Select
                    labelId="ta-label"
                    value={selectedTA}
                    label="Select TA"
                    onChange={handleTAChange}
                  >
                    {availableTAs.map((ta) => (
                      <MenuItem key={ta.user.id} value={ta.user.id}>
                        {ta.user.first_name} {ta.user.last_name} ({ta.user.username})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={handleAddManualAssignment}
                  disabled={!selectedTA || manualAssignments.length + autoAssignCount >= examData.required_proctors}
                >
                  Add Manual Assignment
                </Button>
                <List>
                  {manualAssignments.map((ta, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${ta.user.first_name} ${ta.user.last_name}`}
                        secondary={ta.user.username}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveManualAssignment(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Automatic Assignment
                </Typography>
                <TextField
                  type="number"
                  label="Number of Automatic Assignments"
                  value={autoAssignCount}
                  onChange={handleAutoAssignCountChange}
                  InputProps={{ inputProps: { min: 0, max: examData.required_proctors - manualAssignments.length } }}
                  fullWidth
                />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  System will automatically assign {autoAssignCount} TAs based on workload balance
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={remainingAssignments !== 0}
          >
            Assign Proctors
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

export default ProctorAssignment;