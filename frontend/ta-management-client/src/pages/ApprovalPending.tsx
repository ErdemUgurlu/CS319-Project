import React from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Button, 
  Alert,
  AlertTitle
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ApprovalPending: React.FC = () => {
  const { logout, authState } = useAuth();
  const navigate = useNavigate();
  const { user } = authState;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" color="primary" gutterBottom>
            Account Pending Approval
          </Typography>
          
          <Alert severity="info" sx={{ my: 2 }}>
            <AlertTitle>Hello {user?.first_name || 'User'}!</AlertTitle>
            Your account is registered but waiting for approval from department staff.
          </Alert>
          
          <Typography variant="body1" paragraph>
            Thank you for registering with the Bilkent TA Management System. 
            Your account has been created but requires approval from an authorized staff member 
            before you can access the system.
          </Typography>
          
          <Typography variant="body1" paragraph>
            You will receive an email notification once your account has been approved.
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold' }}>
            Please check your email for verification instructions if you haven't verified your email address yet.
          </Typography>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleLogout}
            >
              Return to Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ApprovalPending; 