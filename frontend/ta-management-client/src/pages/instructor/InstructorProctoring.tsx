import React, { useState, useEffect, ReactElement } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RoomIcon from '@mui/icons-material/Room';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import proctoringService from '../../services/proctoringService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`proctoring-tabpanel-${index}`}
      aria-labelledby={`proctoring-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const InstructorProctoring = (): ReactElement => {
  const { authState } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [availableTAs, setAvailableTAs] = useState<any[]>([]);
  const [loadingTAs, setLoadingTAs] = useState(false);
  const [assigningTA, setAssigningTA] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [selectedTAs, setSelectedTAs] = useState<number[]>([]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        console.log("Fetching exams for instructor...");
        const data = await proctoringService.getUpcomingExams();
        console.log("Exam data received:", data);
        setExams(data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching exams:", err);
        console.error("Error details:", err.response?.data || "No response data");
        setError(err.response?.data?.detail || 'Error fetching exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [refreshTrigger]);

  // Handle refreshing the data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle opening the create exam dialog
  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  // Handle closing the create exam dialog
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  // Handle opening the assign proctors dialog
  const handleOpenAssignDialog = async (exam: any) => {
    setSelectedExam(exam);
    setOpenAssignDialog(true);
    
    try {
      setLoadingTAs(true);
      const tas = await proctoringService.getEligibleProctorsForExam(exam.id);
      setAvailableTAs(tas);
    } catch (err: any) {
      console.error('Error fetching eligible TAs:', err);
    } finally {
      setLoadingTAs(false);
    }
  };

  // Handle closing the assign proctors dialog
  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
    setSelectedExam(null);
  };

  // Filter exams based on tab
  const upcomingExams = exams.filter(exam => exam.status !== 'COMPLETED' && exam.status !== 'CANCELLED');
  const pastExams = exams.filter(exam => exam.status === 'COMPLETED' || exam.status === 'CANCELLED');

  // Get status chip
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Chip label="Draft" color="default" />;
      case 'PENDING':
        return <Chip label="Pending" color="warning" />;
      case 'SCHEDULED':
        return <Chip label="Scheduled" color="success" />;
      case 'COMPLETED':
        return <Chip label="Completed" color="info" />;
      case 'CANCELLED':
        return <Chip label="Cancelled" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  // Handle TA assignment
  const handleAssignTA = async (taId: number) => {
    if (!selectedExam) return;
    
    try {
      setAssigningTA(true);
      setAssignmentError(null);
      setAssignmentSuccess(null);
      
      // Add the TA to selected TAs if not already selected
      if (!selectedTAs.includes(taId)) {
        setSelectedTAs(prevSelected => [...prevSelected, taId]);
      }
      
      // Perform immediate assignment
      const response = await proctoringService.assignProctorsToExam(
        selectedExam.id, 
        {
          assignment_type: 'MANUAL',
          manual_proctors: [taId],
          replace_existing: false, // Don't replace existing assignments initially
          is_paid: false // Default to false for instructor assignments
        }
      );
      
      setAssignmentSuccess(`Teaching assistant assigned successfully!`);
      
      // After assignment is successful, refresh the exam data
      handleRefresh();
      
      // Close the dialog after a short delay
      setTimeout(() => {
        handleCloseAssignDialog();
      }, 1500);
    } catch (err: any) {
      console.error('Error assigning TA:', err);
      
      // Check if this is the "exam already has assignments" error
      const errorMsg = err.response?.data?.error || '';
      if (errorMsg.includes('Exam already has proctor assignments')) {
        // We can offer to replace existing assignments
        const confirmReplace = window.confirm(
          'This exam already has proctor assignments. Would you like to replace them with this TA?'
        );
        
        if (confirmReplace) {
          try {
            // Call the service with replace_existing set to true
            await proctoringService.assignProctorsToExam(
              selectedExam.id, 
              {
                assignment_type: 'MANUAL',
                manual_proctors: [taId],
                replace_existing: true,
                is_paid: false // Default to false for instructor assignments
              }
            );
            setAssignmentSuccess(`Teaching assistant assigned successfully (replaced existing assignments)!`);
            
            // After assignment is successful, refresh the exam data
            handleRefresh();
            
            // Close the dialog after a short delay
            setTimeout(() => {
              handleCloseAssignDialog();
            }, 1500);
            return;
          } catch (replaceErr: any) {
            console.error('Error replacing proctor assignments:', replaceErr);
            setAssignmentError(`Failed to replace proctor assignments: ${replaceErr.response?.data?.error || 'Unknown error'}`);
          }
        } else {
          setAssignmentError('Operation cancelled. Existing proctor assignments were not replaced.');
        }
      } else {
        setAssignmentError(err.response?.data?.error || 'Failed to assign teaching assistant');
      }
    } finally {
      setAssigningTA(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Exam Proctoring Management
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Create Exam
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="exam tabs"
        >
          <Tab label="Upcoming Exams" id="exams-tab-0" aria-controls="exams-tabpanel-0" />
          <Tab label="Past Exams" id="exams-tab-1" aria-controls="exams-tabpanel-1" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              {upcomingExams.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {upcomingExams.map((exam) => (
                    <Box sx={{ width: { xs: '100%', md: '48%' } }} key={exam.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6">{exam.title}</Typography>
                            {getStatusChip(exam.status)}
                          </Box>

                          <Typography color="textSecondary" gutterBottom>
                            {exam.section && exam.section.course ? 
                              `${exam.section.course.code} - ${exam.section.section_number}` : 
                              `Section ${exam.section_display || 'Unknown'}`
                            }
                          </Typography>

                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CalendarTodayIcon sx={{ mr: 1, fontSize: 'small' }} />
                              <Typography variant="body2">{formatDate(exam.date)}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <AccessTimeIcon sx={{ mr: 1, fontSize: 'small' }} />
                              <Typography variant="body2">
                                {exam.start_time} - {exam.end_time} ({exam.duration_minutes} minutes)
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <RoomIcon sx={{ mr: 1, fontSize: 'small' }} />
                              <Typography variant="body2">
                                {exam.room_count} room(s), {exam.student_count} students
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              Proctors: {exam.assigned_proctors_count}/{exam.proctor_count_needed}
                            </Typography>
                            {exam.status === 'DRAFT' || exam.status === 'PENDING' ? (
                              <Typography variant="caption" color="error">
                                This exam needs proctors to be assigned
                              </Typography>
                            ) : null}
                          </Box>
                        </CardContent>

                        <Box sx={{ display: 'flex', p: 1 }}>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            sx={{ mr: 1 }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="primary"
                            startIcon={<AssignmentIcon />}
                            onClick={() => handleOpenAssignDialog(exam)}
                          >
                            Assign Proctors
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            sx={{ ml: 'auto' }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Card>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography align="center" sx={{ p: 3 }}>
                  No upcoming exams found. Create a new exam to get started.
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {pastExams.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {pastExams.map((exam) => (
                    <Box sx={{ width: { xs: '100%', md: '48%' } }} key={exam.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6">{exam.title}</Typography>
                            {getStatusChip(exam.status)}
                          </Box>

                          <Typography color="textSecondary" gutterBottom>
                            {exam.section && exam.section.course ? 
                              `${exam.section.course.code} - ${exam.section.section_number}` : 
                              `Section ${exam.section_display || 'Unknown'}`
                            }
                          </Typography>

                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CalendarTodayIcon sx={{ mr: 1, fontSize: 'small' }} />
                              <Typography variant="body2">{formatDate(exam.date)}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <AccessTimeIcon sx={{ mr: 1, fontSize: 'small' }} />
                              <Typography variant="body2">
                                {exam.start_time} - {exam.end_time} ({exam.duration_minutes} minutes)
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography align="center" sx={{ p: 3 }}>
                  No past exams found.
                </Typography>
              )}
            </TabPanel>
          </>
        )}
      </Paper>

      {/* Create Exam Dialog - Simplified for now */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Exam</DialogTitle>
        <DialogContent>
          <Typography>
            The create exam form will be implemented here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCloseCreateDialog}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Proctors Dialog - Simplified for now */}
      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="md" fullWidth>
        <DialogTitle>Assign Proctors</DialogTitle>
        <DialogContent>
          {loadingTAs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {selectedExam && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6">{selectedExam.title}</Typography>
                  <Typography variant="body2">
                    {formatDate(selectedExam.date)} | {selectedExam.start_time} - {selectedExam.end_time}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Required proctors: {selectedExam.proctor_count_needed}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Available Teaching Assistants
              </Typography>

              {availableTAs.length > 0 ? (
                <List>
                  {availableTAs.map((ta) => (
                    <React.Fragment key={ta.id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={assigningTA}
                            onClick={() => handleAssignTA(ta.id)}
                          >
                            Assign
                          </Button>
                        }
                      >
                        <ListItemText
                          primary={ta.full_name}
                          secondary={
                            <>
                              <Typography variant="body2" component="span">
                                Level: {ta.academic_level} | Current Workload: {ta.details?.workload?.current}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography align="center" sx={{ p: 2 }}>
                  No TAs available.
                </Typography>
              )}

              {assignmentSuccess && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {assignmentSuccess}
                </Alert>
              )}
              
              {assignmentError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {assignmentError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCloseAssignDialog}>
            Confirm Assignments
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InstructorProctoring; 