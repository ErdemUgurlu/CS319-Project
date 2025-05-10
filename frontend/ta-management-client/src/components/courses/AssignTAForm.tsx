import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  SelectChangeEvent
} from '@mui/material';
import { Course, Section } from '../../interfaces/course';
import { User } from '../../interfaces/user';
import taService from '../../services/taService';
import courseService from '../../services/courseService';

interface AssignTAFormProps {
  course: Course;
  staffDepartmentCode: string;
  onAssignmentSuccess?: () => void;
  onCancel?: () => void;
}

const AssignTAForm: React.FC<AssignTAFormProps> = ({ course, staffDepartmentCode, onAssignmentSuccess, onCancel }) => {
  const [availableTAs, setAvailableTAs] = useState<User[]>([]);
  const [selectedTaId, setSelectedTaId] = useState<string>('');
  const [loadingTAs, setLoadingTAs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchTAs = useCallback(async () => {
    if (!staffDepartmentCode) {
      setError('Staff department not provided.');
      setAvailableTAs([]);
      return;
    }
    setLoadingTAs(true);
    setError(null);
    try {
      const tas = await taService.getAllTAs({ department: staffDepartmentCode });
      setAvailableTAs(tas || []);
    } catch (err) {
      console.error('Error fetching TAs:', err);
      setError('Failed to load TAs for your department.');
      setAvailableTAs([]);
    } finally {
      setLoadingTAs(false);
    }
  }, [staffDepartmentCode]);

  useEffect(() => {
    fetchTAs();
    setSelectedTaId('');
    setSuccessMessage(null);
    setError(null);
  }, [course, staffDepartmentCode, fetchTAs]);

  const handleTaChange = (event: SelectChangeEvent<string>) => {
    setSelectedTaId(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTaId) {
      setError('Please select a TA.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    let assignmentsMade = 0;
    let sectionsOfCourse: Section[] = [];

    try {
      const sectionsResponse = await courseService.getSectionsByCourse(course.id);
      if (sectionsResponse.data && Array.isArray(sectionsResponse.data.results)) {
        sectionsOfCourse = sectionsResponse.data.results;
      } else if (sectionsResponse.data && Array.isArray(sectionsResponse.data)) {
        sectionsOfCourse = sectionsResponse.data;
      } else {
        throw new Error('Could not load sections for the course.');
      }

      if (sectionsOfCourse.length === 0) {
        setError('This course has no sections. Cannot assign TA.');
        setIsSubmitting(false);
        return;
      }

      const taIdNum = parseInt(selectedTaId, 10);
      for (const section of sectionsOfCourse) {
        await taService.assignTaToSection(taIdNum, section.id);
        assignmentsMade++;
      }
      
      setSuccessMessage(`Successfully assigned TA to course ${course.code} (${assignmentsMade} section(s)).`);
      setSelectedTaId('');
      if (onAssignmentSuccess) {
        onAssignmentSuccess();
      }
    } catch (err: any) {
      console.error('Error assigning TA to course sections:', err);
      const errorMessage = err.response?.data?.non_field_errors?.[0] || 
                         err.response?.data?.detail || 
                         err.message || 
                         'Failed to assign TA to course.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!course) {
    return <Typography>Please select a course first to assign a TA.</Typography>;
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Assign TA to Course: {course.title} ({course.code})
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Course Department: {course.department.name}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Assigning from your department: {staffDepartmentCode}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <form onSubmit={handleSubmit}>
        <Box sx={{ mt: 2, mb:3 }}>
            <Typography variant="subtitle2" gutterBottom>Select TA (from department: {staffDepartmentCode})</Typography>
            {loadingTAs ? (
              <CircularProgress size={24} />
            ) : (
              <FormControl fullWidth margin="normal" disabled={availableTAs.length === 0}>
                <InputLabel id="ta-select-label">Teaching Assistant</InputLabel>
                <Select
                  labelId="ta-select-label"
                  value={selectedTaId}
                  label="Teaching Assistant"
                  onChange={handleTaChange}
                >
                  {availableTAs.length === 0 && <MenuItem value="" disabled>No TAs available in department {staffDepartmentCode}</MenuItem>}
                  {availableTAs.map(ta => (
                    <MenuItem key={ta.id} value={ta.id.toString()}>
                      {ta.full_name} ({ta.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {onCancel && (
            <Button onClick={onCancel} variant="outlined" disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || !selectedTaId || loadingTAs}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Assign TA to Course'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default AssignTAForm; 