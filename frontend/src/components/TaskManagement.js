import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const TaskManagement = () => {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    course: '',
    dueDate: null,
    task_type: 'other'
  });

  const TASK_TYPES = [
    { value: 'grading', label: 'Assignment Grading' },
    { value: 'lab_assistance', label: 'Lab Assistance' },
    { value: 'tutorial', label: 'Tutorial Session' },
    { value: 'office_hours', label: 'Office Hours' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/tasks/');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNewTask({
      title: '',
      description: '',
      course: '',
      dueDate: null,
      task_type: 'other'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setNewTask(prev => ({
      ...prev,
      dueDate: date
    }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          course: newTask.course,
          due_date: newTask.dueDate.toISOString(),
          task_type: newTask.task_type,
          assigned_by_id: 1,
          assigned_to_id: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => [...prev, data]);
        handleClose();
      } else {
        console.error('Failed to create task');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Task Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ backgroundColor: '#0A2647', '&:hover': { backgroundColor: '#144272' } }}
        >
          Assign New Task
        </Button>
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Assign New Task</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={newTask.title}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={newTask.description}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="course"
                label="Course"
                fullWidth
                value={newTask.course}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Due Date"
                  value={newTask.dueDate}
                  onChange={handleDateChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Task Type</InputLabel>
                <Select
                  name="task_type"
                  value={newTask.task_type}
                  onChange={handleInputChange}
                  label="Task Type"
                >
                  {TASK_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ backgroundColor: '#0A2647', '&:hover': { backgroundColor: '#144272' } }}
          >
            Assign Task
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={3}>
        {tasks.map((task) => (
          <Grid item xs={12} key={task.id}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">{task.title}</Typography>
              <Typography variant="body2" color="textSecondary">
                {task.course} - {TASK_TYPES.find(t => t.value === task.task_type)?.label || 'Other'} - Due: {new Date(task.due_date).toLocaleString()}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {task.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TaskManagement; 