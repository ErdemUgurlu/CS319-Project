import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { examAPI, taAPI } from '../services/api';

const ExamProctoring = () => {
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedExam, setSelectedExam] = useState(null);
  const [editFormData, setEditFormData] = useState({
    course: '',
    date: '',
    time: '',
    duration: '',
    location: '',
    assignmentType: 'automatic',
    numberOfProctors: '',
  });
  
  const [availableTAs, setAvailableTAs] = useState([
    { id: 1, name: 'John Doe', department: 'Computer Science', workload: 10 },
    { id: 2, name: 'Jane Smith', department: 'Computer Science', workload: 8 },
    { id: 3, name: 'Bob Wilson', department: 'Computer Science', workload: 12 },
  ]);
  
  const [exams, setExams] = useState([
    {
      id: 1,
      course: 'CS101',
      date: '2024-04-25',
      time: '09:00',
      duration: '2 hours',
      location: 'Room 101',
      status: 'Assigned',
      proctors: ['John Doe', 'Jane Smith'],
      assignmentType: 'automatic',
      numberOfProctors: 2,
    },
    {
      id: 2,
      course: 'CS102',
      date: '2024-04-26',
      time: '14:00',
      duration: '3 hours',
      location: 'Room 102',
      status: 'Pending',
      proctors: [],
      assignmentType: 'manual',
      numberOfProctors: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExams();
    fetchTAs();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examAPI.getExams();
      setExams(response.data.results || []);
    } catch (err) {
      setError('Failed to fetch exams');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTAs = async () => {
    try {
      const response = await taAPI.getTAs();
      setAvailableTAs(response.data.results || []);
    } catch (err) {
      console.error('Failed to fetch TAs:', err);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleEditClick = (exam) => {
    setSelectedExam(exam);
    setEditFormData({
      course: exam.course,
      date: exam.date,
      time: exam.time,
      duration: exam.duration,
      location: exam.location,
      assignmentType: exam.assignmentType || 'automatic',
      numberOfProctors: exam.numberOfProctors || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedExam(null);
    setEditFormData({
      course: '',
      date: '',
      time: '',
      duration: '',
      location: '',
      assignmentType: 'automatic',
      numberOfProctors: '',
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If number of proctors is changed, adjust the assigned proctors
    if (name === 'numberOfProctors' && selectedExam) {
      const newNumberOfProctors = parseInt(value, 10);
      const currentProctors = selectedExam.proctors || [];
      
      if (editFormData.assignmentType === 'automatic') {
        // For automatic assignment, select proctors based on workload
        const sortedTAs = [...availableTAs].sort((a, b) => a.workload - b.workload);
        const newProctors = sortedTAs.slice(0, newNumberOfProctors).map(ta => ta.name);
        
        setExams(prevExams =>
          prevExams.map(exam =>
            exam.id === selectedExam.id
              ? { ...exam, proctors: newProctors }
              : exam
          )
        );

        setSnackbar({
          open: true,
          message: `Number of proctors updated to ${newNumberOfProctors}`,
          severity: 'info'
        });
      } else if (editFormData.assignmentType === 'manual') {
        // For manual assignment, adjust the current proctor list
        if (currentProctors.length > newNumberOfProctors) {
          // Remove excess proctors
          const updatedProctors = currentProctors.slice(0, newNumberOfProctors);
          setExams(prevExams =>
            prevExams.map(exam =>
              exam.id === selectedExam.id
                ? { ...exam, proctors: updatedProctors }
                : exam
            )
          );
        }
      }
    }
  };

  const handleEditSave = async () => {
    if (selectedExam) {
      try {
        setLoading(true);
        const examData = {
          ...editFormData,
          proctor_ids: selectedExam.proctors.map(proctor => 
            typeof proctor === 'string' 
              ? availableTAs.find(ta => ta.name === proctor)?.id 
              : proctor.id
          ).filter(Boolean)
        };
        
        await examAPI.updateExam(selectedExam.id, examData);
        
        if (editFormData.assignmentType === 'automatic') {
          await examAPI.assignProctors(selectedExam.id, []);
        }
        
        setSnackbar({
          open: true,
          message: 'Exam updated successfully',
          severity: 'success'
        });
        
        fetchExams(); // Refresh the list
        handleEditClose();
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to update exam',
          severity: 'error'
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelClick = (exam) => {
    setSelectedExam(exam);
    setCancelDialogOpen(true);
  };

  const handleCancelClose = () => {
    setCancelDialogOpen(false);
    setSelectedExam(null);
  };

  const handleCancelConfirm = async () => {
    if (selectedExam) {
      try {
        setLoading(true);
        await examAPI.deleteExam(selectedExam.id);
        setExams(prevExams => prevExams.filter(exam => exam.id !== selectedExam.id));
        setSnackbar({
          open: true,
          message: 'Exam cancelled successfully',
          severity: 'success'
        });
        handleCancelClose();
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to cancel exam',
          severity: 'error'
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Assigned':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Exam Proctoring
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Schedule Exam
        </Button>
      </Box>

      <Grid container spacing={3}>
        {exams.map((exam) => (
          <Grid item xs={12} key={exam.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {exam.course} - {exam.date} {exam.time}
                  </Typography>
                  <Chip
                    label={exam.status}
                    color={getStatusColor(exam.status)}
                    size="small"
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Duration: {exam.duration}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Location: {exam.location}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Number of Proctors: {exam.numberOfProctors}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Proctors:
                    </Typography>
                    {exam.proctors.length > 0 ? (
                      exam.proctors.map((proctor, index) => (
                        <Typography key={index} variant="body2">
                          • {typeof proctor === 'string' ? proctor : proctor.name}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="body2" color="error">
                        No proctors assigned
                      </Typography>
                    )}
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => handleEditClick(exam)}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleCancelClick(exam)}
                  >
                    Cancel
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Schedule New Exam Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule New Exam</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Course"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Duration"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Number of Proctors Needed"
                type="number"
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleClose}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Exam Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Exam</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Course"
                name="course"
                value={editFormData.course}
                onChange={handleEditFormChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                name="date"
                type="date"
                value={editFormData.date}
                onChange={handleEditFormChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time"
                name="time"
                type="time"
                value={editFormData.time}
                onChange={handleEditFormChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Duration"
                name="duration"
                value={editFormData.duration}
                onChange={handleEditFormChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={editFormData.location}
                onChange={handleEditFormChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Number of Proctors Needed"
                name="numberOfProctors"
                type="number"
                value={editFormData.numberOfProctors}
                onChange={handleEditFormChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Proctor Assignment Type
                </Typography>
                <RadioGroup
                  name="assignmentType"
                  value={editFormData.assignmentType}
                  onChange={handleEditFormChange}
                >
                  <FormControlLabel 
                    value="automatic" 
                    control={<Radio />} 
                    label="Automatic Assignment" 
                  />
                  <FormControlLabel 
                    value="manual" 
                    control={<Radio />} 
                    label="Manual Assignment" 
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
            {editFormData.assignmentType === 'manual' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Proctors</InputLabel>
                  <Select
                    multiple
                    value={selectedExam?.proctors?.map(p => typeof p === 'string' ? p : p.name) || []}
                    onChange={(e) => {
                      if (selectedExam) {
                        const selectedProctors = e.target.value;
                        const selectedTAs = availableTAs.filter(ta => selectedProctors.includes(ta.name));
                        setExams(prevExams =>
                          prevExams.map(exam =>
                            exam.id === selectedExam.id
                              ? { ...exam, proctors: selectedTAs }
                              : exam
                          )
                        );
                      }
                    }}
                    label="Select Proctors"
                  >
                    {availableTAs.map((ta) => (
                      <MenuItem key={ta.id} value={ta.name}>
                        {ta.name} ({ta.workload} hours/week)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Exam Dialog */}
      <Dialog open={cancelDialogOpen} onClose={handleCancelClose} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Exam</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Are you sure you want to cancel this exam? This action cannot be undone.
          </Alert>
          {selectedExam && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">
                <strong>Course:</strong> {selectedExam.course}
              </Typography>
              <Typography variant="body1">
                <strong>Date:</strong> {selectedExam.date}
              </Typography>
              <Typography variant="body1">
                <strong>Time:</strong> {selectedExam.time}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose}>No, Keep Exam</Button>
          <Button variant="contained" color="error" onClick={handleCancelConfirm}>
            Yes, Cancel Exam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExamProctoring; 