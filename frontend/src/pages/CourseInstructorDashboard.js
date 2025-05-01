import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Assessment as AssessmentIcon,
  Event as EventIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const CourseInstructorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const instructorUser = {
    name: user?.name || 'Demo User',
    department: user?.department || 'Computer Engineering',
    courses: [
      { id: 1, code: 'CS101', name: 'Introduction to Programming', semester: 'Spring 2024', students: 120 },
      { id: 2, code: 'CS201', name: 'Data Structures', semester: 'Spring 2024', students: 85 },
    ],
  };

  // State for add TA dialog
  const [openAddTADialog, setOpenAddTADialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [taName, setTaName] = useState('');
  const [taEmail, setTaEmail] = useState('');

  // Mock data for TAs
  const [tas, setTas] = useState([
    { id: 1, name: 'John Doe', email: 'john.doe@ug.bilkent.edu.tr', course: 'CS101', role: 'Lab TA', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@ug.bilkent.edu.tr', course: 'CS101', role: 'Office Hours TA', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob.johnson@ug.bilkent.edu.tr', course: 'CS201', role: 'Lab TA', status: 'Active' },
  ]);

  // Mock data for leave requests
  const [leaveRequests, setLeaveRequests] = useState([
    { 
      id: 1, 
      taName: 'John Doe',
      course: 'CS101',
      startDate: '2024-05-15',
      endDate: '2024-05-16',
      reason: 'Medical appointment',
      status: 'Pending'
    },
    { 
      id: 2, 
      taName: 'Jane Smith',
      course: 'CS101',
      startDate: '2024-05-20',
      endDate: '2024-05-20',
      reason: 'Family emergency',
      status: 'Pending'
    },
  ]);

  const handleOpenAddTADialog = () => {
    setOpenAddTADialog(true);
  };

  const handleCloseAddTADialog = () => {
    setOpenAddTADialog(false);
    setSelectedCourse('');
    setTaName('');
    setTaEmail('');
  };

  const handleAddTA = () => {
    if (selectedCourse && taName && taEmail) {
      const newTA = {
        id: tas.length + 1,
        name: taName,
        email: taEmail,
        course: selectedCourse,
        role: 'Lab TA',
        status: 'Active',
      };
      setTas([...tas, newTA]);
      handleCloseAddTADialog();
    }
  };

  const features = [
    {
      title: 'Task Management',
      description: 'Create and manage tasks for TAs',
      icon: <AssignmentIcon />,
      action: () => navigate('/tasks'),
      buttonText: 'Manage Tasks'
    },
    {
      title: 'Proctor Assignment',
      description: 'Assign TAs to exam proctoring duties',
      icon: <SupervisorAccountIcon />,
      action: () => navigate('/proctor-assignment'),
      buttonText: 'Assign Proctors'
    },
    {
      title: 'Performance Reports',
      description: 'View TA performance and task completion reports',
      icon: <AssessmentIcon />,
      action: () => navigate('/task-completion'),
      buttonText: 'View Reports'
    },
    {
      title: 'Exam Schedule',
      description: 'Manage exam schedules and proctor assignments',
      icon: <EventIcon />,
      action: () => navigate('/proctoring'),
      buttonText: 'View Schedule'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Message */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>Welcome, {instructorUser.name}</Typography>
        <Typography variant="body2" color="textSecondary">
          Manage your courses, teaching assistants, and exam proctoring requests from this dashboard.
        </Typography>
      </Box>

      {/* Feature Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {feature.icon}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {feature.title}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, flexGrow: 1 }}>
                {feature.description}
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={feature.action}
                sx={{ mt: 'auto' }}
              >
                {feature.buttonText}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h3">{instructorUser.courses.length}</Typography>
            <Typography variant="subtitle1">Active Courses</Typography>
            <Button variant="outlined" size="small" onClick={() => navigate('/courses')}>
              View Courses
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h3">{tas.length}</Typography>
            <Typography variant="subtitle1">Assigned TAs</Typography>
            <Button variant="outlined" size="small" onClick={handleOpenAddTADialog}>
              Add TA
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Teaching Assistants Table */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Teaching Assistants</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleOpenAddTADialog}
          >
            Add TA
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tas.map((ta) => (
                <TableRow key={ta.id}>
                  <TableCell>{ta.name}</TableCell>
                  <TableCell>{ta.email}</TableCell>
                  <TableCell>{ta.course}</TableCell>
                  <TableCell>{ta.role}</TableCell>
                  <TableCell>
                    <Chip 
                      label={ta.status} 
                      size="small" 
                      color={ta.status === 'Active' ? 'success' : 'default'} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Leave Requests Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Leave Requests
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>TA Name</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.taName}</TableCell>
                  <TableCell>{request.course}</TableCell>
                  <TableCell>{request.startDate}</TableCell>
                  <TableCell>{request.endDate}</TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status} 
                      size="small" 
                      color={
                        request.status === 'Approved' ? 'success' : 
                        request.status === 'Rejected' ? 'error' : 
                        'warning'
                      } 
                    />
                  </TableCell>
                  <TableCell align="right">
                    {request.status === 'Pending' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/leave-evaluation/${request.id}`)}
                      >
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add TA Dialog */}
      <Dialog open={openAddTADialog} onClose={handleCloseAddTADialog}>
        <DialogTitle>Add Teaching Assistant</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="course-label">Course</InputLabel>
              <Select
                labelId="course-label"
                value={selectedCourse}
                label="Course"
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {instructorUser.courses.map((course) => (
                  <MenuItem key={course.id} value={course.code}>
                    {course.code} - {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="TA Name"
              value={taName}
              onChange={(e) => setTaName(e.target.value)}
            />
            <TextField
              fullWidth
              label="TA Email"
              value={taEmail}
              onChange={(e) => setTaEmail(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddTADialog}>Cancel</Button>
          <Button onClick={handleAddTA} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseInstructorDashboard; 