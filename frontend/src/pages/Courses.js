import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Grid,
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
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';

const Courses = () => {
  const { user } = useSelector((state) => state.auth);
  
  // Mock data for courses
  const [courses, setCourses] = useState([
    { 
      id: 1, 
      code: 'CS101', 
      name: 'Introduction to Programming',
      semester: 'Spring 2024',
      students: 120,
      tas: 3,
      status: 'Active'
    },
    { 
      id: 2, 
      code: 'CS201', 
      name: 'Data Structures',
      semester: 'Spring 2024',
      students: 85,
      tas: 2,
      status: 'Active'
    },
  ]);

  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    semester: '',
    students: '',
  });

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewCourse({
      code: '',
      name: '',
      semester: '',
      students: '',
    });
  };

  const handleAddCourse = () => {
    if (newCourse.code && newCourse.name && newCourse.semester && newCourse.students) {
      const course = {
        id: courses.length + 1,
        ...newCourse,
        tas: 0,
        status: 'Active',
      };
      setCourses([...courses, course]);
      handleCloseAddDialog();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Course Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add Course
        </Button>
      </Box>

      {/* Course Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h3">{courses.length}</Typography>
            <Typography variant="subtitle1">Total Courses</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h3">
              {courses.reduce((sum, course) => sum + course.students, 0)}
            </Typography>
            <Typography variant="subtitle1">Total Students</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h3">
              {courses.reduce((sum, course) => sum + course.tas, 0)}
            </Typography>
            <Typography variant="subtitle1">Total TAs</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Courses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course Code</TableCell>
              <TableCell>Course Name</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell align="right">Students</TableCell>
              <TableCell align="right">TAs</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>{course.code}</TableCell>
                <TableCell>{course.name}</TableCell>
                <TableCell>{course.semester}</TableCell>
                <TableCell align="right">{course.students}</TableCell>
                <TableCell align="right">{course.tas}</TableCell>
                <TableCell>
                  <Chip
                    label={course.status}
                    color={course.status === 'Active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Course Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Course Code"
              value={newCourse.code}
              onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
            />
            <TextField
              fullWidth
              label="Course Name"
              value={newCourse.name}
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Semester"
              value={newCourse.semester}
              onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
            />
            <TextField
              fullWidth
              label="Number of Students"
              type="number"
              value={newCourse.students}
              onChange={(e) => setNewCourse({ ...newCourse, students: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Cancel</Button>
          <Button onClick={handleAddCourse} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Courses; 