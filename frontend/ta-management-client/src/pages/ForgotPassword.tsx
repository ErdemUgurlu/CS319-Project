import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Stack,
  CircularProgress,
  Grid
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import authService from '../services/authService';

// Validation schema
const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .matches(
      /^[a-zA-Z0-9._%+-]+@.*bilkent\.edu\.tr$/,
      'Must be a valid Bilkent University email'
    )
    .required('Email is required'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Formik
  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        // First check if the email exists
        const checkResponse = await authService.checkEmailExists(values.email);
        
        if (checkResponse.data.exists) {
          // User exists, send password reset email
          await authService.requestPasswordReset(values.email);
          setSuccessMessage('If an account with this email exists, a password reset email has been sent.');
        } else {
          // User doesn't exist, try to create from Excel data
          try {
            const createResponse = await authService.createTAFromEmail(values.email);
            if (createResponse.data.created) {
              setSuccessMessage('Account created successfully! An email with login instructions has been sent to your email address.');
            } else if (createResponse.data.exists) {
              // This shouldn't happen given the first check, but just in case
              setSuccessMessage('An account with this email already exists. A password reset email has been sent.');
            } else {
              setErrorMessage('Unable to create account. Please contact system administrator.');
            }
          } catch (createError: any) {
            setErrorMessage(createError.response?.data?.message || 'Unable to create account. Please check if your email is in the TA list.');
          }
        }
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || 'An error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LockResetIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              Password Assistance
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Enter your Bilkent email address. If you're a TA in our system, we'll either reset your password or create a new account for you.
            </Typography>
          </Box>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={formik.handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
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
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Back to login
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword; 