import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Chip,
  Badge
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PersonOutline as PersonIcon } from '@mui/icons-material';
import { Course, Section, SectionCreateForm, Instructor } from '../../interfaces/course';
import courseService from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';

interface SectionListProps {
  sections: Section[];
  courses: Course[];
  isReadOnly: boolean;
  onDataChange: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  courses,
  isReadOnly,
  onDataChange,
  showNotification
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [formData, setFormData] = useState<SectionCreateForm>({
    course_id: 0,
    section_number: '',
    instructor_id: undefined,
    student_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

  const { authState } = useAuth();
  const userId = authState.user?.user_id;
  const isInstructor = authState.user?.role === 'INSTRUCTOR';

  // Load instructors when needed
  const loadInstructors = async () => {
    if (instructors.length === 0) {
      try {
        setLoadingInstructors(true);
        const response = await courseService.getAllInstructors();
        console.log('Instructors response:', response);
        
        // Check for a valid response with data
        if (response.data && Array.isArray(response.data)) {
          setInstructors(response.data);
          console.log(`Loaded ${response.data.length} instructors`);
        } else if (response.data && Array.isArray(response.data.results)) {
          // Handle paginated response
          setInstructors(response.data.results);
          console.log(`Loaded ${response.data.results.length} instructors from paginated results`);
        } else {
          console.error('Unexpected instructors data format:', response.data);
          // Create fallback instructors if API returns empty/invalid data
          const fallbackInstructors: Instructor[] = [];
          setInstructors(fallbackInstructors);
          showNotification('No instructors found or invalid data format', 'info');
        }
      } catch (error) {
        console.error('Failed to load instructors:', error);
        // Always ensure instructors is set to an array even on error
        setInstructors([]);
        showNotification('Failed to load instructors', 'error');
      } finally {
        setLoadingInstructors(false);
      }
    }
  };

  // Handle opening section dialog
  const handleOpenDialog = async (section?: Section) => {
    // Load instructors
    await loadInstructors();

    if (section) {
      // Edit existing section
      setEditingSection(section);
      setFormData({
        course_id: section.course.id,
        section_number: section.section_number,
        instructor_id: section.instructor?.id,
        student_count: section.student_count
      });
    } else {
      // Create new section
      setEditingSection(null);
      setFormData({
        course_id: 0,
        section_number: '',
        instructor_id: undefined,
        student_count: 0
      });
    }
    setOpenDialog(true);
  };

  // Handle closing dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSection(null);
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const { name, value } = e.target;
    
    // Handle numeric values
    if (name === 'student_count') {
      const numValue = parseInt(value as string) || 0;
      setFormData({
        ...formData,
        [name]: numValue
      });
    } else if (name === 'instructor_id') {
      // Handle null instructor (empty string means no instructor)
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : parseInt(value as string)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.course_id) {
      showNotification('Please select a course', 'error');
      return;
    }

    try {
      setLoading(true);
      if (editingSection) {
        // Update existing section
        await courseService.updateSection(editingSection.id, formData);
        showNotification(`Section ${formData.section_number} updated successfully`, 'success');
      } else {
        // Create new section
        await courseService.createSection(formData);
        showNotification(`Section ${formData.section_number} created successfully`, 'success');
      }
      handleCloseDialog();
      onDataChange();
    } catch (error: any) {
      console.error('Error saving section:', error);
      showNotification(error.response?.data?.detail || 'Failed to save section', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening delete confirmation dialog
  const handleConfirmDelete = (section: Section) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  // Handle delete section
  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    
    try {
      setLoading(true);
      await courseService.deleteSection(sectionToDelete.id);
      showNotification(`Section ${sectionToDelete.section_number} deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
      onDataChange();
    } catch (error: any) {
      console.error('Error deleting section:', error);
      showNotification(error.response?.data?.detail || 'Failed to delete section', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get filtered sections
  const filteredSections = sections.sort((a, b) => {
    // Sort by course code then section number
    const courseCompare = `${a.course.department.code}${a.course.code}`.localeCompare(
      `${b.course.department.code}${b.course.code}`
    );
    if (courseCompare !== 0) return courseCompare;
    return a.section_number.localeCompare(b.section_number);
  });

  // Check if a section is taught by the current user
  const isCurrentUserInstructor = (section: Section) => {
    return section.instructor?.id === userId;
  };

  // Function to calculate colspan based on user role and read-only status
  const getColSpan = () => {
    let span = 3; // Course + Section + Students
    if (!isInstructor) span++; // Add Instructor column
    if (!isReadOnly) span++; // Add Actions column
    return span;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
        </Typography>
        {!isReadOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Section
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Section</TableCell>
              {!isInstructor && <TableCell>Instructor</TableCell>}
              <TableCell>Students</TableCell>
              {!isReadOnly && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSections.length > 0 ? (
              filteredSections.map((section) => (
                <TableRow 
                  key={section.id} 
                  hover
                  sx={isCurrentUserInstructor(section) ? { backgroundColor: 'rgba(25, 118, 210, 0.08)' } : {}}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={section.course.department.code} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ marginRight: 1, fontWeight: 'bold' }}
                      />
                      <strong>{section.course.code}</strong>
                    </Box>
                  </TableCell>
                  <TableCell>{section.section_number}</TableCell>
                  {!isInstructor && (
                    <TableCell>
                      {section.instructor ? (
                        section.instructor.full_name
                      ) : (
                        <Typography variant="body2" color="text.secondary">Not Assigned</Typography>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge badgeContent={section.student_count} color="primary" showZero>
                      <PersonIcon />
                    </Badge>
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell align="right">
                      <Tooltip title="Edit Section">
                        <IconButton onClick={() => handleOpenDialog(section)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Section">
                        <IconButton onClick={() => handleConfirmDelete(section)} size="small">
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={getColSpan()} align="center">
                  No sections found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Section Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingSection ? 'Edit Section' : 'Add New Section'}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="course-select-label">Course</InputLabel>
              <Select
                labelId="course-select-label"
                name="course_id"
                value={formData.course_id.toString()}
                onChange={handleInputChange}
                label="Course"
                required
              >
                <MenuItem value="0" disabled>Select Course</MenuItem>
                {Array.isArray(courses) && courses.map((course) => (
                  <MenuItem key={course.id} value={course.id.toString()}>
                    {course.department.code}{course.code} - {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Section Number"
              name="section_number"
              value={formData.section_number}
              onChange={handleInputChange}
              required
              helperText="E.g., 1, 2, 3, etc."
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="instructor-select-label">Instructor</InputLabel>
              <Select
                labelId="instructor-select-label"
                name="instructor_id"
                value={formData.instructor_id?.toString() || ''}
                onChange={handleInputChange}
                label="Instructor"
                disabled={loadingInstructors}
              >
                <MenuItem value="">No Instructor</MenuItem>
                {Array.isArray(instructors) && instructors.map((instructor) => (
                  <MenuItem key={instructor.id} value={instructor.id.toString()}>
                    {instructor.full_name} ({instructor.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Student Count"
              name="student_count"
              type="number"
              value={formData.student_count}
              onChange={handleInputChange}
              required
            />
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
              {loading ? <CircularProgress size={24} /> : editingSection ? 'Update' : 'Create'}
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
            Are you sure you want to delete section {sectionToDelete?.section_number} of {sectionToDelete?.course.department.code}{sectionToDelete?.course.code}?
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteSection} 
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

export default SectionList; 