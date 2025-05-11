import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  TablePagination,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Define the User type
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  role_display: string;
  department: string;
  academic_level: string;
  employment_type: string;
  is_approved: boolean;
  email_verified: boolean;
  date_joined: string;
}

// Define role color mapping
const getRoleColor = (role: string) => {
  const roleColors: Record<string, string> = {
    TA: 'primary',
    INSTRUCTOR: 'secondary',
    STAFF: 'success',
    DEAN_OFFICE: 'info',
    ADMIN: 'error'
  };
  return (roleColors[role] || 'default') as "primary" | "secondary" | "success" | "info" | "error" | "warning" | "default";
};

const ApproveUsers: React.FC = () => {
  const { authState } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [processedUsers, setProcessedUsers] = useState<{ [key: number]: boolean }>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<string>('false'); // Default to showing unapproved users

  // State for Import Instructors
  const [openInstructorImportDialog, setOpenInstructorImportDialog] = useState<boolean>(false);
  const [selectedInstructorFile, setSelectedInstructorFile] = useState<File | null>(null);
  const [instructorImportSummary, setInstructorImportSummary] = useState<string | null>(null);
  const [instructorImportErrors, setInstructorImportErrors] = useState<string[]>([]);
  const [importedInstructorDetails, setImportedInstructorDetails] = useState<Array<{ email: string; name: string; bilkent_id: string; temporary_password: string }> | null>(null);
  const [instructorImportLoading, setInstructorImportLoading] = useState<boolean>(false);

  // NEW: State for Import TAs (directly on this page)
  const [openTaImportDialog, setOpenTaImportDialog] = useState<boolean>(false);
  const [selectedTaFile, setSelectedTaFile] = useState<File | null>(null);
  const [taImportSummary, setTaImportSummary] = useState<string | null>(null);
  const [taImportErrors, setTaImportErrors] = useState<string[]>([]);
  const [importedTaDetails, setImportedTaDetails] = useState<Array<{ email: string; name: string; bilkent_id: string; temporary_password: string }> | null>(null);
  const [taImportLoading, setTaImportLoading] = useState<boolean>(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [roleFilter, approvalStatus]);

  // Function to fetch users from the API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construct filter query parameters
      let params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      params.append('is_approved', approvalStatus);

      const response = await api.get(`/accounts/users/?${params.toString()}`);
      setUsers(response.data.results || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Function to approve a user
  const approveUser = async (userId: number) => {
    try {
      setProcessedUsers(prev => ({ ...prev, [userId]: true }));
      await api.post(`/accounts/users/${userId}/approve/`);
      
      // Remove the approved user from the list or mark them as approved
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, is_approved: true } : user
      ));

      // If filtering by unapproved users, remove the approved user from the list
      if (approvalStatus === 'false') {
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      }
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.response?.data?.error || 'Failed to approve user');
    } finally {
      setProcessedUsers(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filter for paginated display
  const displayedUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleInstructorFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedInstructorFile(event.target.files[0]);
      setInstructorImportErrors([]); // Clear previous errors
      setInstructorImportSummary(null);
    }
  };

  const handleApiCallImportInstructors = async () => {
    if (!selectedInstructorFile) {
      setInstructorImportErrors(['Please select a file.']);
      return;
    }
    setInstructorImportLoading(true);
    setInstructorImportErrors([]);
    setInstructorImportSummary(null);
    setImportedInstructorDetails(null);

    const formData = new FormData();
    formData.append('file', selectedInstructorFile);

    try {
      const response = await api.post('/accounts/import-instructors/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setInstructorImportSummary(response.data.summary || 'Instructors imported successfully.');
      if (response.data.imported_instructors && response.data.imported_instructors.length > 0) {
        setImportedInstructorDetails(response.data.imported_instructors);
      }
      if (response.data.errors && response.data.errors.length > 0) {
        setInstructorImportErrors(response.data.errors.map((err: {row: number; errors: string[], data: any}) => `Row ${err.row}: ${err.errors.join(', ')} (${JSON.stringify(err.data)})`));
        // If there's no overall summary, but there are errors, provide a generic error summary
        if (!response.data.summary) {
            setInstructorImportSummary("Instructor import completed with some errors.");
        }
      }
      fetchUsers(); // Refresh user list
    } catch (err: any) {
      console.error('Error importing instructors:', err);
      const errorData = err.response?.data;
      if (errorData) {
        if (errorData.errors && Array.isArray(errorData.errors)) {
          setInstructorImportErrors(errorData.errors.map((e: any) => typeof e === 'string' ? e : `Row ${e.row}: ${e.errors.join(', ')}`));
        } else if (errorData.detail) {
          setInstructorImportErrors([errorData.detail]);
        } else if (errorData.message) {
          setInstructorImportErrors([errorData.message]);
        } else {
          setInstructorImportErrors(['An unknown error occurred during import.']);
        }
      } else {
        setInstructorImportErrors(['Failed to import instructors. Check network or contact support.']);
      }
    } finally {
      setInstructorImportLoading(false);
      setOpenInstructorImportDialog(false); // Close dialog after attempting import
      setSelectedInstructorFile(null); // Clear selected file
    }
  };

  // NEW: Handlers for TA Import Dialog
  const handleTaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedTaFile(event.target.files[0]);
      setTaImportErrors([]);
      setTaImportSummary(null);
      setImportedTaDetails(null); // Clear previous TA import details
    }
  };

  const handleApiCallImportTAs = async () => {
    if (!selectedTaFile) {
      setTaImportErrors(['Please select a file.']);
      return;
    }
    setTaImportLoading(true);
    setTaImportErrors([]);
    setTaImportSummary(null);
    setImportedTaDetails(null);

    const formData = new FormData();
    formData.append('file', selectedTaFile);

    try {
      const response = await api.post('/accounts/import-tas/', formData, { // Endpoint for TA import
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTaImportSummary(response.data.summary || response.data.message || 'TAs imported successfully.');
      if (response.data.imported_tas && response.data.imported_tas.length > 0) {
        setImportedTaDetails(response.data.imported_tas);
      }
      if (response.data.errors && response.data.errors.length > 0) {
        setTaImportErrors(response.data.errors.map((err: {row: number; errors: string[], data: any}) => `Row ${err.row}: ${err.errors.join(', ')} (${JSON.stringify(err.data)})`));
        if (!response.data.summary && !response.data.message) {
            setTaImportSummary("TA import completed with some errors.");
        }
      }
      fetchUsers(); // Refresh user list
    } catch (err: any) {
      console.error('Error importing TAs:', err);
      const errorData = err.response?.data;
      if (errorData) {
        if (errorData.errors && Array.isArray(errorData.errors)) {
          setTaImportErrors(errorData.errors.map((e: any) => typeof e === 'string' ? e : `Row ${e.row}: ${e.errors.join(', ')}`));
        } else if (errorData.detail) {
          setTaImportErrors([errorData.detail]);
        } else if (errorData.error && typeof errorData.error === 'string') { // Handle cases where error is a string under 'error' key
            setTaImportErrors([errorData.error]);
        } else if (errorData.message) {
          setTaImportErrors([errorData.message]);
        } else {
          setTaImportErrors(['An unknown error occurred during TA import.']);
        }
      } else {
        setTaImportErrors(['Failed to import TAs. Check network or contact support.']);
      }
    } finally {
      setTaImportLoading(false);
      setOpenTaImportDialog(false);
      setSelectedTaFile(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Import/Approval Panel
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        {authState.user?.role === 'ADMIN' 
          ? 'As an admin, you can approve users from all departments.'
          : `You can approve users from the CS department or import TA's or instructors from an Excel file.`}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          select
          label="Role Filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="TA">Teaching Assistant</MenuItem>
          <MenuItem value="INSTRUCTOR">Instructor</MenuItem>
          <MenuItem value="STAFF">Staff</MenuItem>
          <MenuItem value="DEAN_OFFICE">Dean Office</MenuItem>
        </TextField>
        
        <TextField
          select
          label="Approval Status"
          value={approvalStatus}
          onChange={(e) => setApprovalStatus(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="false">Pending Approval</MenuItem>
          <MenuItem value="true">Approved</MenuItem>
        </TextField>
        
        <Button
          variant="outlined"
          onClick={fetchUsers}
          sx={{ ml: 1 }}
        >
          Refresh
        </Button>

        {/* MODIFIED: Import TAs Button - Opens dialog */}
        {(authState.user?.role === 'STAFF' || authState.user?.role === 'ADMIN') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<ManageAccountsIcon />}
            onClick={() => setOpenTaImportDialog(true)} // Changed to open dialog
            sx={{ ml: 1 }}
          >
            Import TA's
          </Button>
        )}

        {/* NEW: Import Instructors Button - Visible only to STAFF/ADMIN */}
        {(authState.user?.role === 'STAFF' || authState.user?.role === 'ADMIN') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<GroupAddIcon />}
            onClick={() => setOpenInstructorImportDialog(true)}
            sx={{ ml: 1 }}
          >
            Import Instructors
          </Button>
        )}
      </Box>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography variant="body1" color="text.secondary">
                {approvalStatus === 'false' 
                  ? 'No users waiting for approval.' 
                  : 'No approved users found.'}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Registration Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role_display} 
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{formatDate(user.date_joined)}</TableCell>
                    <TableCell>
                      {user.is_approved ? (
                        <Chip label="Approved" color="success" size="small" />
                      ) : (
                        <Chip label="Pending Approval" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {!user.is_approved && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => approveUser(user.id)}
                          disabled={!!processedUsers[user.id]}
                        >
                          {processedUsers[user.id] ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </Paper>

      {/* Dialog for Importing Instructors */}
      <Dialog open={openInstructorImportDialog} onClose={() => {setOpenInstructorImportDialog(false); setSelectedInstructorFile(null); setInstructorImportErrors([]); setInstructorImportSummary(null);}} fullWidth maxWidth="sm">
        <DialogTitle>Import Instructors from Excel</DialogTitle>
        <DialogContent>
          <input
            accept=".xlsx, .xls" // Accept both xls and xlsx
            style={{ display: 'none' }}
            id="instructor-import-file-button"
            type="file"
            onChange={handleInstructorFileChange}
          />
          <label htmlFor="instructor-import-file-button">
            <Button variant="outlined" component="span" startIcon={<UploadFileIcon />} sx={{ mb: 1 }}>
              Choose Excel File
            </Button>
          </label>
          {selectedInstructorFile && <Typography variant="body2" sx={{ mb: 1 }}>Selected: {selectedInstructorFile.name}</Typography>}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">Headers (case-insensitive, exact order):</Typography>
            <ul>
              <li>Name</li>
              <li>Surname</li>
              <li>Bilkent ID</li>
              <li>Phone Number</li>
              <li>Email</li>
              <li>Department</li>
            </ul>
          </Alert>
          
          {/* Displaying errors or summary within the dialog if needed, or rely on Snackbar */}
          {instructorImportErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 1, mb:1, maxHeight: '150px', overflowY: 'auto' }}>
              <AlertTitle>Import Errors</AlertTitle>
              {instructorImportErrors.map((err, index) => (
                <Typography variant="caption" display="block" key={index}>- {err}</Typography>
              ))}
            </Alert>
          )}
           {instructorImportSummary && !instructorImportErrors.length && ( // Show summary only if no errors, to avoid double messaging before snackbar
            <Alert severity="success" sx={{mt:1, mb:1}}>
                {instructorImportSummary}
            </Alert>
           )}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => {setOpenInstructorImportDialog(false); setSelectedInstructorFile(null); setInstructorImportErrors([]); setInstructorImportSummary(null);}}>Cancel</Button>
          <Button 
            onClick={handleApiCallImportInstructors} 
            color="primary" 
            variant="contained"
            disabled={!selectedInstructorFile || instructorImportLoading}
          >
            {instructorImportLoading ? <CircularProgress size={24} /> : 'Upload & Process'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEW: Dialog for Importing TAs */}
      <Dialog open={openTaImportDialog} onClose={() => {setOpenTaImportDialog(false); setSelectedTaFile(null); setTaImportErrors([]); setTaImportSummary(null); setImportedTaDetails(null);}} fullWidth maxWidth="md">
        <DialogTitle>Import Teaching Assistants from Excel</DialogTitle>
        <DialogContent>
          <input
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            id="ta-import-file-button"
            type="file"
            onChange={handleTaFileChange}
          />
          <label htmlFor="ta-import-file-button">
            <Button variant="outlined" component="span" startIcon={<UploadFileIcon />} sx={{ mb: 1 }}>
              Choose Excel File
            </Button>
          </label>
          {selectedTaFile && <Typography variant="body2" sx={{ mb: 1 }}>Selected: {selectedTaFile.name}</Typography>}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Required Headers (case-insensitive, exact order preferred):</Typography>
            <ul>
              <li>Name</li>
              <li>Surname</li>
              <li>Email</li>
              <li>Bilkent ID</li>
              <li>IBAN</li>
              <li>Phone Number</li>
              <li>Employment Type (P/F)</li>
              <li>Academic Level (PhD/Masters)</li>
              <li>Undergraduate University</li>
              <li>Workload Number</li>
            </ul>
          </Alert>
          
          {taImportErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 1, mb:1, maxHeight: '150px', overflowY: 'auto' }}>
              <AlertTitle>TA Import Errors</AlertTitle>
              {taImportErrors.map((err, index) => (
                <Typography variant="caption" display="block" key={index}>- {err}</Typography>
              ))}
            </Alert>
          )}
           {taImportSummary && !taImportErrors.length && (
            <Alert severity="success" sx={{mt:1, mb:1}}>
                {taImportSummary}
            </Alert>
           )}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => {setOpenTaImportDialog(false); setSelectedTaFile(null); setTaImportErrors([]); setTaImportSummary(null); setImportedTaDetails(null);}}>Cancel</Button>
          <Button 
            onClick={handleApiCallImportTAs} 
            color="primary" 
            variant="contained"
            disabled={!selectedTaFile || taImportLoading}
          >
            {taImportLoading ? <CircularProgress size={24} /> : 'Upload & Process TAs'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Updated Snackbar to include TA import notifications */}
      <Snackbar
        open={Boolean(
          error || instructorImportSummary || instructorImportErrors.length > 0 || (importedInstructorDetails && importedInstructorDetails.length > 0) ||
          taImportSummary || taImportErrors.length > 0 || (importedTaDetails && importedTaDetails.length > 0)
        )}
        autoHideDuration={15000}
        onClose={() => {
          setError(null);
          setInstructorImportSummary(null);
          setInstructorImportErrors([]);
          setImportedInstructorDetails(null);
          setTaImportSummary(null); // Clear TA states
          setTaImportErrors([]);
          setImportedTaDetails(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => {
            setError(null);
            setInstructorImportSummary(null);
            setInstructorImportErrors([]);
            setImportedInstructorDetails(null);
            setTaImportSummary(null); // Clear TA states
            setTaImportErrors([]);
            setImportedTaDetails(null);
          }}
          severity={ (error || instructorImportErrors.length > 0 || taImportErrors.length > 0) && !(instructorImportSummary || taImportSummary) ? "error" : "success" } 
          sx={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}
        >
          {error /* For main page error */}
          
          {/* Instructor Import Messages */}
          {instructorImportSummary && (
             <Box sx={{ mt: (error) ? 1 : 0 }}> 
                <Typography variant="subtitle1">
                  {instructorImportErrors.length > 0 || importedInstructorDetails 
                    ? `Instructor import process complete: successfully imported ${importedInstructorDetails ? importedInstructorDetails.length : 0} of ${(importedInstructorDetails ? importedInstructorDetails.length : 0) + instructorImportErrors.length} instructors.`
                    : instructorImportSummary
                  }
                </Typography>
             </Box>
          )}
          
          {/* TA Import Messages */}
          {taImportSummary && (
             <Box sx={{ mt: (error || instructorImportSummary || importedInstructorDetails || instructorImportErrors.length > 0) ? 1 : 0 }}> 
                <Typography variant="subtitle1">
                  {taImportErrors.length > 0 || importedTaDetails 
                    ? `Import process complete: successfully imported ${importedTaDetails ? importedTaDetails.length : 0} of ${(importedTaDetails ? importedTaDetails.length : 0) + taImportErrors.length} TAs.`
                    : taImportSummary
                  }
                </Typography>
             </Box>
          )}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ApproveUsers; 