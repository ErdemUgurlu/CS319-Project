import React, { useState, useEffect, useCallback } from 'react';
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
  FormHelperText,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  DialogActions,
  ListItemButton,
  ListItemIcon as MuiListItemIcon,
  DialogContentText
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon, 
  Done as DoneIcon, 
  AssignmentTurnedIn as AssignmentTurnedInIcon, 
  Upload as UploadIcon, 
  CloudUpload as CloudUploadIcon,
  AssignmentInd as AssignProctorsIcon,
  RateReview as RateReviewIcon,
  MonetizationOn as MonetizationOnIcon // Potentially for paid assignments
} from '@mui/icons-material';
import { Exam, ExamType, ExamForm, ExamStatus, AssignPlacesForm, SetProctorsForm, Classroom } from '../../interfaces/exam';
import { Course } from '../../interfaces/course';
import examService from '../../services/examService';
import courseService from '../../services/courseService'; // Added import for courseService
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import DragDropFileUpload from '../common/DragDropFileUpload';
import proctoringService, { EligibleProctor, AutoAssignProctorsPayload } from '../../services/proctoringService';

interface ExamListProps {
  exams: Exam[];
  courses: Course[];
  isReadOnly: boolean;
  onDataChange: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  initialTab?: ExamStatus | 'ALL' | string;
  departmentFilter?: string;
}

// Define a local interface for department summaries
interface DepartmentSummary {
  id: number;
  code: string;
  name: string;
}

const ExamList: React.FC<ExamListProps> = ({
  exams,
  courses,
  isReadOnly,
  onDataChange,
  showNotification,
  initialTab = 'ALL',
  departmentFilter
}) => {
  const { authState } = useAuth();
  const userId = authState.user?.user_id;
  const isStaff = authState.user?.role === 'STAFF' || authState.user?.role === 'ADMIN';
  const isInstructor = authState.user?.role === 'INSTRUCTOR';
  const isDeanOffice = authState.user?.role === 'DEAN_OFFICE';
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState<ExamForm>({
    course_id: 0,
    type: ExamType.MIDTERM,
    date: new Date().toISOString(),
    time: format(new Date(), 'HH:mm'),
    duration: 90
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [currentTab, setCurrentTab] = useState<ExamStatus | 'ALL' | string>(initialTab);
  const [assignPlacesDialog, setAssignPlacesDialog] = useState(false);
  const [examToAssignPlaces, setExamToAssignPlaces] = useState<Exam | null>(null);
  const [assignPlacesForm, setAssignPlacesForm] = useState<AssignPlacesForm>({ classroom_id: null });
  const [setProctorlDialog, setSetProctorlDialog] = useState(false);
  const [examToSetProctors, setExamToSetProctors] = useState<Exam | null>(null);
  const [proctorForm, setProctorForm] = useState<SetProctorsForm>({ proctor_count: 1 });
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [uploadStudentListDialog, setUploadStudentListDialog] = useState(false);
  const [examToUploadStudentList, setExamToUploadStudentList] = useState<Exam | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importPlacesDialog, setImportPlacesDialog] = useState(false);
  const [examToImportPlaces, setExamToImportPlaces] = useState<Exam | null>(null);
  
  // --- NEW STATE for Assign Proctors Dialog ---
  const [assignProctorsDialogOpen, setAssignProctorsDialogOpen] = useState(false);
  const [examToAssignProctors, setExamToAssignProctors] = useState<Exam | null>(null);
  const [eligibleTAs, setEligibleTAs] = useState<EligibleProctor[]>([]);
  const [selectedProctorIds, setSelectedProctorIds] = useState<number[]>([]);
  const [loadingEligibleTAs, setLoadingEligibleTAs] = useState(false);
  const [isPaidAssignment, setIsPaidAssignment] = useState(false);
  const [replaceExistingProctors, setReplaceExistingProctors] = useState(false);
  const [isAutoSuggestPhase, setIsAutoSuggestPhase] = useState(false);
  const [insufficientTAsDialogOpen, setInsufficientTAsDialogOpen] = useState(false);
  
  // --- NEW STATE for Manage Cross-Department Request Dialog ---
  const [manageCrossDeptRequestDialogOpen, setManageCrossDeptRequestDialogOpen] = useState(false);
  const [examForManagingCrossDeptRequest, setExamForManagingCrossDeptRequest] = useState<Exam | null>(null);
  const [selectedCrossDeptApprovalDepts, setSelectedCrossDeptApprovalDepts] = useState<string[]>([]);
  const [trueAllSystemDepartments, setTrueAllSystemDepartments] = useState<DepartmentSummary[]>([]); // New state for all departments
  
  // --- NEW STATE for Override Rule Checkboxes (Restored for InsufficientTAsDialog functionality) ---
  const [overrideAcademicLevelRule, setOverrideAcademicLevelRule] = useState(true); 
  const [overrideConsecutiveProctoringRule, setOverrideConsecutiveProctoringRule] = useState(true); 
  // --- END NEW STATE ---
  
  // --- NEW FUNCTION to fetch eligible TAs with override options (Restored for InsufficientTAsDialog) ---
  const fetchAndSetEligibleTAs = useCallback(async (examId: number, doOverrideAcademic: boolean, doOverrideConsecutive: boolean) => {
    if (!examId) return;
    setLoadingEligibleTAs(true);
    try {
      const tas = await proctoringService.getEligibleProctorsForExam(examId, {
        overrideAcademicLevel: doOverrideAcademic,
        overrideConsecutiveProctoring: doOverrideConsecutive,
      });

      const sortedTAsForDisplay = [...tas].sort((a, b) => {
        const aIsTeaching = a.is_teaching_course_sections || false;
        const bIsTeaching = b.is_teaching_course_sections || false;
        if (aIsTeaching && !bIsTeaching) return -1;
        if (!aIsTeaching && bIsTeaching) return 1;
        return (a.current_workload ?? Infinity) - (b.current_workload ?? Infinity);
      });
      
      setEligibleTAs(sortedTAsForDisplay);

      const currentlyAssignedIds = sortedTAsForDisplay
        .filter(ta => ta.is_assigned_to_current_exam)
        .map(ta => ta.id);
      setSelectedProctorIds(currentlyAssignedIds);

    } catch (err: any) {
      console.error("Error fetching eligible TAs with overrides:", err);
      showNotification("Failed to load available TAs with new overrides", "error");
      setEligibleTAs([]); 
    } finally {
      setLoadingEligibleTAs(false);
    }
  }, [setLoadingEligibleTAs, showNotification, setEligibleTAs, setSelectedProctorIds]);
  // --- END NEW FUNCTION ---

  // Derive all unique departments from the courses prop
  const allSystemDepartments = React.useMemo(() => {
    const depts = new Map<string, DepartmentSummary>();
    courses.forEach(course => {
      if (course.department && !depts.has(course.department.code)) {
        depts.set(course.department.code, {
          id: course.department.id, 
          code: course.department.code,
          name: course.department.name 
        });
      }
    });
    return Array.from(depts.values());
  }, [courses]);

  useEffect(() => {
    const fetchAllDepartments = async () => {
      try {
        const response = await courseService.getAllDepartments();
        // Assuming response.data is the array of departments
        if (response && response.data && Array.isArray(response.data)) {
          setTrueAllSystemDepartments(response.data.map((d: any) => ({ id: d.id, code: d.code, name: d.name })));
        } else if (response && Array.isArray(response)) { // Handle if API returns array directly
           setTrueAllSystemDepartments(response.map((d: any) => ({ id: d.id, code: d.code, name: d.name })));
        }
         else {
          console.error('Failed to fetch or parse departments for cross-department modal. Response:', response);
          setTrueAllSystemDepartments([]);
        }
      } catch (error) {
        console.error('Error fetching all departments for cross-department modal:', error);
        showNotification('Could not load full department list for cross-department requests', 'error');
        setTrueAllSystemDepartments([]);
      }
    };
    fetchAllDepartments();
  }, [showNotification]); // showNotification is a stable function from props, but good to include if its identity could change

  useEffect(() => {
    console.log('ExamList mounted with initialTab:', initialTab);
    console.log('Current Tab value set to:', currentTab);
    if (isDeanOffice) {
      fetchClassrooms();
    }
    console.log('Available tabs:', {
      ALL: 'ALL',
      WAITING_FOR_PLACES: ExamStatus.WAITING_FOR_PLACES,
      WAITING_FOR_CROSS_DEPARTMENT_APPROVAL: ExamStatus.WAITING_FOR_CROSS_DEPARTMENT_APPROVAL,
      WAITING_FOR_STUDENT_LIST: ExamStatus.WAITING_FOR_STUDENT_LIST,
      AWAITING_PROCTORS: ExamStatus.AWAITING_PROCTORS,
      READY: ExamStatus.READY
    });
  }, [currentTab, isDeanOffice]);
  
  // Fetch classrooms from API
  const fetchClassrooms = async () => {
    try {
      const response = await examService.getClassrooms();
      console.log('Classroom API response:', response);
      
      // Check different possible data structures
      if (response && response.data && Array.isArray(response.data)) {
        // Standard case - response.data is an array
        setClassrooms(response.data);
      } else if (response && Array.isArray(response)) {
        // Case where response itself is the array
        setClassrooms(response);
      } else if (response && response.data && response.data.results && Array.isArray(response.data.results)) {
        // Case where response.data.results is the array (DRF common pattern)
        setClassrooms(response.data.results);
      } else if (response && response.results && Array.isArray(response.results)) {
        // Case where response.results is the array
        setClassrooms(response.results);
      } else {
        console.error('Invalid classrooms data format:', response);
        // If we can't determine the format, log both the response and try to examine its properties
        console.log('Response properties:', Object.keys(response || {}));
        if (response && response.data) {
          console.log('Response.data properties:', Object.keys(response.data || {}));
        }
        
        // Ensure classrooms is always an array
        setClassrooms([]); 
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      setClassrooms([]); // Set empty array on error
      showNotification('Failed to load classrooms', 'error');
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: ExamStatus | 'ALL' | string) => {
    console.log('Tab changed to:', newValue, 'from:', currentTab);
    setCurrentTab(newValue);

    // If Dean's Office selects "Waiting for Places", refresh data to ensure they see all such exams
    if (isDeanOffice && (newValue === ExamStatus.WAITING_FOR_PLACES || newValue === "WAITING_FOR_PLACES")) {
      console.log('Dean Office selected Waiting for Places tab, refreshing data');
      onDataChange();
    }
  };

  // Filter exams based on current tab
  const filteredExams = exams.filter(exam => {
    console.log('Filtering exam:', exam, 'currentTab:', currentTab, 'isDeanOffice:', isDeanOffice);
    
    // If Dean's Office, hide exams with WAITING_FOR_STUDENT_LIST status entirely
    if (isDeanOffice && exam.status === ExamStatus.WAITING_FOR_STUDENT_LIST) {
      console.log('Hiding WAITING_FOR_STUDENT_LIST exam from Dean Office:', exam);
      return false;
    }
    
    // Always show "Waiting for Places" exams to Dean's Office regardless of tab
    // unless they're specifically filtering by another status
    if (isDeanOffice && 
        (exam.status === ExamStatus.WAITING_FOR_PLACES || !exam.status) && 
        currentTab === 'ALL') {
      console.log('Showing exam to Dean Office (all tab):', exam);
      return true;
    }
    
    if (currentTab === 'ALL') {
      console.log('Showing exam (all tab):', exam);
      return true;
    }
    
    // Handle case where backend hasn't implemented status field yet
    if (!exam.status) {
      // For Dean's Office view, treat undefined status as "Waiting for Places"
      if (isDeanOffice && (currentTab === ExamStatus.WAITING_FOR_PLACES || currentTab === "WAITING_FOR_PLACES")) {
        console.log('Showing undefined status exam to Dean Office:', exam);
        return true;
      }
      console.log('Hiding undefined status exam:', exam);
      return false;
    }
    
    console.log('Checking exam status:', exam.status, '===', currentTab, exam.status === currentTab);
    
    // Handle string vs enum comparison for WAITING_FOR_PLACES
    if ((currentTab === "WAITING_FOR_PLACES" || currentTab === ExamStatus.WAITING_FOR_PLACES) && 
        exam.status === ExamStatus.WAITING_FOR_PLACES) {
      return true;
    }
    
    return exam.status === currentTab;
  });

  // Handle opening exam dialog
  const handleOpenDialog = (exam?: Exam) => {
    if (exam) {
      // Edit existing exam
      setEditingExam(exam);
      setFormData({
        course_id: exam.course.id,
        type: exam.type as ExamType,
        date: exam.date,
        time: exam.time || format(new Date(exam.date), 'HH:mm'),
        duration: exam.duration || 90
      });
    } else {
      // Create new exam
      setEditingExam(null);
      setFormData({
        course_id: 0,
        type: ExamType.MIDTERM,
        date: new Date().toISOString(),
        time: format(new Date(), 'HH:mm'),
        duration: 90
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  // Handle closing dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingExam(null);
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const { name, value } = e.target;
    
    // Handle numeric values
    if (name === 'duration') {
      const numValue = parseInt(value as string) || 0;
      setFormData({
        ...formData,
        duration: numValue
      });
      // Validate numeric fields
      if (numValue < 0) {
        setFormErrors({...formErrors, [name]: `${name.replace('_', ' ')} must be 0 or greater`});
      } else {
        const newErrors = {...formErrors};
        delete newErrors[name];
        setFormErrors(newErrors);
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData({
        ...formData,
        date: date.toISOString()
      });
    }
  };

  // Handle time change
  const handleTimeChange = (time: Date | null) => {
    if (time) {
      setFormData({
        ...formData,
        time: format(time, 'HH:mm')
      });
    }
  };

  // Validate form
  const validateForm = (isUpdate: boolean = false) => {
    const errors: Record<string, string> = {};
    
    if (formData.course_id === 0) {
      errors.course_id = 'Please select a course';
    }
    
    if (formData.duration <= 0) {
      errors.duration = 'Duration must be greater than 0';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(!!editingExam)) return;

    setLoading(true);

    // Ensure date and time are correctly formatted and combined
    const selectedDate = new Date(formData.date); // formData.date should be a valid date string or Date object
    const [hours, minutes] = formData.time.split(':').map(Number);
    selectedDate.setHours(hours, minutes, 0, 0); // Set hours and minutes, reset seconds and milliseconds

    const examDataToSubmit = {
      ...formData,
      course_id: Number(formData.course_id), // Ensure course_id is a number
      date: selectedDate.toISOString(), // Combine date and time into a single ISO string
      duration: Number(formData.duration) || 0,
    };
    
    // Remove the separate 'time' field as it's now part of 'date'
    delete (examDataToSubmit as any).time;


    try {
      if (editingExam) {
        // Update existing exam
        // Ensure student_list_file is not sent if it's not being updated
        // The backend expects either a File object or null/undefined, not a string path.
        const { student_list_file, ...restOfData } = examDataToSubmit;
        
        let payload: any = restOfData;
        if (student_list_file instanceof File) {
            payload = new FormData();
            Object.keys(restOfData).forEach(key => {
                payload.append(key, (restOfData as any)[key]);
            });
            payload.append('student_list_file', student_list_file);
        } else {
            // If student_list_file is not a File, don't include it or ensure it's handled as null by backend
            // For update, typically we don't resend the file unless it's changed.
            // If your backend expects 'null' to clear it, handle that. Otherwise, omitting it is safer.
        }
        
        // If not sending as FormData, ensure payload is the plain object
        if (!(payload instanceof FormData)) {
            payload = restOfData;
        }

        await examService.updateExam(editingExam.id, payload);
        showNotification('Exam updated successfully', 'success');
      } else {
        // Create new exam
        // Similar FormData handling if student_list_file can be added on creation
        const { student_list_file, ...restOfData } = examDataToSubmit;
        let payload: any = restOfData;

        if (student_list_file instanceof File) {
            payload = new FormData();
            Object.keys(restOfData).forEach(key => {
                 payload.append(key, (restOfData as any)[key]);
            });
            payload.append('student_list_file', student_list_file);
        } else {
             payload = restOfData;
        }
        await examService.createExam(payload);
        showNotification('Exam created successfully', 'success');
      }
      onDataChange();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      if (error.response && error.response.data) {
        // Check if the error response has a 'detail' field (common for DRF)
        if (typeof error.response.data.detail === 'string') {
          setFormErrors({ form: error.response.data.detail });
          showNotification(error.response.data.detail, 'error');
        } else {
          // If the error is an object (field errors), set them
          setFormErrors(error.response.data);
          showNotification('Error submitting exam. Please check the form for errors.', 'error');
        }
      } else {
        setFormErrors({ form: 'An unexpected error occurred.' });
        showNotification('An unexpected error occurred.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle opening delete confirmation dialog
  const handleConfirmDelete = (exam: Exam) => {
    setExamToDelete(exam);
    setDeleteDialogOpen(true);
  };

  // Handle delete exam
  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    
    try {
      setLoading(true);
      await examService.deleteExam(examToDelete.id);
      showNotification(`${examToDelete.type_display} exam deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      setExamToDelete(null);
      onDataChange();
    } catch (error: any) {
      console.error('Error deleting exam:', error);
      showNotification(error.response?.data?.detail || 'Failed to delete exam', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check if a user can edit or delete a specific exam
  const canEditExam = (exam: Exam): boolean => {
    if (isStaff) return true;
    
    // Instructors can only edit/delete exams for their courses
    if (isInstructor) {
      // Logic to check if course belongs to the instructor will be handled by the backend
      return true; // The backend will restrict access appropriately
    }
    
    return false;
  };

  // Check if a user can assign places to an exam
  const canAssignPlaces = (exam: Exam): boolean => {
    // Always allow Dean's Office to assign places if status field isn't implemented
    // or if it's in WAITING_FOR_PLACES status
    if (isDeanOffice) {
      return !exam.status || exam.status === ExamStatus.WAITING_FOR_PLACES;
    }
    
    return false; // Only Dean's Office can assign places
  };

  // Check if a user can set proctor count
  const canSetProctors = (exam: Exam): boolean => {
    if (!exam.status) {
      // If status field isn't implemented yet, allow it for Staff or Instructors
      return isStaff || isInstructor;
    }
    // return (isStaff || isInstructor) && exam.status === ExamStatus.AWAITING_PROCTORS;
    return (isStaff || isInstructor) && 
           (exam.status === ExamStatus.AWAITING_PROCTORS || exam.status === ExamStatus.AWAITING_CROSS_DEPARTMENT_PROCTOR);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get exam type display name
  const getExamTypeDisplay = (type: ExamType): string => {
    switch (type) {
      case ExamType.MIDTERM: return 'Midterm';
      case ExamType.FINAL: return 'Final';
      case ExamType.QUIZ: return 'Quiz';
      default: return type;
    }
  };

  // Get status display name
  const getStatusDisplay = (status: ExamStatus): string => {
    switch (status) {
      case ExamStatus.WAITING_FOR_STUDENT_LIST: return 'Waiting for Student List';
      case ExamStatus.WAITING_FOR_PLACES: return 'Waiting for Places';
      case ExamStatus.AWAITING_PROCTORS: return 'Awaiting Proctors';
      case ExamStatus.READY: return 'Ready';
      default: return status;
    }
  };

  // Sort exams by date
  const sortedExams = filteredExams.sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Handle opening assign places dialog
  const handleOpenAssignPlaces = (exam: Exam) => {
    setExamToAssignPlaces(exam);
    setAssignPlacesForm({ classroom_id: exam.classroom ? exam.classroom.id : null });
    
    // Check if student list has been uploaded
    if (!exam.has_student_list) {
      showNotification('Please upload a student list before assigning classrooms', 'info');
      // Open the upload dialog instead
      handleOpenUploadStudentList(exam);
      return;
    }
    
    setAssignPlacesDialog(true);
    
    // Ensure classrooms data is loaded
    if (isDeanOffice && (!classrooms || !Array.isArray(classrooms) || classrooms.length === 0)) {
      fetchClassrooms();
    }
  };

  // Handle closing assign places dialog
  const handleCloseAssignPlaces = () => {
    setAssignPlacesDialog(false);
    setExamToAssignPlaces(null);
    setAssignPlacesForm({ classroom_id: null }); // Reset form
  };

  // Handle change in assign places form
  const handleAssignPlacesChange = (e: SelectChangeEvent<number | string>) => {
    setAssignPlacesForm({
      classroom_id: e.target.value === '' ? null : Number(e.target.value)
    });
  };

  // Submit assign places form
  const handleAssignPlacesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examToAssignPlaces) return;

    try {
      setLoading(true);
      const payload: AssignPlacesForm = { classroom_id: assignPlacesForm.classroom_id };
      await examService.assignPlaces(examToAssignPlaces.id, payload);
      showNotification('Classroom assigned successfully', 'success');
      handleCloseAssignPlaces();
      onDataChange();
    } catch (error: any) {
      console.error('Error assigning places:', error);
      showNotification(error.response?.data?.detail || 'Failed to assign places', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening set proctors dialog
  const handleOpenSetProctors = (exam: Exam) => {
    setExamToSetProctors(exam);
    setProctorForm({ proctor_count: exam.proctor_count || 1 });
    setSetProctorlDialog(true);
  };

  // Handle closing set proctors dialog
  const handleCloseSetProctors = () => {
    setSetProctorlDialog(false);
    setExamToSetProctors(null);
  };

  // Handle change in set proctors form
  const handleProctorFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setProctorForm({ proctor_count: value });
  };

  // Submit set proctors form
  const handleSetProctorsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examToSetProctors) return;

    try {
      setLoading(true);
      await examService.setProctors(examToSetProctors.id, proctorForm);
      showNotification('Proctor count set successfully', 'success');
      handleCloseSetProctors();
      onDataChange();
    } catch (error: any) {
      console.error('Error setting proctors:', error);
      showNotification(error.response?.data?.detail || 'Failed to set proctor count', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening student list upload dialog
  const handleOpenUploadStudentList = (exam: Exam) => {
    setExamToUploadStudentList(exam);
    setSelectedFile(null);
    setUploadError(null);
    setUploadStudentListDialog(true);
  };

  // Handle closing student list upload dialog
  const handleCloseUploadStudentList = () => {
    setUploadStudentListDialog(false);
    setExamToUploadStudentList(null);
    setSelectedFile(null);
    setUploadError(null);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if file is an Excel file
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        setUploadError('Please select an Excel (.xlsx, .xls) or CSV file');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  // Submit student list upload
  const handleUploadStudentList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examToUploadStudentList || !selectedFile) return;

    try {
      setLoading(true);
      await examService.uploadStudentList(examToUploadStudentList.id, selectedFile);
      showNotification('Student list uploaded successfully', 'success');
      handleCloseUploadStudentList();
      onDataChange();
    } catch (error: any) {
      console.error('Error uploading student list:', error);
      setUploadError(error.response?.data?.detail || 'Failed to upload student list');
      showNotification(error.response?.data?.detail || 'Failed to upload student list', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check if a user can upload a student list
  const canUploadStudentList = (exam: Exam): boolean => {
    // Staff and instructors can always upload student lists
    return isStaff || isInstructor;
  };

  // Handle opening import places dialog
  const handleOpenImportPlacesForExam = (exam: Exam) => {
    setExamToImportPlaces(exam);
    setImportPlacesDialog(true);
  };

  // --- NEW HANDLERS for Assign Proctors Dialog ---
  const handleOpenAssignProctorsDialog = async (exam: Exam, isPaidFlow: boolean = false) => {
    setExamToAssignProctors(exam);
    setIsPaidAssignment(isPaidFlow); // Set based on the flow
    setAssignProctorsDialogOpen(true);
    // Reset selections when dialog opens
    setSelectedProctorIds([]);
    // Fetch eligible TAs with default override values (false, false)
    if (exam) {
      await fetchAndSetEligibleTAs(exam.id, false, false); 
    }
  };

  const handleCloseAssignProctorsDialog = () => {
    setAssignProctorsDialogOpen(false);
    setExamToAssignProctors(null);
    setEligibleTAs([]);
    setSelectedProctorIds([]);
    setIsAutoSuggestPhase(false);
  };

  const handleToggleProctorSelection = (taId: number) => {
    setSelectedProctorIds((prevSelected) =>
      prevSelected.includes(taId)
        ? prevSelected.filter((id) => id !== taId)
        : [...prevSelected, taId]
    );
  };

  const handleAssignProctorsSubmit = async () => {
    if (!examToAssignProctors) return;

    setLoading(true);
    try {
      await proctoringService.assignProctorsToExam(examToAssignProctors.id, {
        assignment_type: 'MANUAL',
        manual_proctors: selectedProctorIds,
        replace_existing: true,
        is_paid: isPaidAssignment
      });
      showNotification('Proctors assigned successfully!', 'success');
      handleCloseAssignProctorsDialog();
      onDataChange();
    } catch (error: any) {
      console.error('Error assigning proctors:', error);
      showNotification(error.response?.data?.error || 'Failed to assign proctors', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- MODIFIED HANDLER for Auto Assign Proctors Button ---
  const handleAutoAssignButtonClick = async () => {
    if (!examToAssignProctors) return;

    if (!isAutoSuggestPhase) {
      // --- Phase 1: Suggest TAs ---
      const requiredProctorCount = examToAssignProctors.proctor_count ?? 0;
      
      // Check if eligibleTAs are fewer than required
      if (requiredProctorCount > 0 && eligibleTAs.length < requiredProctorCount) {
        setInsufficientTAsDialogOpen(true); // Open the new dialog
        return; // Stop further processing for this click
      }

      if (requiredProctorCount === 0 || eligibleTAs.length === 0) {
        showNotification("Cannot auto-suggest: Required proctor count is 0 or no eligible TAs available at all.", "info");
        return;
      }

      // Prioritization for Auto-Suggestion:
      // 1. TAs already assigned to this exam (is_assigned_to_current_exam === true).
      // 2. TAs teaching sections of the exam's course (is_teaching_course_sections === true) AND not already assigned to this exam.
      // 3. Other TAs.
      // All groups sorted by lowest current_workload.

      const alreadyAssignedToThisExamTAs = eligibleTAs
        .filter(ta => ta.is_assigned_to_current_exam)
        .sort((a, b) => (a.current_workload ?? Infinity) - (b.current_workload ?? Infinity));

      const courseTAsNotYetAssigned = eligibleTAs
        .filter(ta => ta.is_teaching_course_sections && !ta.is_assigned_to_current_exam)
        .sort((a, b) => (a.current_workload ?? Infinity) - (b.current_workload ?? Infinity));
        
      const otherRemainingTAs = eligibleTAs
        .filter(ta => !ta.is_assigned_to_current_exam && !ta.is_teaching_course_sections)
        .sort((a, b) => (a.current_workload ?? Infinity) - (b.current_workload ?? Infinity));
      
      const sortedEligibleTAsForSuggestion = [
        ...alreadyAssignedToThisExamTAs,
        ...courseTAsNotYetAssigned,
        ...otherRemainingTAs
      ];

      const suggestedIds = sortedEligibleTAsForSuggestion
        .slice(0, requiredProctorCount)
        .map(ta => ta.id);
      
      setSelectedProctorIds(suggestedIds);
      setIsAutoSuggestPhase(true);
      // Update notification to be more precise if fewer TAs than required are suggested
      // This can happen if filtering within the suggestion logic reduces the count further,
      // though the main pop-up handles the initial eligibleTA.length < requiredProctorCount.
      if (suggestedIds.length < requiredProctorCount && requiredProctorCount > 0) {
        showNotification(`Only ${suggestedIds.length} out of ${requiredProctorCount} required proctors could be suggested. Please review and confirm.`, "info");
      } else {
        showNotification(`Suggested ${suggestedIds.length} proctors. Review and click "Confirm Auto Assignment".`, "info");
      }

    } else {
      // --- Phase 2: Confirm and Submit Suggested Assignment ---
      if (selectedProctorIds.length === 0 && (examToAssignProctors.proctor_count ?? 0) > 0) {
        showNotification("Please select at least one proctor or ensure suggestions were made.", "info");
        return;
      }
      
      setLoading(true);
      try {
        const payload: AutoAssignProctorsPayload = { 
          assignment_type: 'AUTOMATIC',
          proctor_ids: selectedProctorIds, // Send the currently selected (user approved/modified) IDs
          replace_existing: replaceExistingProctors,
          is_paid: isPaidAssignment
        };
        
        await proctoringService.autoAssignProctorsToExam(examToAssignProctors.id, payload);
        
        showNotification('Proctors auto-assigned successfully!', 'success');
        handleCloseAssignProctorsDialog(); // This will reset isAutoSuggestPhase
        onDataChange(); // Refresh data
      } catch (error: any) {
        console.error('Error auto-assigning proctors:', error);
        showNotification(error.response?.data?.error || 'Failed to auto-assign proctors', 'error');
      } finally {
        setLoading(false);
      }
    }
  };
  // --- END MODIFIED HANDLER ---

  const handleAssignFoundEligibleTAs = async () => {
    if (!examToAssignProctors) {
      showNotification("No exam selected for assigning TAs.", "info");
      handleCloseInsufficientTAsDialog();
      return;
    }

    if (eligibleTAs.length === 0) {
      showNotification("No eligible TAs were found to assign.", "info");
      handleCloseInsufficientTAsDialog(); // Close the dialog as there's nothing to assign
      return;
    }

    setLoading(true);
    try {
      const proctorIdsToAssign = eligibleTAs.map(ta => ta.id);

      await proctoringService.assignProctorsToExam(examToAssignProctors.id, {
        assignment_type: 'MANUAL', 
        manual_proctors: proctorIdsToAssign,
        replace_existing: true, // Replace existing proctors with this set
        is_paid: isPaidAssignment // Respect the current state of the "paid" checkbox
      });

      showNotification(
        `${proctorIdsToAssign.length} proctor(s) assigned successfully from the available list.`,
        'success'
      );
      handleCloseInsufficientTAsDialog(); // Close this dialog
      handleCloseAssignProctorsDialog();  // Close the main assign proctors dialog
      onDataChange(); // Refresh exam list data
    } catch (error: any) {
      console.error('Error assigning found TAs:', error);
      showNotification(error.response?.data?.error || 'Failed to assign found TAs', 'error');
      // Dialogs remain open on error for user to choose another option or cancel
    } finally {
      setLoading(false);
    }
  };

  const examTypeOptions = [
    { value: ExamType.MIDTERM, label: 'Midterm' },
    { value: ExamType.QUIZ, label: 'Quiz' },
  ];
  if (isStaff || isDeanOffice) { // isStaff includes ADMIN
    examTypeOptions.push({ value: ExamType.FINAL, label: 'Final' });
  }

  const handleCloseInsufficientTAsDialog = () => {
    setInsufficientTAsDialogOpen(false);
  };

  // --- RESTORED HANDLER for Requesting Cross-Departmental Proctors ---
  const handleRequestCrossDepartmentProctors = async () => {
    if (!examToAssignProctors) {
      showNotification("No exam selected for this action.", "error");
      return;
    }

    setLoading(true); 
    try {
      await examService.updateExam(examToAssignProctors.id, { 
        status: ExamStatus.WAITING_FOR_CROSS_DEPARTMENT_APPROVAL 
      });
      showNotification(
        `Request for cross-departmental proctors for ${examToAssignProctors.course.code} - ${examToAssignProctors.type_display} has been submitted. Status updated to Waiting for Approval.`,
        'success'
      );
      onDataChange(); 
      handleCloseInsufficientTAsDialog(); 
      
      // If Dean's Office initiated, switch them to the approval tab
      if (isDeanOffice) {
        setCurrentTab(ExamStatus.WAITING_FOR_CROSS_DEPARTMENT_APPROVAL);
      }
      // Also close the main assign proctors dialog if it was the source
       handleCloseAssignProctorsDialog(); 

    } catch (error: any) {
      console.error('Error requesting cross-departmental proctors:', error);
      showNotification(error.response?.data?.detail || 'Failed to submit request for cross-departmental proctors', 'error');
    } finally {
      setLoading(false);
    }
  };
  // --- END RESTORED HANDLER ---

  // --- NEW useEffect to refetch TAs when override rules change in InsufficientTAsDialog (Restored) ---
  useEffect(() => {
    if (insufficientTAsDialogOpen && examToAssignProctors) {
      fetchAndSetEligibleTAs(
        examToAssignProctors.id,
        !overrideAcademicLevelRule, // Pass true to override if checkbox is UNCHECKED (state is false)
        !overrideConsecutiveProctoringRule // Same logic here
      );
    }
  }, [
    overrideAcademicLevelRule,
    overrideConsecutiveProctoringRule,
    insufficientTAsDialogOpen,
    examToAssignProctors, 
    fetchAndSetEligibleTAs
  ]);
  // --- END NEW useEffect ---

  // --- Placeholder Handlers for New Manage Cross-Department Request Dialog ---
  const handleOpenManageCrossDeptRequestDialog = (exam: Exam) => {
    setExamForManagingCrossDeptRequest(exam);
    setSelectedCrossDeptApprovalDepts([]); // Reset selections
    setManageCrossDeptRequestDialogOpen(true);
  };

  const handleActualApproveCrossDepartmentRequest = async () => {
    if (!examForManagingCrossDeptRequest) {
      showNotification('No exam selected for approval.', 'error');
      return;
    }
    if (selectedCrossDeptApprovalDepts.length === 0) {
      showNotification('Please select at least one assisting department.', 'info');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        status: ExamStatus.AWAITING_CROSS_DEPARTMENT_PROCTOR, // Using the existing status
        cross_approved_department_codes: selectedCrossDeptApprovalDepts
      };
      await examService.updateExam(examForManagingCrossDeptRequest.id, payload);
      
      showNotification(
        `Cross-department request for ${examForManagingCrossDeptRequest.course.department.code}${examForManagingCrossDeptRequest.course.code} approved for department(s): ${selectedCrossDeptApprovalDepts.join(', ')}. Status updated.`,
        'success'
      );
      onDataChange(); // Refresh data
      setManageCrossDeptRequestDialogOpen(false); // Close dialog
    } catch (error: any) {
      console.error('Error approving cross-department request:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to approve cross-department request. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActualRejectCrossDepartmentRequest = async () => {
    if (!examForManagingCrossDeptRequest) {
      showNotification('No exam selected for rejection.', 'error');
      return;
    }

    setLoading(true);
    try {
      await examService.updateExam(examForManagingCrossDeptRequest.id, { 
        status: ExamStatus.AWAITING_PROCTORS 
      });
      showNotification(
        `Cross-department request for ${examForManagingCrossDeptRequest.course.department.code}${examForManagingCrossDeptRequest.course.code} - ${examForManagingCrossDeptRequest.type_display} rejected. Exam status has been updated to Awaiting Proctors.`,
        'success'
      );
      onDataChange(); // Refresh the main exam list data
      setManageCrossDeptRequestDialogOpen(false); // Close the current dialog
    } catch (error: any) {
      console.error('Error rejecting cross-department request:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to reject the cross-department request. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };
  // --- END Placeholder Handlers ---

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {isDeanOffice && currentTab === ExamStatus.WAITING_FOR_PLACES
            ? "Assign Classrooms to Exams"
            : "Exam Management"}
        </Typography>
        {(isStaff || isInstructor) && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Exam
          </Button>
        )}
      </Box>

      {/* Tabs for filtering by status */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Exams" value="ALL" />
          {isDeanOffice && (
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span>Waiting for Places</span>
                  <Chip 
                    label={exams.filter(e => e.status === ExamStatus.WAITING_FOR_PLACES).length} 
                    color="warning" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Box>
              } 
              value="WAITING_FOR_PLACES"
            />
          )}
          {isDeanOffice && (
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span>Cross-Dept. Approval</span>
                  <Chip 
                    label={exams.filter(e => e.status === ExamStatus.WAITING_FOR_CROSS_DEPARTMENT_APPROVAL).length} 
                    color="warning" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Box>
              } 
              value={ExamStatus.WAITING_FOR_CROSS_DEPARTMENT_APPROVAL} 
            />
          )}
          {!isDeanOffice && (
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span>Need Student List</span>
                  <Chip 
                    label={exams.filter(e => e.status === ExamStatus.WAITING_FOR_STUDENT_LIST).length} 
                    color="error" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Box>
              } 
              value={ExamStatus.WAITING_FOR_STUDENT_LIST} 
            />
          )}
          {(isStaff || isInstructor) && (
            <Tab label="Awaiting Proctors" value={ExamStatus.AWAITING_PROCTORS} />
          )}
          {/* New Tab for Awaiting Cross-Department Proctor Assignment (Visible to Staff/Admin) */}
          {(isStaff) && (
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span>Cross-Dept. Proctors</span>
                  <Chip 
                    label={exams.filter(e => e.status === ExamStatus.AWAITING_CROSS_DEPARTMENT_PROCTOR).length} 
                    color="info" // Or another color that makes sense
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Box>
              } 
              value={ExamStatus.AWAITING_CROSS_DEPARTMENT_PROCTOR} 
            />
          )}
          <Tab label="Ready" value={ExamStatus.READY} />
        </Tabs>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {sortedExams.length} {sortedExams.length === 1 ? 'Exam' : 'Exams'} found
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Students</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Classroom</TableCell>
              <TableCell>Proctors</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedExams.length > 0 ? (
              sortedExams.map((exam) => (
                <TableRow key={exam.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={exam.course.department.code} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ marginRight: 1, fontWeight: 'bold' }}
                      />
                      <Box>
                        <Typography variant="body1">
                          <strong>{exam.course.code}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {exam.course.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exam.course.level_display}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={exam.type_display} 
                      color={
                        exam.type === ExamType.MIDTERM ? 'primary' : 
                        exam.type === ExamType.FINAL ? 'error' : 
                        'success'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(exam.date)}</Typography>
                    <Typography variant="body2" color="text.secondary">{exam.time || format(new Date(exam.date), 'HH:mm')}</Typography>
                  </TableCell>
                  <TableCell>{exam.duration ? `${exam.duration} min` : 'N/A'}</TableCell>
                  <TableCell>
                    {exam.student_count !== undefined ? exam.student_count : 'Not Set'}
                    {!exam.has_student_list && (
                      <Typography variant="caption" color="error" display="block">
                        No student list
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {exam.status ? (
                      <Chip 
                        label={exam.status_display || getStatusDisplay(exam.status)} 
                        color={
                          exam.status === ExamStatus.WAITING_FOR_PLACES ? 'warning' : 
                          exam.status === ExamStatus.AWAITING_PROCTORS ? 'info' : 
                          'success'
                        }
                        size="small"
                      />
                    ) : (
                      <Chip 
                        label="Not Set" 
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {exam.classroom ? (
                      <Typography variant="body2">
                        {exam.classroom.building}-{exam.classroom.room_number}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Not Assigned</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {(exam.status === ExamStatus.AWAITING_PROCTORS || exam.status === ExamStatus.AWAITING_CROSS_DEPARTMENT_PROCTOR) ? 
                      `${exam.assigned_proctor_count ?? 0} / ${exam.proctor_count ?? 'N/A'}` 
                      : 
                      (exam.status === ExamStatus.READY ? `${exam.assigned_proctor_count ?? 0}` : (exam.proctor_count ?? '?'))
                    }
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {canEditExam(exam) && (
                      <Tooltip title="Edit Exam">
                        <IconButton onClick={() => handleOpenDialog(exam)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {canUploadStudentList(exam) && (
                      <Tooltip title="Upload Student List">
                        <IconButton onClick={() => handleOpenUploadStudentList(exam)} size="small">
                          <CloudUploadIcon fontSize="small" color={exam.has_student_list ? "success" : "warning"} />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {canAssignPlaces(exam) && (
                      <Tooltip title="Assign Places">
                        <IconButton onClick={() => handleOpenAssignPlaces(exam)} size="small">
                          <AssignmentTurnedInIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {isDeanOffice && exam.status === ExamStatus.WAITING_FOR_PLACES && (
                      <Tooltip title="Import Places from Excel">
                        <IconButton onClick={() => handleOpenImportPlacesForExam(exam)} size="small">
                          <UploadIcon fontSize="small" color="secondary" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* --- "Assign Proctors" Button --- */}
                    {isStaff && (exam.status === ExamStatus.AWAITING_PROCTORS || exam.status === ExamStatus.READY) && (
                      <Tooltip title="Assign Proctors"> 
                        <IconButton onClick={() => handleOpenAssignProctorsDialog(exam, false)} size="small">
                          <AssignProctorsIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* --- END Assign Proctors Button --- */}
                    
                    {canSetProctors(exam) && (
                      <Tooltip title="Set the number of proctors">
                        <IconButton onClick={() => handleOpenSetProctors(exam)} size="small">
                          <DoneIcon fontSize="small" color="success" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {canEditExam(exam) && (
                      <Tooltip title="Delete Exam">
                        <IconButton onClick={() => handleConfirmDelete(exam)} size="small">
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* --- NEW "Manage Cross-Department Request" Button for Dean's Office --- */}
                    {isDeanOffice && exam.status === ExamStatus.WAITING_FOR_CROSS_DEPARTMENT_APPROVAL && (
                      <Tooltip title="Manage Cross-Department Request">
                        <IconButton onClick={() => handleOpenManageCrossDeptRequestDialog(exam)} size="small">
                          <RateReviewIcon fontSize="small" color="info" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* --- END NEW Button --- */}

                    {/* --- NEW \"Assign Paid Cross-Department Proctor\" Button --- */}
                    {isStaff && exam.status === ExamStatus.AWAITING_CROSS_DEPARTMENT_PROCTOR && (
                      <Tooltip title="Assign Paid Cross-Department Proctor">
                        <IconButton onClick={() => handleOpenAssignProctorsDialog(exam, true)} size="small">
                          {/* Using AssignProctorsIcon with different color, or use MonetizationOnIcon if preferred */}
                          <AssignProctorsIcon fontSize="small" color="secondary" /> 
                          {/* <MonetizationOnIcon fontSize="small" color="success" /> */}
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* --- END NEW Assign Paid Cross-Department Proctor Button --- */}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No exams found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Exam Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingExam ? 'Edit Exam' : 'Add New Exam'}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth error={!!formErrors.course_id}>
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
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id.toString()}>
                    {course.department.code}{course.code} - {course.title}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.course_id && <FormHelperText>{formErrors.course_id}</FormHelperText>}
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="type-select-label">Exam Type</InputLabel>
              <Select
                labelId="type-select-label"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                label="Exam Type"
                required
              >
                {examTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={new Date(formData.date)}
                onChange={handleDateChange}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Box>

          <Box sx={{ mb: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Time"
                value={new Date(`2023-01-01T${formData.time}`)}
                onChange={handleTimeChange}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Duration (minutes)"
              name="duration"
              type="number"
              value={formData.duration}
              onChange={handleInputChange}
              required
              error={!!formErrors.duration}
              helperText={formErrors.duration}
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
              {loading ? <CircularProgress size={24} /> : editingExam ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Assign Places Dialog */}
      <Dialog open={assignPlacesDialog} onClose={handleCloseAssignPlaces} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleAssignPlacesSubmit} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Assign Classroom
          </Typography>
          
          {examToAssignPlaces && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {examToAssignPlaces.course.department.code}{examToAssignPlaces.course.code} - {examToAssignPlaces.type_display}
                </Typography>
                <Typography variant="body2">
                  Date: {formatDate(examToAssignPlaces.date)} at {examToAssignPlaces.time}
                </Typography>
                <Typography variant="body2">
                  Duration: {examToAssignPlaces.duration} minutes
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                  Students: {examToAssignPlaces.student_count}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="classroom-select-label">Assign Classroom</InputLabel>
                  <Select
                    labelId="classroom-select-label"
                    value={assignPlacesForm.classroom_id === null ? '' : assignPlacesForm.classroom_id}
                    onChange={handleAssignPlacesChange}
                    label="Assign Classroom"
                    renderValue={(selected) => {
                      if (selected === '' || selected === null) {
                        return <Typography color="text.secondary"><em>Select Classroom</em></Typography>;
                      }
                      const classroom = classrooms.find(c => c.id === selected);
                      return classroom ? `${classroom.building}-${classroom.room_number} (${classroom.capacity} capacity)` : '';
                    }}
                  >
                    <MenuItem value="">
                      <em>None (Unassign)</em>
                    </MenuItem>
                    {Array.isArray(classrooms) && classrooms.map((classroom) => (
                      <MenuItem key={classroom.id} value={classroom.id}>
                        {classroom.building}-{classroom.room_number} (Capacity: {classroom.capacity})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseAssignPlaces} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Assign Classroom'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Set Proctors Dialog */}
      <Dialog open={setProctorlDialog} onClose={handleCloseSetProctors} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSetProctorsSubmit} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Set Proctor Count
          </Typography>
          
          {examToSetProctors && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {examToSetProctors.course.department.code}{examToSetProctors.course.code} - {examToSetProctors.type_display}
                </Typography>
                <Typography variant="body2">
                  Date: {formatDate(examToSetProctors.date)} at {examToSetProctors.time}
                </Typography>
                <Typography variant="body2">
                  Students: {examToSetProctors.student_count}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Assigned Classrooms:</strong>
                </Typography>
                {examToSetProctors.classroom ? (
                  <Typography variant="body2">
                    {examToSetProctors.classroom.building}-{examToSetProctors.classroom.room_number} (Capacity: {examToSetProctors.classroom.capacity})
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No classroom assigned
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Proctor Count"
                  type="number"
                  value={proctorForm.proctor_count}
                  onChange={handleProctorFormChange}
                  required
                  helperText="Enter the number of proctors needed for this exam"
                />
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseSetProctors} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Set Proctor Count'}
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
            Are you sure you want to delete the {examToDelete?.type_display} exam for {examToDelete?.course.department.code}{examToDelete?.course.code}?
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteExam} 
              variant="contained" 
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Dialog for student list upload */}
      <Dialog open={uploadStudentListDialog} onClose={handleCloseUploadStudentList} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleUploadStudentList} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload Student List
          </Typography>
          
          {examToUploadStudentList && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {examToUploadStudentList.course.department.code}{examToUploadStudentList.course.code} - {examToUploadStudentList.type_display}
                </Typography>
                <Typography variant="body2">
                  Date: {formatDate(examToUploadStudentList.date)} at {examToUploadStudentList.time}
                </Typography>
                <Typography variant="body2">
                  Duration: {examToUploadStudentList.duration} minutes
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please upload an Excel file (.xlsx, .xls) or CSV file with student information. 
                  The file should include a column with student IDs.
                </Alert>
                
                {uploadError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {uploadError}
                  </Alert>
                )}
                
                <DragDropFileUpload
                  onFileSelect={(file) => setSelectedFile(file)}
                  acceptedFileTypes=".xlsx,.xls,.csv"
                  helperText="Accepted file types: Excel (.xlsx, .xls) or CSV"
                  label="Drop your student list file here, or click to select"
                  loading={loading}
                  error={uploadError}
                />
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseUploadStudentList} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading || !selectedFile}
            >
              {loading ? <CircularProgress size={24} /> : 'Upload Student List'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Import Places Dialog */}
      <Dialog open={importPlacesDialog} onClose={() => setImportPlacesDialog(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={(e) => {
          e.preventDefault();
          if (!selectedFile) {
            setUploadError("Please select a file to import");
            return;
          }
          
          const handleImport = async () => {
            try {
              setLoading(true);
              setUploadError(null);
              
              // Call the import method with the exam ID
              if (examToImportPlaces) {
                await examService.importExamPlacements(selectedFile, examToImportPlaces.id);
              } else {
                await examService.importExamPlacements(selectedFile);
              }
              
              showNotification('Classroom assignments imported successfully', 'success');
              setImportPlacesDialog(false);
              setExamToImportPlaces(null);
              onDataChange();
            } catch (err: any) {
              console.error('Error importing places:', err);
              setUploadError(err.response?.data?.detail || 'Failed to import places. Please check the file format.');
            } finally {
              setLoading(false);
            }
          };
          
          handleImport();
        }} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Import Places for {examToImportPlaces?.course.department.code}{examToImportPlaces?.course.code} {examToImportPlaces?.type_display}
          </Typography>
          
          {examToImportPlaces && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {examToImportPlaces.course.department.code}{examToImportPlaces.course.code} - {examToImportPlaces.type_display}
                </Typography>
                <Typography variant="body2">
                  Date: {formatDate(examToImportPlaces.date)} at {examToImportPlaces.time}
                </Typography>
                <Typography variant="body2">
                  Duration: {examToImportPlaces.duration} minutes
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                  Students: {examToImportPlaces.student_count || 'Not set'}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Upload an Excel file (.xlsx, .xls) with classroom assignments for this exam.
                    The file should include columns for:
                  </Typography>
                  <ul>
                    <li>Building - Building name/code</li>
                    <li>Room Number - Room number</li>
                    <li>Capacity - Room capacity</li>
                  </ul>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    You don't need to include the Exam ID as it will automatically be assigned to this exam.
                  </Typography>
                </Alert>
                
                <DragDropFileUpload
                  onFileSelect={(file) => {
                    setSelectedFile(file);
                    setUploadError(null);
                  }}
                  acceptedFileTypes=".xlsx,.xls"
                  helperText="Accepted file types: Excel (.xlsx, .xls)"
                  label="Drop your classroom assignments file here, or click to select"
                  loading={loading}
                  error={uploadError}
                />
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              onClick={() => {
                setImportPlacesDialog(false);
                setExamToImportPlaces(null);
                setSelectedFile(null);
                setUploadError(null);
              }} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading || !selectedFile}
            >
              {loading ? <CircularProgress size={24} /> : 'Import Places'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* --- Assign Proctors Dialog --- */}
      <Dialog open={assignProctorsDialogOpen} onClose={handleCloseAssignProctorsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Proctors to: {examToAssignProctors?.course.department.code}{examToAssignProctors?.course.code} - {examToAssignProctors?.type_display}
        </DialogTitle>
        <DialogContent dividers>
          {loadingEligibleTAs ? (
            <CircularProgress />
          ) : (
            <>
              <Typography variant="body1" gutterBottom>
                Date: {examToAssignProctors ? formatDate(examToAssignProctors.date) : ''} at {examToAssignProctors?.time}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Required Proctors: {examToAssignProctors?.proctor_count ?? 'N/A'}
              </Typography>
              {/* --- NEW "Automatic Assign" Button --- */}
              <Box sx={{ my: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAutoAssignButtonClick}
                  disabled={loading || !examToAssignProctors || loadingEligibleTAs} 
                  fullWidth 
                >
                  {loading && isAutoSuggestPhase ? <CircularProgress size={24} /> : 
                   isAutoSuggestPhase ? 'Confirm Auto Assignment' : 'Automatic Assign Proctors'}
                </Button>
                {isAutoSuggestPhase && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setSelectedProctorIds(
                        eligibleTAs
                          .filter(ta => ta.is_assigned_to_current_exam)
                          .map(ta => ta.id)
                      ); // Revert to only those already assigned or empty if none were.
                      setIsAutoSuggestPhase(false);
                      showNotification("Auto-suggestion cleared. Select manually or try again.", "info");
                    }}
                    disabled={loading}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Cancel Suggestion
                  </Button>
                )}
              </Box>
              {/* --- END NEW Button --- */}

              <Typography variant="subtitle1" sx={{ mt: isAutoSuggestPhase ? 1 : 2, mb: 1 }}>
                {isAutoSuggestPhase ? "Review Suggested TAs (or select manually):" : "Available TAs for Manual Assignment:"}
              </Typography>
              {eligibleTAs.length === 0 && <Typography sx={{mb: 1, color: "text.secondary"}}>No TAs currently eligible for this exam or all are already assigned.</Typography>}
              {eligibleTAs.map((ta) => {
                const labelId = `checkbox-list-label-${ta.id}`;
                return (
                  <ListItem
                    key={ta.id}
                    secondaryAction={
                      <Chip 
                        label={`Current Workload: ${ta.current_workload}`}
                        size="small"
                        color={ta.current_workload && ta.current_workload >= 2 ? 'error' : 'default'}
                      />
                    }
                    disablePadding
                  >
                    <ListItemButton role={undefined} onClick={() => handleToggleProctorSelection(ta.id)} dense>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedProctorIds.indexOf(ta.id) !== -1}
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ 'aria-labelledby': labelId }}
                          color={ta.is_assigned_to_current_exam ? "primary" : "primary"}
                        />
                      </ListItemIcon>
                      <ListItemText 
                          id={labelId} 
                          primary={`${ta.full_name} (${ta.email})`} 
                          secondary={`Academic Level: ${ta.academic_level}`}
                          sx={{ 
                              color: ta.is_assigned_to_current_exam ? 'primary.main' : 'inherit',
                              fontWeight: ta.is_assigned_to_current_exam ? 'bold' : 'normal'
                          }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              <FormControlLabel
                control={<Checkbox checked={isPaidAssignment} onChange={(e) => setIsPaidAssignment(e.target.checked)} name="isPaidAssignment" />}
                label="Mark selected assignments as paid"
                sx={{ mt: 2, display: 'block' }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignProctorsDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={handleAssignProctorsSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Assign Proctors'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- End Assign Proctors Dialog --- */}

      {/* --- NEW Manage Cross-Department Request Dialog --- */}
      <Dialog open={manageCrossDeptRequestDialogOpen} onClose={() => setManageCrossDeptRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Cross-Department Proctor Request</DialogTitle>
        <DialogContent dividers>
          {examForManagingCrossDeptRequest && (
            <>
              <Typography variant="subtitle1">
                Exam: {examForManagingCrossDeptRequest.course.department.code}{examForManagingCrossDeptRequest.course.code} - {examForManagingCrossDeptRequest.type_display}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Date: {formatDate(examForManagingCrossDeptRequest.date)} at {examForManagingCrossDeptRequest.time}
              </Typography>
              
              {/* --- DEBUGGING CONSOLE LOGS --- */}
              <script>
                {`
                  console.log('Dialog Open: examForManagingCrossDeptRequest department code:', ${JSON.stringify(examForManagingCrossDeptRequest?.course?.department?.code)});
                  console.log('Dialog Open: allSystemDepartments:', ${JSON.stringify(trueAllSystemDepartments)});
                `}
              </script>
              {/* --- END DEBUGGING CONSOLE LOGS --- */}

              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Select assisting department(s):
                </Typography>
                {examForManagingCrossDeptRequest && trueAllSystemDepartments.filter(dept => dept.code !== examForManagingCrossDeptRequest.course.department.code).length === 0 && (
                  <Typography color="text.secondary">No other departments available to select.</Typography>
                )}
                {examForManagingCrossDeptRequest && trueAllSystemDepartments
                  .filter(dept => dept.code !== examForManagingCrossDeptRequest.course.department.code)
                  .map(dept => (
                    <FormControlLabel
                      key={dept.code}
                      control={
                        <Checkbox
                          checked={selectedCrossDeptApprovalDepts.includes(dept.code)}
                          onChange={(e) => {
                            const deptCode = dept.code;
                            setSelectedCrossDeptApprovalDepts(prev => 
                              e.target.checked 
                                ? [...prev, deptCode] 
                                : prev.filter(d => d !== deptCode)
                            );
                          }}
                          name={dept.code}
                        />
                      }
                      label={`${dept.name} (${dept.code})`}
                    />
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageCrossDeptRequestDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleActualRejectCrossDepartmentRequest} 
            color="error" 
            variant="outlined" 
            disabled={loading || !examForManagingCrossDeptRequest}
          >
            Reject Request
          </Button>
          <Button 
            onClick={handleActualApproveCrossDepartmentRequest} 
            color="primary" 
            variant="contained" 
            disabled={loading || !examForManagingCrossDeptRequest || selectedCrossDeptApprovalDepts.length === 0}
          >
            Approve with Selected
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- END NEW Dialog --- */}

      {/* Dialog for Insufficient TAs */}
      <Dialog
        open={insufficientTAsDialogOpen}
        onClose={handleCloseInsufficientTAsDialog}
        aria-labelledby="insufficient-tas-dialog-title"
        aria-describedby="insufficient-tas-dialog-description"
      >
        <DialogTitle id="insufficient-tas-dialog-title">
          Insufficient TAs for Automatic Assignment
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="insufficient-tas-dialog-description">
            The system could not find enough available Teaching Assistants (TAs) to meet the required number of proctors for this exam.
            Required: {examToAssignProctors?.proctor_count ?? 'N/A'}, Available: {eligibleTAs.length}.
            <br /><br />
            You can still assign proctors manually from the available list, or adjust the number of required proctors for the exam and try again.
          </DialogContentText>
          {/* --- NEW OVERRIDE CHECKBOXES --- */}
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Override Options:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={overrideAcademicLevelRule}
                  onChange={(e) => setOverrideAcademicLevelRule(e.target.checked)}
                  name="overrideAcademicLevel"
                />
              }
              label="Override academic level rule for TAs"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={overrideConsecutiveProctoringRule}
                  onChange={(e) => setOverrideConsecutiveProctoringRule(e.target.checked)}
                  name="overrideConsecutiveProctoring"
                />
              }
              label="Override no proctoring one day before/after rule for TAs"
            />
          </Box>
          {/* --- END NEW OVERRIDE CHECKBOXES --- */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignFoundEligibleTAs} color="primary">
            Assign Found TAs
          </Button>
          <Button onClick={handleCloseInsufficientTAsDialog} color="primary">
            Close / Apply Overrides
          </Button>
          <Button onClick={handleRequestCrossDepartmentProctors} color="primary" disabled={loading}>
            Request Cross-Departmental Proctors
          </Button>
          <Button onClick={handleCloseInsufficientTAsDialog} color="secondary" autoFocus>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamList; 