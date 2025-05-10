import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Box, 
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Exam } from '../interfaces/exam';
import { Course } from '../interfaces/course';
import examService from '../services/examService';
import courseService from '../services/courseService';
import ExamList from '../components/exams/ExamList';

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const { authState } = useAuth();
  const isStaff = authState.user?.role === 'STAFF' || authState.user?.role === 'ADMIN';
  const isInstructor = authState.user?.role === 'INSTRUCTOR';
  const userId = authState.user?.user_id;

  // Load exams based on user role
  const loadExams = async () => {
    try {
      let examsResponse;
      
      // For instructors, we want to filter exams they are authorized to see
      // For staff, load all exams
      if (isInstructor && userId) {
        examsResponse = await examService.getExamsByInstructor(userId);
      } else {
        examsResponse = await examService.getAllExams();
      }
      
      // Debug logging
      console.log('Exams API Response:', examsResponse);
      
      // Ensure we always return an array
      if (!examsResponse.data) {
        console.error('Empty exams response data');
        return [];
      }
      
      // If data is an array, return it; if it's an object with results property, return that; otherwise empty array
      if (Array.isArray(examsResponse.data)) {
        console.log(`Loaded ${examsResponse.data.length} exams`);
        return examsResponse.data;
      } else if (examsResponse.data && typeof examsResponse.data === 'object' && Array.isArray(examsResponse.data.results)) {
        console.log(`Loaded ${examsResponse.data.results.length} exams from paginated response`);
        return examsResponse.data.results;
      } else {
        console.error('Unexpected exams response format:', examsResponse.data);
        return [];
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      throw error;
    }
  };

  // Load courses for dropdowns
  const loadCourses = async () => {
    try {
      let coursesResponse;
      
      // For instructors, we want to filter courses they teach
      // For staff, load all courses
      if (isInstructor && userId) {
        coursesResponse = await courseService.getCoursesByInstructor(userId);
      } else {
        coursesResponse = await courseService.getAllCourses();
      }
      
      // Debug logging
      console.log('Courses API Response:', coursesResponse);
      
      // Ensure we always return an array
      if (!coursesResponse.data) {
        console.error('Empty courses response data');
        return [];
      }
      
      // If data is an array, return it; if it's an object with results property, return that; otherwise empty array
      if (Array.isArray(coursesResponse.data)) {
        return coursesResponse.data;
      } else if (coursesResponse.data && typeof coursesResponse.data === 'object' && Array.isArray(coursesResponse.data.results)) {
        return coursesResponse.data.results;
      } else {
        console.error('Unexpected courses response format:', coursesResponse.data);
        return [];
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      throw error;
    }
  };

  // Load exams and courses
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load exams and courses in parallel
      const [examsData, coursesData] = await Promise.all([
        loadExams(),
        loadCourses()
      ]);
      
      setExams(examsData);
      setCourses(coursesData);
    } catch (err: any) {
      console.error('Error loading exam data:', err);
      setError(err.message || 'Failed to load exams and courses');
      // Initialize with empty arrays when there's an error
      setExams([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Refresh data after changes
  const handleDataChange = () => {
    loadData();
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4">Exam Management</Typography>
          {isStaff ? (
            <Typography variant="subtitle1">
              Manage exam schedules for all courses
            </Typography>
          ) : (
            <Typography variant="subtitle1">
              Manage exam schedules for your courses
            </Typography>
          )}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <ExamList 
          exams={exams} 
          courses={courses}
          isReadOnly={false} 
          onDataChange={handleDataChange}
          showNotification={showNotification}
        />
      </Paper>

      {/* Notification Snackbar */}
      {notification && (
        <Snackbar 
          open={true} 
          autoHideDuration={6000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseNotification} severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
};

export default ExamManagement; 