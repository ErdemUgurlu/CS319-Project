import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Link,
} from '@mui/material';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import api from '../services/api';
import bilkentLogo from '../assets/bilkent-logo.png';

const roles = [
  { value: 'ta', label: 'Teaching Assistant (TA)' },
  { value: 'instructor', label: 'Course Instructor' },
  { value: 'staff', label: 'Authorized Staff' },
  { value: 'dean', label: 'Dean Office' },
];

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password should be of minimum 6 characters length')
    .required('Password is required'),
  role: Yup.string()
    .required('Role is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [demoMode, setDemoMode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const theme = useTheme();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      role: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        dispatch(loginStart());
        
        // Demo mode for testing
        if (demoMode) {
          const demoUser = {
            id: 1,
            name: 'Demo User',
            email: values.email,
            role: values.role,
            academicLevel: values.role === 'ta' ? 'MS' : null,
            department: 'Computer Engineering',
            permissions: getPermissionsByRole(values.role),
          };
          
          setTimeout(() => {
            dispatch(loginSuccess({ 
              user: demoUser, 
              token: 'demo-token' 
            }));
            localStorage.setItem('token', 'demo-token');
            // Redirect based on role
            if (values.role === 'instructor') {
              navigate('/instructor');
            } else {
              navigate('/');
            }
          }, 1000);
          
          return;
        }
        
        const response = await api.post('/auth/login/', values);
        dispatch(loginSuccess(response.data));
        localStorage.setItem('token', response.data.token);
        // Redirect based on role
        if (values.role === 'instructor') {
          navigate('/instructor');
        } else {
          navigate('/');
        }
      } catch (err) {
        dispatch(loginFailure(err.response?.data?.message || 'Login failed'));
      }
    },
  });

  const getPermissionsByRole = (role) => {
    switch (role) {
      case 'ta':
        return ['view_tasks', 'create_tasks', 'view_workload', 'request_leave', 'request_swap'];
      case 'instructor':
        return ['view_tasks', 'approve_tasks', 'view_workload', 'create_exams', 'assign_proctors'];
      case 'staff':
        return ['view_tasks', 'approve_tasks', 'view_workload', 'assign_proctors', 'manage_swaps', 'manage_users'];
      case 'dean':
        return ['view_tasks', 'view_workload', 'view_reports', 'manage_interdepartmental', 'manage_all_users', 'manage_all_courses'];
      default:
        return [];
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    // This will be implemented later with email verification
    alert('Password reset instructions will be sent to your email. This feature will be implemented later.');
    setShowForgotPassword(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
        py: 4,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Box
            component="img"
            src={bilkentLogo}
            alt="Bilkent University"
            sx={{
              height: 120,
              width: 'auto',
              mb: 3,
              objectFit: 'contain',
            }}
          />
          
          <Typography component="h1" variant="h4" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
            TA Management System
          </Typography>
          <Typography component="h2" variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            {showForgotPassword ? 'Reset Your Password' : 'Sign in to your account'}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          {showForgotPassword ? (
            <Box
              component="form"
              onSubmit={handleResetPassword}
              sx={{ width: '100%' }}
            >
              <Typography variant="body2" sx={{ mb: 3 }}>
                Enter your email address and we'll send you instructions to reset your password.
              </Typography>
              
              <TextField
                fullWidth
                id="reset-email"
                name="reset-email"
                label="Email Address"
                margin="normal"
                variant="outlined"
                required
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                Send Reset Instructions
              </Button>
              
              <Button
                fullWidth
                variant="text"
                onClick={handleBackToLogin}
                sx={{ mb: 2 }}
              >
                Back to Login
              </Button>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={formik.handleSubmit}
              sx={{ width: '100%' }}
            >
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                margin="normal"
                variant="outlined"
              />
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                margin="normal"
                variant="outlined"
              />
              <FormControl 
                fullWidth 
                margin="normal"
                error={formik.touched.role && Boolean(formik.errors.role)}
                variant="outlined"
              >
                <InputLabel id="role-label">Select Role</InputLabel>
                <Select
                  labelId="role-label"
                  id="role"
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                  label="Select Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.role && formik.errors.role && (
                  <Typography variant="caption" color="error">
                    {formik.errors.role}
                  </Typography>
                )}
              </FormControl>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </Link>
              </Box>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setDemoMode(!demoMode)}
                sx={{ mb: 2 }}
              >
                {demoMode ? 'Disable Demo Mode' : 'Enable Demo Mode'}
              </Button>
            </Box>
          )}
        </Paper>
        
        <Typography variant="body2" color="white" align="center" sx={{ mt: 3 }}>
          © {new Date().getFullYear()} Bilkent University. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Login; 