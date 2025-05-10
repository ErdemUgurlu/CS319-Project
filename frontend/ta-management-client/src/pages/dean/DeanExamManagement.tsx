import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Box, 
  CircularProgress,
  Alert,
  Snackbar,
  Button,
  Grid,
  Breadcrumbs
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamStatus } from '../../interfaces/exam';
import { Course } from '../../interfaces/course';
import examService from '../../services/examService';
import courseService from '../../services/courseService';
import ExamList from '../../components/exams/ExamList';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AssignmentIcon from '@mui/icons-material/Assignment';

const DeanExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const { authState } = useAuth();
  const isDeanOffice = authState.user?.role === 'DEAN_OFFICE';
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not a Dean's Office user
    if (!isDeanOffice) {
      navigate('/dashboard');
    }
  }, [isDeanOffice, navigate]);

  // Load exams for Dean's Office
  const loadExams = async () => {
    try {
      // Always get all exams for Dean's Office; filtering is handled by ExamList tabs
      console.log('DeanOffice: Attempting to get all exams');
      const examsResponse = await examService.getAllExams();
      
      // Debug logging
      console.log('Exams API Response:', examsResponse);
      
      // Ensure we always return an array
      if (!examsResponse.data) {
        console.error('Empty exams response data');
        return [];
      }
      
      // Get the exams data
      let examsData: Exam[] = [];
      if (Array.isArray(examsResponse.data)) {
        console.log(`Loaded ${examsResponse.data.length} exams`);
        examsData = examsResponse.data;
      } else if (examsResponse.data && typeof examsResponse.data === 'object' && Array.isArray(examsResponse.data.results)) {
        console.log(`Loaded ${examsResponse.data.results.length} exams from paginated response`);
        examsData = examsResponse.data.results;
      } else {
        console.error('Unexpected exams response format:', examsResponse.data);
        return [];
      }
      
      return examsData;
    } catch (error) {
      console.error('Error loading exams:', error);
      throw error;
    }
  };

  // Load courses for reference
  const loadCourses = async () => {
    try {
      const coursesResponse = await courseService.getAllCourses();
      
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
      
      console.log('Loaded exams:', examsData);
      console.log('Loaded courses:', coursesData);
      
      setExams(examsData);
      setCourses(coursesData);
      
      if (examsData.length === 0) {
        setError('No exams found.');
      } else {
        console.log(`Successfully loaded ${examsData.length} exams.`);
      }
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
  }, [isDeanOffice, navigate]);

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link color="inherit" to="/dashboard">
            Dashboard
          </Link>
          <Typography color="text.primary">Exam Management</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssignmentIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
          <Typography variant="h5" component="h1">
            Assign Classrooms to Exams 
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
           Review and assign classrooms to exams.
        </Typography>

        {loading && <CircularProgress sx={{ display: 'block', margin: 'auto' }} />}
        
        {error && !loading && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!loading && (
          <ExamList 
            exams={exams} 
            courses={courses} 
            isReadOnly={!isDeanOffice}
            onDataChange={handleDataChange}
            showNotification={showNotification}
            initialTab={ExamStatus.WAITING_FOR_PLACES}
          />
        )}
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

export default DeanExamManagement; 