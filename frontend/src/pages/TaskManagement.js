import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as CompleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { taskAPI, taAPI } from '../services/api';

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [tas, setTAs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    course: '',
    due_date: '',
    priority: 'medium',
    status: 'pending',
  });
  const [completionNote, setCompletionNote] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { user: currentUser } = useSelector((state) => state.auth);

  // Fetch tasks and TAs on component mount
  useEffect(() => {
    fetchTasks();
    fetchTAs();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTasks();
      setTasks(response.data.results || []);
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTAs = async () => {
    try {
      const response = await taAPI.getTAs();
      setTAs(response.data.results || []);
    } catch (err) {
      console.error('Failed to fetch TAs:', err);
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        course: task.course,
        due_date: task.due_date,
        priority: task.priority,
        status: task.status,
      });
      setSelectedTask(task);
    } else {
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        course: '',
        due_date: '',
        priority: 'medium',
        status: 'pending',
      });
      setSelectedTask(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTask(null);
    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      course: '',
      due_date: '',
      priority: 'medium',
      status: 'pending',
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const data = {
        ...formData,
        assigned_by: 'Current Instructor', // This should come from auth context
      };

      if (selectedTask) {
        await taskAPI.updateTask(selectedTask.id, data);
      } else {
        await taskAPI.createTask(data);
      }

      fetchTasks();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompleteDialog = (task) => {
    setSelectedTask(task);
    setOpenCompleteDialog(true);
  };

  const handleCloseCompleteDialog = () => {
    setOpenCompleteDialog(false);
    setSelectedTask(null);
    setCompletionNote('');
  };

  const handleMarkComplete = async () => {
    try {
      setLoading(true);
      await taskAPI.markComplete(selectedTask.id, completionNote);
      fetchTasks();
      handleCloseCompleteDialog();
    } catch (err) {
      setError('Failed to mark task as complete');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        setLoading(true);
        await taskAPI.deleteTask(taskId);
        fetchTasks();
      } catch (err) {
        setError('Failed to delete task');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'overdue':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
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
          Task Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Assign New Task
        </Button>
      </Box>

      <Grid container spacing={3}>
        {tasks.map((task) => (
          <Grid item xs={12} key={task.id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {task.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {task.description}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Assigned To: {task.assigned_to_name || 'Not assigned'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Course: {task.course}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date: {task.due_date}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assigned By: {task.assigned_by}
                  </Typography>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenDialog(task)}
                >
                  <EditIcon />
                </IconButton>
                {task.status !== 'completed' && (
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleOpenCompleteDialog(task)}
                  >
                    <CompleteIcon />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(task.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Task Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTask ? 'Edit Task' : 'Assign New Task'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  label="Assign To"
                >
                  {tas.map((ta) => (
                    <MenuItem key={ta.id} value={ta.id}>
                      {ta.name} ({ta.workload} hours/week)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Course"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedTask ? 'Save Changes' : 'Assign Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={openCompleteDialog} onClose={handleCloseCompleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Task as Complete</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Task: {selectedTask?.title}
            </Typography>
            <TextField
              fullWidth
              label="Completion Note"
              multiline
              rows={4}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleMarkComplete}>
            Mark as Complete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskManagement; 