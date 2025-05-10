import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  Tooltip,
  TextField,
  MenuItem,
  CircularProgress,
  Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { Course, Department, CourseCreateForm } from '../../interfaces/course';
import courseService from '../../services/courseService';

interface CourseListProps {
  courses: Course[];
  isReadOnly: boolean;
  onDataChange: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  onAssignTaClick?: (course: Course) => void;
  showAssignTaButton?: boolean;
}

const CourseList: React.FC<CourseListProps> = ({ 
  courses, 
  isReadOnly, 
  onDataChange,
  showNotification,
  onAssignTaClick,
  showAssignTaButton
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<CourseCreateForm>({
    department_id: 0,
    code: '',
    title: '',
    credit: 3.0,
    level: 'UNDERGRADUATE'
  });
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Handle opening the course dialog
  const handleOpenDialog = async (course?: Course) => {
    // Fetch departments if not already loaded or if creating new
    if (departments.length === 0 || !course) {
      setLoadingDepartments(true);
      try {
        const response = await courseService.getAllDepartments();
        // Ensure the response data is an array before setting
        if (response.data && Array.isArray(response.data)) {
          setDepartments(response.data);
        } else {
          setDepartments([]); // Set to empty if not an array
          console.warn("Department data is not an array:", response.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        showNotification('Failed to load departments', 'error');
        setDepartments([]); // Set to empty on error
      }
      setLoadingDepartments(false);
    }

    if (course) {
      // Edit existing course
      setEditingCourse(course);
      setFormData({
        department_id: course.department.id,
        code: course.code,
        title: course.title,
        credit: course.credit,
        level: course.level
      });
    } else {
      // Create new course
      setEditingCourse(null);
      // Ensure departments are loaded before setting default department_id
      const defaultDeptId = departments.length > 0 ? departments[0].id : 0;
      setFormData({
        department_id: defaultDeptId, // Use loaded departments
        code: '',
        title: '',
        credit: 3.0,
        level: 'UNDERGRADUATE'
      });
    }
    setOpenDialog(true);
  };

  // Handle closing the dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCourse(null);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'credit' ? parseFloat(value) || 0 : value,
    });
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.department_id) {
      showNotification('Please select a department', 'error');
      return;
    }

    try {
      setLoading(true);
      if (editingCourse) {
        // Update existing course
        await courseService.updateCourse(editingCourse.id, formData);
        showNotification(`Course "${formData.code}: ${formData.title}" updated successfully`, 'success');
      } else {
        // Create new course
        await courseService.createCourse(formData);
        showNotification(`Course "${formData.code}: ${formData.title}" created successfully`, 'success');
      }
      handleCloseDialog();
      onDataChange();
    } catch (error: any) {
      console.error('Error saving course:', error);
      showNotification(error.response?.data?.detail || 'Failed to save course', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening delete confirmation dialog
  const handleConfirmDelete = (course: Course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  // Handle delete course
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    try {
      setLoading(true);
      await courseService.deleteCourse(courseToDelete.id);
      showNotification(`Course "${courseToDelete.code}: ${courseToDelete.title}" deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
      onDataChange();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      showNotification(error.response?.data?.detail || 'Failed to delete course', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on user role (for instructors, only show their courses)
  const filteredCourses = Array.isArray(courses) ? courses : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Courses ({filteredCourses.length})</Typography>
        {!isReadOnly && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Course
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Department</TableCell>
              <TableCell>Course Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Credits</TableCell>
              <TableCell>Academic Level</TableCell>
              {!isReadOnly && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <TableRow key={course.id} hover>
                  <TableCell>
                    <Chip 
                      label={course.department.code} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell><strong>{course.code}</strong></TableCell>
                  <TableCell>{course.title}</TableCell>
                  <TableCell>{course.credit}</TableCell>
                  <TableCell>{course.level_display}</TableCell>
                  {!isReadOnly && (
                    <TableCell align="right">
                      <Tooltip title="Edit Course">
                        <IconButton onClick={() => handleOpenDialog(course)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Course">
                        <IconButton onClick={() => handleConfirmDelete(course)} size="small">
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                      {showAssignTaButton && onAssignTaClick && (
                        <Tooltip title="Assign TAs to Course">
                          <Button 
                            onClick={() => onAssignTaClick(course)} 
                            size="small" 
                            variant="outlined"
                            sx={{ml: 1}}
                          >
                            Assign TAs
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={!isReadOnly ? 6 : 5} align="center">
                  No courses found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Course Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingCourse ? 'Edit Course' : 'Add New Course'}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Department"
              name="department_id"
              value={formData.department_id}
              onChange={handleInputChange}
              required
              disabled={loadingDepartments}
            >
              <MenuItem value={0} disabled>Select Department</MenuItem>
              {Array.isArray(departments) && departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.code} - {dept.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Course Code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              required
              helperText="E.g., 101, CS101, etc."
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Course Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Credit"
              name="credit"
              type="number"
              inputProps={{ step: "0.5", min: "0" }}
              value={formData.credit}
              onChange={handleInputChange}
              required
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Academic Level"
              name="level"
              value={formData.level}
              onChange={handleInputChange}
              required
            >
              <MenuItem value="UNDERGRADUATE">Undergraduate</MenuItem>
              <MenuItem value="GRADUATE">Graduate</MenuItem>
              <MenuItem value="PHD">PhD</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseDialog} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : editingCourse ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <Box sx={{ p: 3, minWidth: 300 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Confirm Delete
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete course {courseToDelete?.department.code}{courseToDelete?.code}: {courseToDelete?.title}?
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteCourse} 
              variant="contained" 
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default CourseList; 