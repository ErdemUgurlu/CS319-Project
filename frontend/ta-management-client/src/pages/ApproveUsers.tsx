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
  MenuItem
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Approval Panel
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        {authState.user?.role === 'ADMIN' 
          ? 'As an admin, you can approve users from all departments.'
          : `You can approve users from the ${authState.user?.department} department.`}
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
          sx={{ ml: 'auto' }}
        >
          Refresh
        </Button>
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
    </Container>
  );
};

export default ApproveUsers; 