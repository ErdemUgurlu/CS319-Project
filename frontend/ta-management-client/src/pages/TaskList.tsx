import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import { useAuth } from '../context/AuthContext';
import taskService, { Task, CompleteTaskData, ReviewTaskData } from '../services/taskService';
import TaskForm from '../components/TaskForm';

// Task status options
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: 'default' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'primary' },
  { value: 'WAITING_FOR_APPROVAL', label: 'Waiting for Approval', color: 'warning' },
  { value: 'COMPLETED', label: 'Completed', color: 'info' },
  { value: 'APPROVED', label: 'Approved', color: 'success' },
  { value: 'REJECTED', label: 'Rejected', color: 'error' }
];

const TaskList: React.FC = () => {
  const { user } = useAuth().authState;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'complete' | 'review'>('add');
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch tasks on component mount
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await taskService.getTasks();
      console.log('Tasks response:', response.data);
      
      if (response.data) {
        setTasks(response.data);
        setFilteredTasks(response.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load tasks. Please try again later.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTasks();
  }, []);
  
  // Filter tasks based on status and search query
  useEffect(() => {
    // Update filteredTasks whenever tasks, statusFilter, or searchQuery changes
    const filtered = Array.isArray(tasks) ? tasks.filter(task => {
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      const matchesSearch = searchQuery 
        ? task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesStatus && matchesSearch;
    }) : [];
    
    setFilteredTasks(filtered);
  }, [tasks, statusFilter, searchQuery]);
  
  // Handle opening the task dialog
  const handleAddTask = () => {
    setCurrentTask(null);
    setDialogMode('edit');
    setOpenTaskDialog(true);
  };
  
  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setDialogMode('edit');
    setOpenTaskDialog(true);
  };
  
  const handleCompleteTask = (task: Task) => {
    setCurrentTask(task);
    setDialogMode('complete');
    setOpenTaskDialog(true);
  };
  
  const handleReviewTask = (task: Task) => {
    setCurrentTask(task);
    setDialogMode('review');
    setOpenTaskDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenTaskDialog(false);
    setCurrentTask(null);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Handle task status chip color
  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption?.color || 'default';
  };
  
  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption?.label || status;
  };
  
  // Role-specific actions
  const getActionButtons = (task: Task) => {
    if (!user) return null;
    
    const userRole = (user.role || '').toUpperCase();
    const isUserAssignee = task.assignee?.id === user.user_id;
    
    if (userRole === 'INSTRUCTOR') {
      return (
        <>
          {task.status === 'WAITING_FOR_APPROVAL' && (
            <Tooltip title="Evaluate">
              <IconButton 
                onClick={() => handleReviewTask(task)} 
                size="small"
                color="primary"
                sx={{ mr: 1 }}
              >
                <AssignmentTurnedInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={() => handleEditTask(task)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={() => handleDeleteTask(task.id!)} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      );
    }
    
    if (userRole === 'TA' && isUserAssignee) {
      return (
        <>
          {task.status === 'PENDING' && (
            <Tooltip title="Accept Task">
              <IconButton 
                onClick={() => handleAcceptTaskAction(task)} 
                size="small"
                color="info"
                sx={{ mr: 1 }}
              >
                <ThumbUpAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(task.status === 'IN_PROGRESS' || task.status === 'PENDING') && (
            <Tooltip title="Mark as Completed">
              <IconButton 
                onClick={() => handleCompleteTask(task)} 
                size="small"
                color="success"
                sx={{ mr: 1 }}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={() => handleEditTask(task)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
        </>
      );
    }
    
    // Admin and staff have full access
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      return (
        <>
          <IconButton onClick={() => handleEditTask(task)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={() => handleDeleteTask(task.id!)} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      );
    }
    
    return null;
  };
  
  // Accept Task
  const handleAcceptTaskAction = async (taskToAccept: Task) => {
    if (!taskToAccept.id) return;
    if (window.confirm(`Are you sure you want to accept the task "${taskToAccept.title}"? This will change its status to In Progress.`)) {
      try {
        await taskService.acceptTask(taskToAccept.id);
        setSnackbar({
          open: true,
          message: 'Task accepted and status moved to In Progress.',
          severity: 'success'
        });
        fetchTasks(); // Refresh the task list
      } catch (err) {
        console.error('Error accepting task:', err);
        const errorMessage = (err as any)?.response?.data?.error || 'Failed to accept task. Please try again.';
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      }
    }
  };
  
  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
        setSnackbar({
          open: true,
          message: 'Task deleted successfully',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error deleting task:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete task. Please try again.',
          severity: 'error'
        });
      }
    }
  };
  
  // Save task
  const handleSaveTask = async (task: Task) => {
    try {
      let response: { data: Task };
      
      if (task.id) {
        // Update existing task
        response = await taskService.updateTask(task.id, task);
        setSnackbar({
          open: true,
          message: 'Task updated successfully',
          severity: 'success'
        });
        
        // Update task list - ensure we're not mutating the original array
        const updatedTasks = tasks.map(t => t.id === task.id ? response.data : t);
        setTasks(updatedTasks);
      } else {
        // Create new task
        response = await taskService.createTask(task);
        setSnackbar({
          open: true,
          message: 'Task created successfully',
          severity: 'success'
        });
        
        // Add new task to the list
        setTasks(prevTasks => [...prevTasks, response.data]);
      }
      
      // Refresh the task list to ensure we have the latest data
      fetchTasks();
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving task:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save task. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Complete task
  const handleSaveTaskCompletion = async (taskId: number, data: CompleteTaskData) => {
    try {
      await taskService.completeTask(taskId, data);
      
      // Refresh tasks to get updated status
      await fetchTasks();
      
      setSnackbar({
        open: true,
        message: 'Task marked as completed',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (err) {
      console.error('Error marking task as completed:', err);
      setSnackbar({
        open: true,
        message: 'Failed to mark task as completed. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Review task
  const handleSaveTaskReview = async (taskId: number, data: ReviewTaskData) => {
    try {
      await taskService.reviewTask(taskId, data);
      
      // Refresh tasks to get updated status
      await fetchTasks();
      
      setSnackbar({
        open: true,
        message: data.is_approved 
          ? 'Task approved successfully' 
          : 'Task rejected. TA has been notified.',
        severity: 'success'
      });
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error evaluating task:', err);
      setSnackbar({
        open: true,
        message: 'Failed to evaluate task. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Get dialog title based on mode
  const getDialogTitle = () => {
    if (!dialogMode) return '';
    
    switch (dialogMode) {
      case 'complete':
        return 'Mark Task as Completed';
      case 'review':
        return 'Evaluate Task';
      default:
        return currentTask ? 'Edit Task' : 'New Task';
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Task Management
            </Typography>
            {user && ['INSTRUCTOR', 'ADMIN', 'STAFF'].includes((user.role || '').toUpperCase()) && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleAddTask}
              >
                Add Task
              </Button>
            )}
          </Box>
          
          {/* Filters */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ width: '75%' }}>
              <TextField
                label="Search Tasks"
                variant="outlined"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
            </Box>
            <Box sx={{ width: '25%' }}>
              <TextField
                select
                label="Status"
                variant="outlined"
                fullWidth
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Statuses</MenuItem>
                {STATUS_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Stack>
          
          {/* Loading state */}
          {loading ? (
            <Typography>Loading tasks...</Typography>
          ) : filteredTasks.length === 0 ? (
            <Typography>No tasks found.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Credit Hours</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>{task.description}</TableCell>
                      <TableCell>
                        {task.assignee ? task.assignee.full_name : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 
                         (task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date set')}
                      </TableCell>
                      <TableCell>{task.credit_hours || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(task.status)} 
                          color={getStatusColor(task.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{getActionButtons(task)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Task dialog */}
          <Dialog open={openTaskDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
            <DialogTitle>
              {getDialogTitle()}
            </DialogTitle>
            <DialogContent>
              <TaskForm 
                task={currentTask}
                onSave={handleSaveTask}
                onCancel={handleCloseDialog}
                onComplete={dialogMode === 'complete' ? handleSaveTaskCompletion : undefined}
                onReview={dialogMode === 'review' ? handleSaveTaskReview : undefined}
              />
            </DialogContent>
          </Dialog>
          
          {/* Success and error messages */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={5000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity={snackbar.severity} 
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Paper>
      </Box>
    </Container>
  );
};

export default TaskList; 