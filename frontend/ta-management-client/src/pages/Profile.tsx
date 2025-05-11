import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface PasswordChangeData {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

const Profile: React.FC = () => {
  const { authState } = useAuth();
  const { user } = authState;
  
  // State for password change
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    old_password: '',
    new_password: '',
    new_password_confirm: ''
  });
  
  // State for loading and alerts
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form validation
  const [passwordErrors, setPasswordErrors] = useState<{
    old_password?: string;
    new_password?: string;
    new_password_confirm?: string;
  }>({});
  
  const validatePasswordForm = (): boolean => {
    const errors: {
      old_password?: string;
      new_password?: string;
      new_password_confirm?: string;
    } = {};
    
    if (!passwordData.old_password) {
      errors.old_password = 'Current password is required';
    }
    
    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }
    
    if (!passwordData.new_password_confirm) {
      errors.new_password_confirm = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.new_password_confirm) {
      errors.new_password_confirm = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.post('/accounts/change-password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.new_password_confirm
      });
      
      setSuccess('Password changed successfully!');
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: ''
      });
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.error || 
               (err.response?.data?.old_password ? err.response.data.old_password[0] : 
               (err.response?.data?.new_password ? err.response.data.new_password[0] : 
               (err.response?.data?.new_password_confirm ? err.response.data.new_password_confirm[0] : 
               'Failed to change password'))));
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Container>
        <Box mt={4}>
          <Alert severity="error">User not found. Please login again.</Alert>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container>
      <Box mt={4} mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>
        
        <Grid container spacing={4}>
          {/* Profile Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="User Information" />
              <CardContent>
                <Box mb={2}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Name:</strong> {user.first_name} {user.last_name}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Email:</strong> {user.email}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Role:</strong> {user.role}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Approval Status:</strong> {user.is_approved ? 'Approved' : 'Pending Approval'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Email Verified:</strong> {user.email_verified ? 'Verified' : 'Not Verified'}
                  </Typography>
                  {user.department && (
                    <Typography variant="body1" gutterBottom>
                      <strong>Department:</strong> {user.department}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Password Change Form */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Change Password" />
              <CardContent>
                <form onSubmit={handlePasswordSubmit}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Current Password"
                    type="password"
                    name="old_password"
                    value={passwordData.old_password}
                    onChange={handlePasswordChange}
                    error={!!passwordErrors.old_password}
                    helperText={passwordErrors.old_password}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    margin="normal"
                    label="New Password"
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    error={!!passwordErrors.new_password}
                    helperText={passwordErrors.new_password}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Confirm New Password"
                    type="password"
                    name="new_password_confirm"
                    value={passwordData.new_password_confirm}
                    onChange={handlePasswordChange}
                    error={!!passwordErrors.new_password_confirm}
                    helperText={passwordErrors.new_password_confirm}
                    required
                  />
                  
                  <Box mt={2}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="primary"
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Change Password'}
                    </Button>
                  </Box>
                  
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {error}
                    </Alert>
                  )}
                  
                  {success && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      {success}
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile; 