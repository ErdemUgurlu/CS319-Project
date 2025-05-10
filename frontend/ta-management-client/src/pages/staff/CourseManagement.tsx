import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Box, 
  Tabs, 
  Tab, 
  Alert, 
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import CourseList from '../../components/courses/CourseList';
import SectionList from '../../components/courses/SectionList';
import ImportCourses from '../../components/courses/ImportCourses';
import AssignTAForm from '../../components/courses/AssignTAForm';
import { Course, Section } from '../../interfaces/course';
import courseService from '../../services/courseService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const CourseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // State for TA Assignment Modal
  const [selectedCourseForTaAssignment, setSelectedCourseForTaAssignment] = useState<Course | null>(null);
  const [isTaAssignmentModalOpen, setIsTaAssignmentModalOpen] = useState<boolean>(false);

  const { authState } = useAuth();
  const isStaff = authState.user?.role === 'STAFF' || authState.user?.role === 'ADMIN';
  const isInstructor = authState.user?.role === 'INSTRUCTOR';
  const userId = authState.user?.user_id;
  const staffDepartment = authState.user?.department;

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Load courses based on user role
  const loadCourses = async () => {
    try {
      let coursesResponse;
      
      // For instructors, we want to filter courses they teach
      // For staff, load all courses
      if (isInstructor && userId) {
        // Get courses where this instructor teaches at least one section
        coursesResponse = await courseService.getCoursesByInstructor(userId);
        console.log(`Loading courses for instructor ID ${userId}`);
      } else {
        // For staff users, load all courses
        coursesResponse = await courseService.getAllCourses();
      }
      
      // Debug logging
      console.log('Courses API Response:', coursesResponse);
      console.log('Courses data type:', typeof coursesResponse.data);
      console.log('Courses data is array:', Array.isArray(coursesResponse.data));
      
      // Ensure we always return an array
      if (!coursesResponse.data) {
        console.error('Empty courses response data');
        return [];
      }
      
      // If data is an array, return it; if it's an object with results property, return that; otherwise empty array
      if (Array.isArray(coursesResponse.data)) {
        console.log(`Loaded ${coursesResponse.data.length} courses`);
        return coursesResponse.data;
      } else if (coursesResponse.data && typeof coursesResponse.data === 'object' && Array.isArray(coursesResponse.data.results)) {
        console.log(`Loaded ${coursesResponse.data.results.length} courses from paginated response`);
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

  // Load sections based on user role
  const loadSections = async () => {
    try {
      let sectionsResponse;
      
      // For instructors, we want to filter sections they teach (where they are assigned as the instructor)
      // For staff, load all sections
      if (isInstructor && userId) {
        // Get sections where this instructor is specifically assigned
        sectionsResponse = await courseService.getSectionsByInstructor(userId);
        console.log(`Loading sections for instructor ID ${userId}`);
      } else {
        // For staff users, load all sections
        sectionsResponse = await courseService.getAllSections();
      }
      
      // Debug logging
      console.log('Sections API Response:', sectionsResponse);
      console.log('Sections data type:', typeof sectionsResponse.data);
      console.log('Sections data is array:', Array.isArray(sectionsResponse.data));
      
      // Ensure we always return an array
      if (!sectionsResponse.data) {
        console.error('Empty sections response data');
        return [];
      }
      
      // If data is an array, return it; if it's an object with results property, return that; otherwise empty array
      if (Array.isArray(sectionsResponse.data)) {
        console.log(`Loaded ${sectionsResponse.data.length} sections`);
        return sectionsResponse.data;
      } else if (sectionsResponse.data && typeof sectionsResponse.data === 'object' && Array.isArray(sectionsResponse.data.results)) {
        console.log(`Loaded ${sectionsResponse.data.results.length} sections from paginated response`);
        return sectionsResponse.data.results;
      } else {
        console.error('Unexpected sections response format:', sectionsResponse.data);
        return [];
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      throw error;
    }
  };

  // Load courses and sections
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load courses and sections in parallel
      const [coursesData, sectionsData] = await Promise.all([
        loadCourses(),
        loadSections()
      ]);
      
      setCourses(coursesData);
      setSections(sectionsData);
    } catch (err: any) {
      console.error('Error loading course data:', err);
      setError(err.message || 'Failed to load courses and sections');
      // Initialize with empty arrays when there's an error
      setCourses([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Refresh data after changes
  const handleDataChange = useCallback(() => {
    loadData();
  }, [loadData]);

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleOpenTaAssignmentModal = (course: Course) => {
    setSelectedCourseForTaAssignment(course);
    setIsTaAssignmentModalOpen(true);
  };

  const handleCloseTaAssignmentModal = () => {
    setIsTaAssignmentModalOpen(false);
    setSelectedCourseForTaAssignment(null);
    // Optionally refresh data if an assignment might have occurred
    loadData(); 
  };

  const handleTaAssignmentSuccess = () => {
    showNotification('TA assigned successfully!', 'success');
    // Modal will be closed by AssignTAForm or here, and data reloaded by handleCloseTaAssignmentModal
    // To ensure modal closes and data reloads even if AssignTAForm doesn't explicitly call a close function:
    // handleCloseTaAssignmentModal(); // Call this if AssignTAForm doesn't have its own close/cancel
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
          <Typography variant="h4">Course Management</Typography>
          {isStaff ? (
            <Typography variant="subtitle1">
              Manage departments, courses, and sections
            </Typography>
          ) : (
            <Typography variant="subtitle1">
              View your assigned courses and sections
            </Typography>
          )}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="course management tabs">
            <Tab label={isInstructor ? "My Courses" : "Courses"} id="course-tab-0" aria-controls="course-tabpanel-0" />
            <Tab label={isInstructor ? "My Sections" : "Sections"} id="course-tab-1" aria-controls="course-tabpanel-1" />
            {isStaff && <Tab label="Import" id="course-tab-2" aria-controls="course-tabpanel-2" />}
          </Tabs>
        </Box>

        {/* Courses Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 2 }}>
            {isInstructor && (
              <Typography variant="body2" color="text.secondary">
                Showing only courses where you are assigned as an instructor to at least one section.
              </Typography>
            )}
            {/* Add a button for each course in staff view to open TA assignment modal */}
            {isStaff && courses.length > 0 && activeTab === 0 && (
                <Typography variant="caption" display="block" gutterBottom sx={{mt: 1}}>
                    Select a course from the list below to manage details or assign TAs.
                </Typography>
            )}
          </Box>
          <CourseList 
            courses={courses} 
            isReadOnly={!isStaff} 
            onDataChange={handleDataChange}
            showNotification={showNotification}
            onAssignTaClick={isStaff ? handleOpenTaAssignmentModal : undefined}
            showAssignTaButton={isStaff}
          />
        </TabPanel>

        {/* Sections Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 2 }}>
            {isInstructor && (
              <Typography variant="body2" color="text.secondary">
                Showing only sections where you are assigned as the instructor.
              </Typography>
            )}
          </Box>
          <SectionList 
            sections={sections} 
            courses={courses}
            isReadOnly={!isStaff} 
            onDataChange={handleDataChange}
            showNotification={showNotification}
          />
        </TabPanel>

        {/* Import Tab - Staff Only */}
        {isStaff && (
          <TabPanel value={activeTab} index={2}>
            <ImportCourses 
              onImportComplete={handleDataChange}
              showNotification={showNotification}
            />
          </TabPanel>
        )}
      </Paper>

      {/* TA Assignment Modal */}
      {selectedCourseForTaAssignment && staffDepartment && (
        <Dialog 
            open={isTaAssignmentModalOpen} 
            onClose={handleCloseTaAssignmentModal} 
            maxWidth="md" 
            fullWidth
        >
          <DialogTitle>
            Assign TA to Course: {selectedCourseForTaAssignment.title} ({selectedCourseForTaAssignment.code})
          </DialogTitle>
          <DialogContent sx={{pt:1}}>
            <AssignTAForm 
              course={selectedCourseForTaAssignment} 
              staffDepartmentCode={staffDepartment}
              onAssignmentSuccess={() => {
                handleTaAssignmentSuccess();
                handleCloseTaAssignmentModal();
              }}
              onCancel={handleCloseTaAssignmentModal} 
            />
          </DialogContent>
        </Dialog>
      )}

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

export default CourseManagement; 