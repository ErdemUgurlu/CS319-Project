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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Email as EmailIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';

const CourseInstructorTaskAssignment = () => {
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    taskTitle: '',
    taskType: '',
    course: '',
    assignedTA: '',
    dueDate: '',
    workCredit: '',
    description: '',
  });
  
  // Mock data for TAs
  const tas = [
    { id: 'TA1', name: 'John Doe', email: 'john.doe@example.com', department: 'Computer Engineering' },
    { id: 'TA2', name: 'Jane Smith', email: 'jane.smith@example.com', department: 'Computer Engineering' },
    { id: 'TA3', name: 'Alice Johnson', email: 'alice.johnson@example.com', department: 'Computer Engineering' },
  ];
  
  // Mock data for courses
  const courses = [
    { id: 'CS101', name: 'Introduction to Programming' },
    { id: 'CS102', name: 'Data Structures' },
    { id: 'CS103', name: 'Algorithms' },
  ];
  
  // Mock data for task types
  const taskTypes = [
    { id: 'lab', name: 'Lab Session' },
    { id: 'proctoring', name: 'Exam Proctoring' },
    { id: 'grading', name: 'Assignment Grading' },
    { id: 'tutorial', name: 'Tutorial Session' },
  ];
  
  // Mock data for tasks
  const [tasks, setTasks] = useState([
    {
      id: 1,
      taskTitle: 'Lab Session 1',
      taskType: 'lab',
      course: 'CS101',
      assignedTA: 'TA1',
      dueDate: '2024-04-25',
      workCredit: 2,
      description: 'Conduct the first lab session for Introduction to Programming',
      status: 'Pending',
    },
    {
      id: 2,
      taskTitle: 'Midterm Exam Proctoring',
      taskType: 'proctoring',
      course: 'CS102',
      assignedTA: 'TA2',
      dueDate: '2024-05-01',
      workCredit: 3,
      description: 'Proctor the midterm exam for Data Structures',
      status: 'Completed',
    },
    {
      id: 3,
      taskTitle: 'Assignment 3 Grading',
      taskType: 'grading',
      course: 'CS103',
      assignedTA: 'TA3',
      dueDate: '2024-05-10',
      workCredit: 1,
      description: 'Grade Assignment 3 for Algorithms course',
      status: 'Pending',
    },
  ]);

  const handleClickOpen = () => {
    setOpen(true);
    setEditTask(null);
    setFormData({
      taskTitle: '',
      taskType: '',
      course: '',
      assignedTA: '',
      dueDate: '',
      workCredit: '',
      description: '',
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditTask(null);
    setFormData({
      taskTitle: '',
      taskType: '',
      course: '',
      assignedTA: '',
      dueDate: '',
      workCredit: '',
      description: '',
    });
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setFormData({
      taskTitle: task.taskTitle,
      taskType: task.taskType,
      course: task.course,
      assignedTA: task.assignedTA,
      dueDate: task.dueDate,
      workCredit: task.workCredit,
      description: task.description,
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editTask) {
      // Update existing task
      setTasks(prev => 
        prev.map(task => 
          task.id === editTask.id 
            ? { 
                ...task, 
                taskTitle: formData.taskTitle,
                taskType: formData.taskType,
                course: formData.course,
                assignedTA: formData.assignedTA,
                dueDate: formData.dueDate,
                workCredit: formData.workCredit,
                description: formData.description,
              } 
            : task
        )
      );
      setSnackbar({
        open: true,
        message: 'Task updated successfully',
        severity: 'success'
      });
    } else {
      // Add new task
      const newTask = {
        id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        taskTitle: formData.taskTitle,
        taskType: formData.taskType,
        course: formData.course,
        assignedTA: formData.assignedTA,
        dueDate: formData.dueDate,
        workCredit: formData.workCredit,
        description: formData.description,
        status: 'Pending',
      };
      setTasks(prev => [...prev, newTask]);
      setSnackbar({
        open: true,
        message: 'Task assigned successfully',
        severity: 'success'
      });
    }
    handleClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = (taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setSnackbar({
      open: true,
      message: 'Task deleted successfully',
      severity: 'success'
    });
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
    const type = taskTypes.find(t => t.id === typeId);
    return type ? type.name : typeId;
  };

  const getTAName = (taId) => {
    const ta = tas.find(t => t.id === taId);
    return ta ? ta.name : taId;
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.name : courseId;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Task Assignment
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Assign New Task
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Assigned TA</TableCell>
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
                <TableCell>{getCourseName(task.course)}</TableCell>
                <TableCell>{getTAName(task.assignedTA)}</TableCell>
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
                  <Tooltip title="Edit Task">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleEdit(task)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Task">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(task.id)}
                      sx={{ mr: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send Email">
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => {
                        // Here you would typically open an email client or send an email via API
                        console.log('Sending email to TA:', getTAName(task.assignedTA));
                        setSnackbar({
                          open: true,
                          message: `Email sent to ${getTAName(task.assignedTA)}`,
                          severity: 'success'
                        });
                      }}
                    >
                      <EmailIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                    No tasks assigned yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="taskTitle"
                label="Task Title"
                value={formData.taskTitle}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="task-type-label">Task Type</InputLabel>
                <Select
                  labelId="task-type-label"
                  id="task-type"
                  name="taskType"
                  value={formData.taskType}
                  label="Task Type"
                  onChange={handleChange}
                >
                  {taskTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="course-label">Course</InputLabel>
                <Select
                  labelId="course-label"
                  id="course"
                  name="course"
                  value={formData.course}
                  label="Course"
                  onChange={handleChange}
                >
                  {courses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="assigned-ta-label">Assigned TA</InputLabel>
                <Select
                  labelId="assigned-ta-label"
                  id="assigned-ta"
                  name="assignedTA"
                  value={formData.assignedTA}
                  label="Assigned TA"
                  onChange={handleChange}
                >
                  {tas.map((ta) => (
                    <MenuItem key={ta.id} value={ta.id}>
                      {ta.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="dueDate"
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="workCredit"
                label="Work Credit"
                type="number"
                value={formData.workCredit}
                onChange={handleChange}
                InputProps={{
                  inputProps: { min: 0, step: 0.5 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
                variant="outlined"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editTask ? 'Save Changes' : 'Assign Task'}
          </Button>
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

export default CourseInstructorTaskAssignment; 