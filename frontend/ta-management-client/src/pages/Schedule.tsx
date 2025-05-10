import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Box, 
  Paper, 
  Typography, 
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
  DialogContentText,
  DialogActions,
  Stack,
  Chip,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../context/AuthContext';
import scheduleService, { WeeklyScheduleEntry } from '../services/scheduleService';

// Days of week mapping between UI and API
const DAY_MAPPING: Record<string, string> = {
  'Monday': 'MON',
  'Tuesday': 'TUE',
  'Wednesday': 'WED',
  'Thursday': 'THU',
  'Friday': 'FRI',
  'Saturday': 'SAT',
  'Sunday': 'SUN'
};

// Reverse mapping from API to UI days
const REVERSE_DAY_MAPPING: Record<string, string> = {
  'MON': 'Monday',
  'TUE': 'Tuesday',
  'WED': 'Wednesday',
  'THU': 'Thursday',
  'FRI': 'Friday',
  'SAT': 'Saturday',
  'SUN': 'Sunday'
};

// Sample days and time slots
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '08:30 - 09:20', '09:30 - 10:20', '10:30 - 11:20', '11:30 - 12:20',
  '13:30 - 14:20', '14:30 - 15:20', '15:30 - 16:20', '16:30 - 17:20'
];

// Status for class hours
const CLASS_HOURS_STATUS = { value: 'class', label: 'Class Hours', color: 'primary' };

interface ScheduleCell {
  id?: number;
  day: string;
  timeSlot: string;
  status: string;
  course?: string; // Course name or description
}

const Schedule: React.FC = () => {
  const { authState } = useAuth();
  const { user } = authState;
  
  const [schedule, setSchedule] = useState<ScheduleCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // For edit dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState<ScheduleCell | null>(null);
  // const [courseInput, setCourseInput] = useState(''); // Old state for free-text input

  // New states for the dialog
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [selectedCourseOption, setSelectedCourseOption] = useState<string>('');
  const [manualCourseName, setManualCourseName] = useState<string>('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  // Parse timeSlot into start_time and end_time for API
  const parseTimeSlot = (timeSlot: string): { start_time: string, end_time: string } => {
    const [startStr, endStr] = timeSlot.split(' - ');
    return {
      start_time: startStr,
      end_time: endStr
    };
  };
  
  // Create timeSlot string from start_time and end_time
  const createTimeSlot = (start_time: string, end_time: string): string => {
    // Remove seconds if present
    const removeSeconds = (timeStr: string) => {
      return timeStr.replace(/(\d{2}):(\d{2}):(\d{2})/g, '$1:$2');
    };
    
    const normalizedStart = removeSeconds(start_time.trim());
    const normalizedEnd = removeSeconds(end_time.trim());
    
    return `${normalizedStart} - ${normalizedEnd}`;
  };
  
  // Convert API entry to UI cell
  const apiToUiEntry = (entry: WeeklyScheduleEntry): ScheduleCell => {
    console.log('Converting API entry to UI cell:', entry);
    
    // Fix day format - handle both full name and code
    let day = entry.day;
    
    // If it's already a full day name, use it directly
    if (Object.values(REVERSE_DAY_MAPPING).includes(day)) {
      // Day format already correct
      console.log(`Day format already correct: ${day}`);
    } 
    // If it's a three-letter code, convert it
    else if (REVERSE_DAY_MAPPING[day]) {
      console.log(`Converting day from ${day} to ${REVERSE_DAY_MAPPING[day]}`);
      day = REVERSE_DAY_MAPPING[day];
    }
    // If neither, log an error but try to continue
    else {
      console.error(`Unknown day format: ${day}, attempting to find a match`);
      // Try to match day by ignoring case
      const dayLower = day.toLowerCase();
      for (const [code, fullDay] of Object.entries(REVERSE_DAY_MAPPING)) {
        if (code.toLowerCase() === dayLower || fullDay.toLowerCase() === dayLower) {
          day = fullDay;
          console.log(`Found match: ${day}`);
          break;
        }
      }
    }
    
    // Ensure start_time and end_time are properly formatted before creating timeSlot
    const ensureTimeFormat = (time: string): string => {
      if (!time) return '';
      
      // Handle seconds if present
      const withoutSeconds = time.replace(/(\d{2}):(\d{2}):(\d{2})/g, '$1:$2');
      
      // Add leading zero if needed
      const parts = withoutSeconds.split(':');
      if (parts[0] && parts[0].length === 1) {
        return `0${withoutSeconds}`;
      }
      
      return withoutSeconds;
    };
    
    const formattedStartTime = ensureTimeFormat(entry.start_time);
    const formattedEndTime = ensureTimeFormat(entry.end_time);
    
    console.log(`Formatted times: ${formattedStartTime} - ${formattedEndTime}`);
    
    const timeSlot = createTimeSlot(formattedStartTime, formattedEndTime);
    
    const result: ScheduleCell = {
      id: entry.id,
      day,
      timeSlot,
      status: 'class',
      course: entry.description || ''
    };
    
    console.log('Converted to UI cell:', result);
    return result;
  };
  
  // Convert UI cell to API entry
  const uiToApiEntry = (cell: ScheduleCell): Omit<WeeklyScheduleEntry, 'id' | 'day_display'> => {
    const { start_time, end_time } = parseTimeSlot(cell.timeSlot);
    return {
      day: DAY_MAPPING[cell.day],
      start_time,
      end_time,
      description: cell.course || ''
    };
  };
  
  // Load schedule data
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Check if user is authenticated
      if (!user) {
        console.error('Trying to fetch schedule without authenticated user');
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching schedule data for user:', user.email);
      const data = await scheduleService.getMySchedule();
      
      console.log('Schedule data received:', data);
      
      // Convert API data to UI format
      const uiSchedule = data.map(apiToUiEntry);
      
      console.log('Converted to UI schedule:', uiSchedule);
      setSchedule(uiSchedule);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      
      // Log more detailed error information
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('API Error Response:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        setError(`Server error: ${err.response.status} - ${err.response.data?.detail || err.response.statusText || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request error:', err.message);
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Refetch data when user auth state changes or component mounts
  useEffect(() => {
    if (user) {
      fetchSchedule();
      fetchCourseOptions(); // Fetch options when user is available
    } else {
      // If no user, clear the schedule and options
      setSchedule([]);
      setCourseOptions([]);
    }
  }, [fetchSchedule, user]); // Removed fetchCourseOptions from here to avoid multiple calls initially
  
  // The previous effect only with refreshTrigger
  useEffect(() => {
    if (user && refreshTrigger > 0) {
      fetchSchedule();
    }
  }, [fetchSchedule, refreshTrigger, user]);
  
  // Function to trigger a refresh
  const refreshSchedule = () => {
    console.log('Manual refresh triggered');
    // Clear any existing schedule data
    setSchedule([]);
    // Slight delay before fetching to ensure clean state
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 100);
  };
  
  const fetchCourseOptions = async () => {
    if (!user || user.role !== 'TA') return; // Only TAs need course options
    setLoadingOptions(true);
    try {
      const options = await scheduleService.getCourseOptions();
      setCourseOptions(options);
    } catch (err) {
      console.error("Failed to fetch course options", err);
      setError("Could not load course options for schedule.");
      setCourseOptions([]); // Set to empty array on error
    } finally {
      setLoadingOptions(false);
    }
  };
  
  const handleCellClick = async (day: string, timeSlot: string) => {
    // Ensure options are loaded before opening dialog
    if (courseOptions.length === 0 && user && user.role === 'TA') {
      await fetchCourseOptions(); // Fetch if not already loaded
    }

    const existingCell = schedule.find(item => 
      item.day === day && isSameTime(item.timeSlot, timeSlot)
    );
    
    const currentCellData = existingCell || { day, timeSlot, status: 'class', course: '' };
    setSelectedCell(currentCellData);
    
    if (currentCellData.course) {
      const currentDesc = currentCellData.course;
      // Check if currentDesc is one of the standard system courses or "Non-academic"
      if (courseOptions.includes(currentDesc)) {
        setSelectedCourseOption(currentDesc);
        setManualCourseName('');
      } else { 
        // If not a direct match, assume it was an "Other Course" entry or an old free-text entry
        setSelectedCourseOption("Other Course");
        setManualCourseName(currentDesc); // Pre-fill manual field with existing description
      }
    } else {
      setSelectedCourseOption(''); 
      setManualCourseName('');
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCell(null);
    setSelectedCourseOption('');
    setManualCourseName('');
    // Refresh the schedule data to ensure UI is in sync with server
    setTimeout(() => {
      refreshSchedule();
    }, 100);
  };
  
  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
    setError(null);
  };
  
  const handleRemoveClass = async () => {
    if (!selectedCell || !selectedCell.id) return;
    
    try {
      setLoading(true);
      await scheduleService.deleteScheduleEntry(selectedCell.id);
      
      // Update local state
      const newSchedule = schedule.filter(
        cell => cell.id !== selectedCell.id
      );
      setSchedule(newSchedule);
      setSuccessMessage('Class hour removed successfully');
      
      // Refresh the data
      refreshSchedule();
    } catch (err: any) {
      console.error('Error removing class hour:', err);
      setError(err.response?.data?.detail || 'Failed to remove class hour');
    } finally {
      setLoading(false);
      handleCloseDialog();
    }
  };
  
  const handleSaveClass = async () => {
    if (!selectedCell) return;
    
    let descriptionForApi = '';
    if (selectedCourseOption === "Other Course") {
      descriptionForApi = manualCourseName.trim() || "Other Course";
    } else {
      descriptionForApi = selectedCourseOption;
    }

    if (!descriptionForApi) { 
        setError("Please select an activity/course or provide details for 'Other Course'.");
        return;
    }

    try {
      setLoading(true);
      
      const updatedCell = {
        ...selectedCell,
        course: descriptionForApi, // 'course' in UI cell maps to 'description' for API
      };
      
      const apiData = uiToApiEntry(updatedCell);
      
      let responseData: WeeklyScheduleEntry;
      
      if (updatedCell.id) {
        // Update existing entry
        responseData = await scheduleService.updateScheduleEntry(updatedCell.id, apiData);
        console.log('Updated entry response:', responseData);
        
        // Update local state immediately
        const updatedUIEntry = apiToUiEntry(responseData);
        setSchedule(prevSchedule => 
          prevSchedule.map(cell => cell.id === updatedCell.id ? updatedUIEntry : cell)
        );
        setSuccessMessage('Class hour updated successfully');
      } else {
        // Create new entry
        responseData = await scheduleService.createScheduleEntry(apiData);
        console.log('New entry created response:', responseData);
        
        // Create UI representation of the new entry
        const newUIEntry = apiToUiEntry(responseData);
        console.log('New UI entry created:', newUIEntry);
        
        // Add to local state - using functional update to avoid race conditions
        setSchedule(prevSchedule => {
          // Check if we already have this time slot (sometimes happens with async updates)
          const existingEntryIndex = prevSchedule.findIndex(
            entry => entry.day === newUIEntry.day && isSameTime(entry.timeSlot, newUIEntry.timeSlot)
          );
          
          if (existingEntryIndex >= 0) {
            // Replace existing entry
            return prevSchedule.map((entry, index) => 
              index === existingEntryIndex ? newUIEntry : entry
            );
          } else {
            // Add new entry
            return [...prevSchedule, newUIEntry];
          }
        });
        
        setSuccessMessage('Class hour added successfully');
      }
      
      // Force a complete refresh after closing the dialog to ensure UI is in sync with server
      setTimeout(() => {
        console.log('Executing delayed refresh');
        fetchSchedule();
      }, 500); // Increased timeout to ensure API has time to process
      
    } catch (err: any) {
      console.error('Error saving class hour:', err);
      setError(err.response?.data?.detail || 'Failed to save class hour');
    } finally {
      setLoading(false);
      handleCloseDialog();
    }
  };
  
  // Time comparison function that handles formats with slight differences
  const isSameTime = (time1: string, time2: string): boolean => {
    // If either is undefined or null, they can't be the same
    if (!time1 || !time2) {
      return false;
    }
    
    console.log(`Comparing times: "${time1}" vs "${time2}"`);
    
    // Clean up any extra spaces
    const cleanTime1 = time1.replace(/\s+/g, ' ').trim();
    const cleanTime2 = time2.replace(/\s+/g, ' ').trim();
    
    // Check exact match after cleanup
    if (cleanTime1 === cleanTime2) {
      console.log(`Exact match after cleanup: ${cleanTime1}`);
      return true;
    }
    
    // Remove seconds from times (if present)
    const removeSeconds = (timeStr: string) => {
      return timeStr.replace(/(\d{2}):(\d{2}):(\d{2})/g, '$1:$2');
    };
    
    const normalizedTime1 = removeSeconds(cleanTime1);
    const normalizedTime2 = removeSeconds(cleanTime2);
    
    if (normalizedTime1 === normalizedTime2) {
      console.log(`Match after removing seconds: ${normalizedTime1}`);
      return true;
    }
    
    // If times still don't exactly match, try to parse them
    try {
      // Parse the time ranges
      const [startTime1, endTime1] = normalizedTime1.split('-').map(t => t.trim());
      const [startTime2, endTime2] = normalizedTime2.split('-').map(t => t.trim());
      
      // Compare the parts individually
      const startMatch = startTime1 === startTime2;
      const endMatch = endTime1 === endTime2;
      
      console.log(`Start times: "${startTime1}" vs "${startTime2}" - Match: ${startMatch}`);
      console.log(`End times: "${endTime1}" vs "${endTime2}" - Match: ${endMatch}`);
      
      // Consider as same if both start and end times match
      if (startMatch && endMatch) {
        return true;
      }
      
      // Try additional normalization - sometimes hours are formatted differently (8:30 vs 08:30)
      const normalizeHour = (timeStr: string) => {
        // If it starts with a single digit, add a leading zero
        const parts = timeStr.split(':');
        if (parts[0].length === 1) {
          return `0${timeStr}`;
        }
        return timeStr;
      };
      
      const fullNormalizedStart1 = normalizeHour(startTime1);
      const fullNormalizedStart2 = normalizeHour(startTime2);
      const fullNormalizedEnd1 = normalizeHour(endTime1);
      const fullNormalizedEnd2 = normalizeHour(endTime2);
      
      console.log(`Fully normalized start times: "${fullNormalizedStart1}" vs "${fullNormalizedStart2}"`);
      console.log(`Fully normalized end times: "${fullNormalizedEnd1}" vs "${fullNormalizedEnd2}"`);
      
      return fullNormalizedStart1 === fullNormalizedStart2 && fullNormalizedEnd1 === fullNormalizedEnd2;
    } catch (e) {
      console.error('Error comparing times:', e);
      return false;
    }
  };
  
  const getStatusForCell = (day: string, timeSlot: string) => {
    // Find matching entry with improved logging
    const matchingEntries = schedule.filter(cell => 
      cell.day === day && (cell.timeSlot === timeSlot || isSameTime(cell.timeSlot, timeSlot))
    );
    
    if (matchingEntries.length > 0) {
      // Log the match found for debugging
      console.log(`Found ${matchingEntries.length} matches for ${day} ${timeSlot}:`, matchingEntries);
      return matchingEntries[0].status;
    }
    
    return '';
  };
  
  const getCourseForCell = (day: string, timeSlot: string) => {
    // Use the same improved matching logic as in getStatusForCell
    const matchingEntries = schedule.filter(cell => 
      cell.day === day && (cell.timeSlot === timeSlot || isSameTime(cell.timeSlot, timeSlot))
    );
    
    if (matchingEntries.length > 0) {
      return matchingEntries[0].course || '';
    }
    
    return '';
  };
  
  // API connection test
  const testApiConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Test authentication status first
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found in local storage');
        return;
      }
      
      // Report the user's authentication info first
      console.log('Current user data:', user);
      
      // Log token info
      console.log('Token from localStorage:', token.substring(0, 15) + '...');
      
      // Check if token is expired
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const expDate = new Date(tokenData.exp * 1000);
        console.log('Token expiration:', expDate.toLocaleString());
        
        if (expDate < new Date()) {
          setError('Authentication token is expired. Please log in again.');
          return;
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
      
      // Try to get user profile first (simpler endpoint)
      console.log('Testing user profile endpoint...');
      const profileResponse = await scheduleService.testApiConnection();
      console.log('User profile response:', profileResponse);
      
      // Then try schedule endpoint
      console.log('Testing schedule endpoint...');
      const scheduleData = await scheduleService.getMySchedule();
      console.log('Schedule data:', scheduleData);
      
      // Show success message
      setSuccessMessage('API connection test successful! See console for details.');
    } catch (err: any) {
      console.error('API test failed:', err);
      
      if (err.response) {
        setError(`API test failed: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        setError('API test failed: No response received from server');
      } else {
        setError(`API test failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4" gutterBottom sx={{ mb: 0, fontWeight: 'bold' }}>
            My Class Schedule
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={refreshSchedule}
            variant="outlined"
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Manage your weekly class schedule here. These hours will be marked as unavailable for proctoring assignments.
        </Typography>
      </Box>
      
      <Box sx={{ position: 'relative' }}>
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 1 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              variant="outlined"
            >
              {error}
            </Alert>
          )}
          
          {loading && !error ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '120px' }}></TableCell>
                      {DAYS_OF_WEEK.map(day => (
                        <TableCell key={day} align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          {day}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {TIME_SLOTS.map(timeSlot => (
                      <TableRow key={timeSlot} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 500, color: 'text.secondary' }}>
                          {timeSlot}
                        </TableCell>
                        {DAYS_OF_WEEK.map(day => {
                          const status = getStatusForCell(day, timeSlot);
                          const course = getCourseForCell(day, timeSlot);
                          return (
                            <TableCell 
                              key={`${day}-${timeSlot}`} 
                              align="center"
                              onClick={() => handleCellClick(day, timeSlot)}
                              sx={{ 
                                cursor: 'pointer',
                                position: 'relative',
                                height: '70px',
                                width: '140px',
                                padding: '8px',
                                backgroundColor: status === 'class' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                '&:hover': {
                                  backgroundColor: status === 'class' 
                                    ? 'rgba(25, 118, 210, 0.15)' 
                                    : 'rgba(0, 0, 0, 0.04)',
                                },
                                borderRadius: '4px',
                                transition: 'background-color 0.2s ease'
                              }}
                            >
                              {status === 'class' && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  height: '100%',
                                  justifyContent: 'center',
                                  alignItems: 'center'
                                }}>
                                  <Chip 
                                    label={CLASS_HOURS_STATUS.label}
                                    color={CLASS_HOURS_STATUS.color as any}
                                    size="small"
                                    sx={{ mb: 1, fontSize: '0.7rem' }}
                                  />
                                  {course && (
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                      {course}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Stack direction="row" spacing={2} sx={{ mt: 4, backgroundColor: '#f8f9fa', p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={CLASS_HOURS_STATUS.label} 
                    color={CLASS_HOURS_STATUS.color as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Times when you have classes and are not available for proctoring
                  </Typography>
                </Box>
              </Stack>
              
              <Typography variant="body2" sx={{ mt: 3, fontStyle: 'italic', color: 'text.secondary' }}>
                Click on any cell to mark it as a class hour and specify which course you have.
              </Typography>
            </>
          )}
        </Paper>
      </Box>
      
      {/* Class Hour Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        disableEscapeKeyDown={loading || loadingOptions} // Disable escape if loading options too
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            width: '400px',
            maxWidth: '90vw'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          pt: 2.5,
          fontWeight: 'bold',
          borderBottom: '1px solid #f0f0f0'
        }}>
          {selectedCell && schedule.some(c => c.day === selectedCell.day && c.timeSlot === selectedCell.timeSlot && c.id)
            ? 'Edit Class Hour'
            : 'Add Class Hour'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {selectedCell && (
            <>
              <DialogContentText sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary', mr: 1 }}>
                  {selectedCell.day},
                </Box>
                <Box component="span" sx={{ color: 'text.primary' }}>
                  {selectedCell.timeSlot}
                </Box>
              </DialogContentText>
              
              {loadingOptions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress size={24} />
                  <Typography sx={{ ml: 1 }}>Loading options...</Typography>
                </Box>
              ) : (
                <FormControl fullWidth margin="dense" disabled={loading}>
                  <InputLabel id="course-option-select-label">Activity/Course</InputLabel>
                  <Select
                    labelId="course-option-select-label"
                    value={selectedCourseOption}
                    label="Activity/Course"
                    onChange={(e) => {
                      const value = e.target.value as string;
                      setSelectedCourseOption(value);
                      if (value !== "Other Course") {
                        setManualCourseName(''); 
                      }
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select an option</em>
                    </MenuItem>
                    {courseOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                  {!selectedCourseOption && (
                     <FormHelperText error>Please select an activity or course.</FormHelperText>
                  )}
                </FormControl>
              )}

              {selectedCourseOption === "Other Course" && !loadingOptions && (
                <TextField
                  autoFocus // Autofocus if "Other Course" is selected and manual field appears
                  margin="dense"
                  id="manual-course"
                  label="Course Name/Code (Optional)"
                  fullWidth
                  variant="outlined"
                  value={manualCourseName}
                  onChange={(e) => setManualCourseName(e.target.value)}
                  placeholder="e.g. CS500, Special Topic"
                  helperText="If selecting 'Other Course', you can specify the name here."
                  disabled={loading || loadingOptions}
                  sx={{ mt: 2 }}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f0f0f0' }}>
          {selectedCell && selectedCell.id && (
            <Button 
              onClick={handleRemoveClass} 
              color="error"
              disabled={loading}
              variant="outlined"
              startIcon={(loading) ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Removing...' : 'Remove'}
            </Button>
          )}
          <Box sx={{ flex: '1 1 auto' }} />
          <Button 
            onClick={handleCloseDialog} 
            disabled={loading}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveClass} 
            color="primary" 
            variant="contained"
            disabled={
              loading || 
              loadingOptions || 
              !selectedCourseOption ||
              (selectedCourseOption === "Other Course" && !manualCourseName.trim() && !courseOptions.includes("Other Course")) // Allow saving "Other Course" itself if manual is empty
            }
            startIcon={(loading || loadingOptions) ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {(loading || loadingOptions) ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success message */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Schedule; 
