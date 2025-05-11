import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Tab,
  Tabs,
  Grid as MuiGrid,
  IconButton,
  Tooltip,
  Badge,
  Snackbar,
  Link as MuiLink,
  MenuItem
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RoomIcon from '@mui/icons-material/Room';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useAuth } from '../context/AuthContext';
import { format, isPast, isToday, isTomorrow, isAfter, parseISO } from 'date-fns';
import proctoringService, { ProctorAssignment } from '../services/proctoringService';
import swapService, { CreateSwapRequestData } from '../services/swapService';
import notificationService from '../services/notificationService';
import { Notification } from '../interfaces/notification';
import { Link as RouterLink } from 'react-router-dom';

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

// Create a functional component wrapper for Grid to avoid type errors
const Grid = (props: any) => <MuiGrid {...props} />;

const MyProctorings: React.FC = () => {
  const { authState } = useAuth();
  const [assignments, setAssignments] = useState<ProctorAssignment[]>([]);
  const [swapHistory, setSwapHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapHistoryLoading, setSwapHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSwapDialog, setOpenSwapDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ProctorAssignment | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- NEW State for Notifications ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  // --- END NEW State ---

  // --- Moved Notification Handlers Here ---
  const handleMarkNotificationAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setSnackbarMessage('Notification marked as read.');
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setSnackbarMessage('Failed to mark notification as read.');
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setSnackbarMessage('All notifications marked as read.');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setSnackbarMessage('Failed to mark all notifications as read.');
    }
  };
  // --- END Moved Notification Handlers ---

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load proctor assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const data = await proctoringService.getMyProctorings();
        setAssignments(data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error fetching proctor assignments');
        console.error('Error fetching proctor assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSwapHistory = async () => {
      try {
        setSwapHistoryLoading(true);
        const data = await proctoringService.getSwapHistory();
        setSwapHistory(data);
      } catch (err: any) {
        console.error('Error fetching swap history:', err);
      } finally {
        setSwapHistoryLoading(false);
      }
    };

    const fetchNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const data = await notificationService.getMyNotifications();
        setNotifications(data);
        setNotificationError(null);
      } catch (err: any) {
        setNotificationError('Failed to load notifications.');
        console.error('Error fetching notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchAssignments();
    fetchSwapHistory();
    fetchNotifications();
  }, [refreshTrigger]);

  // Check if an exam is within 3 hours
  const isWithin3Hours = (examDate: string, examTime: string) => {
    const examDateTime = new Date(`${examDate}T${examTime}`);
    const now = new Date();
    const diff = examDateTime.getTime() - now.getTime();
    return diff <= 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  };

  // Handle opening the swap dialog
  const handleOpenSwapDialog = (assignment: ProctorAssignment) => {
    setSelectedAssignment(assignment);
    setSwapReason('');
    setSwapError(null);
    setSwapSuccess(false);
    setOpenSwapDialog(true);
  };

  // Handle closing the swap dialog
  const handleCloseSwapDialog = () => {
    setOpenSwapDialog(false);
    setSelectedAssignment(null);
  };

  // Handle confirming an assignment
  const handleConfirmAssignment = async (assignmentId: number) => {
    try {
      await proctoringService.confirmAssignment(assignmentId);
      setRefreshTrigger(prev => prev + 1);
      setSnackbarMessage('Assignment confirmed successfully!');
    } catch (err: any) {
      console.error('Error confirming assignment:', err);
      setError(err.response?.data?.detail || 'Error confirming assignment');
      setSnackbarMessage('Failed to confirm assignment.');
    }
  };

  // Handle requesting a proctor swap
  const handleRequestSwap = async () => {
    if (!selectedAssignment) {
      setSwapError('Please select a proctoring assignment');
      return;
    }

    try {
      setSwapLoading(true);
      
      const swapData: CreateSwapRequestData = {
        original_assignment: selectedAssignment.id,
        reason: swapReason.trim() || ""  // Ensure reason is never undefined
      };
      
      console.log("Sending swap request:", JSON.stringify(swapData));
      await swapService.createSwapRequest(swapData);
      
      setSwapSuccess(true);
      setSwapError(null);
      setSnackbarMessage('Swap request submitted successfully!');
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => {
        handleCloseSwapDialog();
      }, 2000);
    } catch (err: any) {
      console.error('Error requesting swap:', err);
      let errorMessage = 'Error requesting swap';
      
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data));
        
        // Try to extract a more specific error message
        if (err.response.data) {
          if (err.response.data.detail) {
            errorMessage = err.response.data.detail;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.errors && err.response.data.errors.original_assignment) {
            // Special case for original_assignment field errors
            errorMessage = `Assignment error: ${err.response.data.errors.original_assignment}`;
          } else if (typeof err.response.data === 'object') {
            // Handle validation errors from Django REST Framework
            const fieldErrors = Object.entries(err.response.data)
              .map(([field, errors]) => `${field}: ${errors}`)
              .join('; ');
            if (fieldErrors) {
              errorMessage = fieldErrors;
            }
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setSwapError(errorMessage);
    } finally {
      setSwapLoading(false);
    }
  };

  // Manual refresh of data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Get the status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <Chip label="Assigned" color="primary" variant="outlined" />;
      case 'CONFIRMED':
        return <Chip label="Confirmed" color="success" />;
      case 'COMPLETED':
        return <Chip label="Completed" color="default" />;
      case 'SWAPPED':
        return <Chip label="Swapped" color="secondary" />;
      case 'DECLINED':
        return <Chip label="Declined" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  // Check if a swap is possible
  const canSwap = (assignment: ProctorAssignment) => {
    // Cannot swap if:
    // 1. The exam is in the past
    // 2. The exam is within 3 hours
    // 3. The assignment has already been swapped 3 times (temporarily disabled for testing)
    // 4. The status is not ASSIGNED or CONFIRMED
    
    const examDate = new Date(`${assignment.exam.date}T${assignment.exam.start_time}`);
    const isPastExam = isPast(examDate);
    const isNear = isWithin3Hours(assignment.exam.date, assignment.exam.start_time);
    // FIXED: removed maxSwapsReached check to allow all assignments to be swappable regardless of swap_depth
    // const maxSwapsReached = assignment.swap_depth >= 3;
    const validStatus = ['ASSIGNED', 'CONFIRMED'].includes(assignment.status);
    
    // Print debugging info
    console.log(`Assignment ${assignment.id} eligibility:`, {
      status: assignment.status,
      isCorrectStatus: validStatus,
      notWithinOneHour: !isNear,
      belowSwapLimit: true, // Always true now since we removed the check
      isEligible: !isPastExam && !isNear && validStatus
    });
    
    return !isPastExam && !isNear && validStatus;
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      try { // Fallback for non-ISO strings, though backend should be consistent
        return format(new Date(dateString), 'MMM d, yyyy');
      } catch (e) {
        return dateString; 
      }
    }
  };

  if (loading && assignments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Filter assignments
  const upcomingAssignments = assignments.filter(
    assignment => !isPast(new Date(`${assignment.exam.date}T${assignment.exam.end_time}`))
  );
  
  const pastAssignments = assignments.filter(
    assignment => isPast(new Date(`${assignment.exam.date}T${assignment.exam.end_time}`))
  );

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* --- NEW Notification Display Area --- */}
      {notificationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {notificationError}
        </Alert>
      )}
      {loadingNotifications && (
        <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
          <CircularProgress size={24} /> <Typography sx={{ ml: 1 }}>Loading notifications...</Typography>
        </Box>
      )}
      {!loadingNotifications && notifications.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Notifications ({unreadNotificationsCount} unread)</Typography>
            {unreadNotificationsCount > 0 && (
              <Button 
                size="small" 
                onClick={handleMarkAllNotificationsAsRead}
                startIcon={<MarkEmailReadIcon />}
              >
                Mark all as read
              </Button>
            )}
          </Box>
          <List dense>
            {notifications.map((notification) => (
              <ListItemButton 
                key={notification.id} 
                sx={{ 
                  mb: 0.5, 
                  borderRadius: 1,
                  backgroundColor: notification.is_read ? 'action.hover' : 'primary.lighter',
                  opacity: notification.is_read ? 0.7 : 1,
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}>
                      {notification.message}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {format(parseISO(notification.created_at), 'MMM d, yyyy HH:mm')}
                        {notification.related_exam_info && ` - ${notification.related_exam_info}`}
                      </Typography>
                      {notification.link && (
                        <MuiLink component={RouterLink} to={notification.link} variant="caption" sx={{ ml: 1, display: 'inline-block' }}>
                          View Details
                        </MuiLink>
                      )}
                    </>
                  }
                />
                {!notification.is_read && (
                   <Tooltip title="Mark as read">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMarkNotificationAsRead(notification.id);}}>
                      <CheckCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
      {/* --- END NEW Notification Display Area --- */}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Proctoring Assignments
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton 
            onClick={handleRefresh} 
            color="primary"
            disabled={loading || loadingNotifications}
            aria-label="refresh data"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="proctoring tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Badge badgeContent={upcomingAssignments.length} color="primary" sx={{ mr: 1 }}>
                  <CalendarTodayIcon fontSize="small" />
                </Badge>
                Upcoming Assignments
              </Box>
            } 
            id="proctoring-tab-0" 
            aria-controls="proctoring-tabpanel-0" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
                Past Assignments
              </Box>
            } 
            id="proctoring-tab-1" 
            aria-controls="proctoring-tabpanel-1" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SwapHorizIcon fontSize="small" sx={{ mr: 1 }} />
                Swap History
              </Box>
            } 
            id="proctoring-tab-2" 
            aria-controls="proctoring-tabpanel-2" 
          />
        </Tabs>
      </Box>

      {/* Upcoming Assignments Tab */}
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : upcomingAssignments.length === 0 ? (
          <Paper sx={{ p: 3, mt: 2, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Typography align="center">You don't have any upcoming proctoring assignments.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {upcomingAssignments.map(assignment => (
              <Grid item xs={12} md={6} key={assignment.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    boxShadow: 3,
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: -12, 
                      right: 16, 
                      zIndex: 1 
                    }}
                  >
                    {getStatusDisplay(assignment.status)}
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {assignment.exam.title}
                    </Typography>
                    <Typography color="textSecondary" variant="subtitle1">
                      {assignment.exam.section.course.code} - Section {assignment.exam.section.section_number}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2">
                          {formatDate(assignment.exam.date)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2">
                          {assignment.exam.start_time} - {assignment.exam.end_time}
                        </Typography>
                      </Box>
                      {assignment.exam_room && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <RoomIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2">
                            {assignment.exam_room.classroom_name} - Room {assignment.exam_room.room_number}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                    {assignment.status === 'ASSIGNED' && (
                      <Button 
                        startIcon={<CheckCircleOutlineIcon />}
                        color="success" 
                        variant="outlined"
                        onClick={() => handleConfirmAssignment(assignment.id)}
                      >
                        Confirm
                      </Button>
                    )}
                    <Box sx={{ ml: 'auto' }}>
                      <Tooltip title={
                        canSwap(assignment) 
                          ? "Request swap with another TA" 
                          : "Swap not available. Either the exam is too soon, has been swapped too many times, or has a status that can't be changed."
                      }>
                        <span>
                          <Button 
                            startIcon={<SwapHorizIcon />}
                            color="primary" 
                            variant="contained"
                            onClick={() => handleOpenSwapDialog(assignment)}
                            disabled={!canSwap(assignment)}
                          >
                            Swap
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Past Assignments Tab */}
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : pastAssignments.length === 0 ? (
          <Paper sx={{ p: 3, mt: 2, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Typography align="center">You don't have any past proctoring assignments.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {pastAssignments.map(assignment => (
              <Grid item xs={12} md={6} key={assignment.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    boxShadow: 2,
                    borderRadius: 2,
                    opacity: 0.9,
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: -12, 
                      right: 16, 
                      zIndex: 1 
                    }}
                  >
                    {getStatusDisplay(assignment.status)}
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {assignment.exam.title}
                    </Typography>
                    <Typography color="textSecondary" variant="subtitle1">
                      {assignment.exam.section.course.code} - Section {assignment.exam.section.section_number}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(assignment.exam.date), 'MMMM d, yyyy')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {assignment.exam.start_time} - {assignment.exam.end_time}
                        </Typography>
                      </Box>
                      {assignment.exam_room && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <RoomIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {assignment.exam_room.classroom_name} - Room {assignment.exam_room.room_number}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Swap History Tab */}
      <TabPanel value={tabValue} index={2}>
        {swapHistoryLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : swapHistory.length === 0 ? (
          <Paper sx={{ p: 3, mt: 2, borderRadius: 2, backgroundColor: '#f5f5f5' }}>
            <Typography align="center">You don't have any swap history.</Typography>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 2, boxShadow: 2 }}>
            <List>
              {swapHistory.map((swap, index) => (
                <React.Fragment key={swap.id}>
                  <ListItemButton sx={{ py: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {format(new Date(swap.created_at), 'MMM d, yyyy')}
                        </Typography>
                        <Chip 
                          label={swap.status} 
                          size="small" 
                          color={
                            swap.status === 'ACCEPTED' ? 'success' : 
                            swap.status === 'REJECTED' ? 'error' : 
                            swap.status === 'PENDING' ? 'warning' : 'default'
                          }
                          sx={{ mt: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={9}>
                        <Typography variant="body1">
                          Requested swap with <strong>{swap.requested_proctor.full_name}</strong> for <strong>{swap.original_assignment.exam.title}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Reason: {swap.reason}
                        </Typography>
                        {swap.status === 'REJECTED' && swap.rejection_reason && (
                          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            Rejection reason: {swap.rejection_reason}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </ListItemButton>
                  {index < swapHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </TabPanel>

      {/* Swap Dialog */}
      <Dialog 
        open={openSwapDialog} 
        onClose={handleCloseSwapDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Proctor Swap</DialogTitle>
        <DialogContent>
          {swapLoading && <CircularProgress sx={{ mb: 2 }} />}
          {swapError && <Alert severity="error" sx={{ mb: 2 }}>{swapError}</Alert>}
          {swapSuccess && <Alert severity="success" sx={{ mb: 2 }}>Swap request submitted successfully!</Alert>}
          
          {selectedAssignment && (
            <Typography gutterBottom>
              Requesting swap for: <strong>{selectedAssignment.exam.title}</strong> on {formatDate(selectedAssignment.exam.date)}
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Swap Request"
            value={swapReason}
            onChange={(e) => setSwapReason(e.target.value)}
            sx={{ mt: 2 }}
            disabled={swapLoading || swapSuccess}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSwapDialog} disabled={swapLoading}>Cancel</Button>
          <Button 
            onClick={handleRequestSwap} 
            variant="contained" 
            disabled={swapLoading || swapSuccess}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for general messages */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={() => setSnackbarMessage(null)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default MyProctorings; 