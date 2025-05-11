import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import axios from '../utils/axiosConfig';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Alert,
  Grid as MuiGrid,
  CircularProgress,
  Modal,
  Snackbar
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';

// Create a functional component wrapper for Grid
const Grid = (props: any) => <MuiGrid {...props} />;

// Validation schema for login form
const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password should be of minimum 6 characters length')
    .required('Password is required'),
});

// Validation schema for forgot password form
const forgotPasswordValidationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, login, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Get the redirect path from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Initialize Formik for login
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        await login(values);
        // Redirect after successful login
        navigate(from, { replace: true });
      } catch (error) {
        // Error handling is done in the auth context
        console.error('Login error:', error);
      }
    },
  });

  // Initialize Formik for forgot password
  const forgotPasswordFormik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: forgotPasswordValidationSchema,
    onSubmit: async (values) => {
      try {
        console.log("Submitting forgot password request:", values);
        
        // Show a loading state on the button
        forgotPasswordFormik.setSubmitting(true);
        
        const response = await axios.post('/api/auth/forgot-password/', { email: values.email });
        console.log("Forgot password response:", response);
        
        handleCloseResetModal();
        setToastMessage("If that email is registered, you'll receive a temporary password shortly.");
        setToastOpen(true);
      } catch (error) {
        console.error('Forgot password error:', error);
        
        // Show error toast even when request fails
        handleCloseResetModal();
        setToastMessage("Request processed. If that email is registered, you'll receive a temporary password shortly.");
        setToastOpen(true);
      } finally {
        // Make sure to reset submitting state
        forgotPasswordFormik.setSubmitting(false);
      }
    },
  });

  const handleOpenResetModal = () => {
    setResetModalOpen(true);
  };

  const handleCloseResetModal = () => {
    setResetModalOpen(false);
    forgotPasswordFormik.resetForm();
  };

  const handleCloseToast = () => {
    setToastOpen(false);
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 8, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" textAlign="center">
          Sign in to Bilkent University TA Management System
        </Typography>
        
        {authState.error && (
          <Alert 
            severity="error" 
            sx={{ width: '100%', mt: 2 }}
            onClose={clearError}
          >
            {authState.error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3, width: '100%' }}>
          <TextField
            margin="normal"
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
          <TextField
            margin="normal"
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={authState.loading}
          >
            {authState.loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          <Box textAlign="center">
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer', display: 'inline-block' }}
              onClick={handleOpenResetModal}
            >
              forgot/don't know my password
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Reset Password Modal */}
      <Modal
        open={resetModalOpen}
        onClose={handleCloseResetModal}
        aria-labelledby="reset-password-modal"
      >
        <Box sx={modalStyle}>
          <Typography id="reset-password-modal" variant="h6" component="h2" mb={2}>
            Reset Password
          </Typography>
          <Box component="form" onSubmit={forgotPasswordFormik.handleSubmit}>
            <TextField
              margin="normal"
              fullWidth
              id="reset-email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={forgotPasswordFormik.values.email}
              onChange={forgotPasswordFormik.handleChange}
              onBlur={forgotPasswordFormik.handleBlur}
              error={forgotPasswordFormik.touched.email && Boolean(forgotPasswordFormik.errors.email)}
              helperText={forgotPasswordFormik.touched.email && forgotPasswordFormik.errors.email}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={forgotPasswordFormik.isSubmitting}
            >
              {forgotPasswordFormik.isSubmitting ? <CircularProgress size={24} /> : 'Send Temporary Password'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Success Toast */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        message={toastMessage}
      />
    </Container>
  );
};

export default Login; 