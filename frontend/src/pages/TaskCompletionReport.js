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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { Send as SendIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';

const TaskCompletionReport = () => {
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTask, setViewTask] = useState(null);
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    completionDate: '',
    hoursSpent: '',
    report: '',
  });
  
  // Mock data for tasks
  const [tasks, setTasks] = useState([
    {
      id: 1,
      taskTitle: 'Lab Session 1',
      taskType: 'lab',
      course: 'CS101',
      assignedBy: 'Dr. Smith',
      dueDate: '2024-04-25',
      workCredit: 2,
      description: 'Conduct the first lab session for Introduction to Programming',
      status: 'Pending',
      completionReport: null,
    },
    {
      id: 2,
      taskTitle: 'Midterm Exam Proctoring',
      taskType: 'proctoring',
      course: 'CS102',
      assignedBy: 'Dr. Johnson',
      dueDate: '2024-05-01',
      workCredit: 3,
      description: 'Proctor the midterm exam for Data Structures',
      status: 'Completed',
      completionReport: {
        completionDate: '2024-05-01',
        hoursSpent: 3,
        report: 'Successfully proctored the midterm exam. No issues occurred during the exam.',
      },
    },
    {
      id: 3,
      taskTitle: 'Assignment 3 Grading',
      taskType: 'grading',
      course: 'CS103',
      assignedBy: 'Dr. Williams',
      dueDate: '2024-05-10',
      workCredit: 1,
      description: 'Grade Assignment 3 for Algorithms course',
      status: 'Pending',
      completionReport: null,
    },
  ]);

  const handleClickOpen = (task) => {
    setSelectedTask(task);
    setFormData({
      completionDate: new Date().toISOString().split('T')[0],
      hoursSpent: '',
      report: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTask(null);
    setFormData({
      completionDate: '',
      hoursSpent: '',
      report: '',
    });
  };

  const handleSubmit = () => {
    // Here you would typically make an API call to save the completion report
    console.log('Saving completion report:', {
      taskId: selectedTask.id,
      ...formData
    });

    // Update the task status and add the completion report
    setTasks(prev => 
      prev.map(task => 
        task.id === selectedTask.id 
          ? { 
              ...task, 
              status: 'Completed',
              completionReport: {
                completionDate: formData.completionDate,
                hoursSpent: formData.hoursSpent,
                report: formData.report,
              }
            } 
          : task
      )
    );

    setSnackbar({
      open: true,
      message: 'Task completion report submitted successfully',
      severity: 'success'
    });

    handleClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleViewReport = (task) => {
    setViewTask(task);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewTask(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getTaskTypeLabel = (typeId) => {
    switch (typeId) {
      case 'lab':
        return 'Lab Session';
      case 'proctoring':
        return 'Exam Proctoring';
      case 'grading':
        return 'Assignment Grading';
      case 'tutorial':
        return 'Tutorial Session';
      default:
        return typeId;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Task Completion Reports
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Assigned By</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Work Credit</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.taskTitle}</TableCell>
                <TableCell>{getTaskTypeLabel(task.taskType)}</TableCell>
                <TableCell>{task.course}</TableCell>
                <TableCell>{task.assignedBy}</TableCell>
                <TableCell>{task.dueDate}</TableCell>
                <TableCell>{task.workCredit}</TableCell>
                <TableCell>
                  <Chip 
                    label={task.status} 
                    color={getStatusColor(task.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {task.status === 'Completed' ? (
                    <Tooltip title="View Report">
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => handleViewReport(task)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Submit Report">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleClickOpen(task)}
                      >
                        <SendIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                    No tasks assigned to you.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submit Report Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Submit Task Completion Report</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Task Details:
              </Typography>
              <Typography variant="body2">
                <strong>Task:</strong> {selectedTask.taskTitle}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {getTaskTypeLabel(selectedTask.taskType)}
              </Typography>
              <Typography variant="body2">
                <strong>Course:</strong> {selectedTask.course}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {selectedTask.description}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Completion Report:
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="completionDate"
                label="Completion Date"
                type="date"
                value={formData.completionDate}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="hoursSpent"
                label="Hours Spent"
                type="number"
                value={formData.hoursSpent}
                onChange={handleChange}
                InputProps={{
                  inputProps: { min: 0, step: 0.5 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="report"
                label="Report"
                value={formData.report}
                onChange={handleChange}
                variant="outlined"
                multiline
                rows={4}
                placeholder="Please provide details about the completed task, any challenges faced, and how they were resolved."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.completionDate || !formData.hoursSpent || !formData.report}
          >
            Submit Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Task Completion Report</DialogTitle>
        <DialogContent>
          {viewTask && viewTask.completionReport && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Task Details:
              </Typography>
              <Typography variant="body2">
                <strong>Task:</strong> {viewTask.taskTitle}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {getTaskTypeLabel(viewTask.taskType)}
              </Typography>
              <Typography variant="body2">
                <strong>Course:</strong> {viewTask.course}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {viewTask.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Completion Details:
              </Typography>
              <Typography variant="body2">
                <strong>Completion Date:</strong> {viewTask.completionReport.completionDate}
              </Typography>
              <Typography variant="body2">
                <strong>Hours Spent:</strong> {viewTask.completionReport.hoursSpent}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Report:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="body2">
                  {viewTask.completionReport.report}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
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

export default TaskCompletionReport; 