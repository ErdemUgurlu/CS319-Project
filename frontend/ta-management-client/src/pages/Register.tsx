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
  Avatar,
  Alert,
  Stack,
  CircularProgress,
  InputAdornment,
  MenuItem
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
  password: yup
    .string()
    .min(8, 'Password should be of minimum 8 characters length')
    .required('Password is required'),
  password_confirm: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Password confirmation is required'),
  first_name: yup
    .string()
    .required('First name is required'),
  last_name: yup
    .string()
    .required('Last name is required'),
  bilkent_id: yup
    .number()
    .typeError('Bilkent ID must be a number')
    .integer('Bilkent ID must be an integer')
    .required('Bilkent ID is required'),
  role: yup
    .string()
    .required('Role is required'),
  phone: yup
    .string()
    .matches(
      /^\+?90?\d{10}$/,
      'Phone number must be a valid Turkish number (e.g., +905xxxxxxxxx or 05xxxxxxxxx)'
    )
    .required('Phone number is required'),
  department: yup
    .string()
    .required('Department is required'),
  academic_level: yup
    .string()
    .when('role', {
      is: 'TA',
      then: (schema) => schema.required('Academic level is required for TAs')
    }),
  employment_type: yup
    .string()
    .when('role', {
      is: 'TA',
      then: (schema) => schema.required('Employment type is required for TAs')
    }),
  iban: yup
    .string()
    .matches(
      /^TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}$|^$/,
      'IBAN must be a valid Turkish IBAN or empty'
    )
});

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      bilkent_id: '',
      role: 'TA', // Default role
      department: 'CS', // Default department
      phone: '',
      iban: '',
      academic_level: 'NOT_APPLICABLE',
      employment_type: 'NOT_APPLICABLE'
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await authService.register(values);
        console.log('Registration successful:', response);
        setSuccess(true);
        // Clear form after successful registration
        formik.resetForm();
      } catch (error: any) {
        console.error('Registration error:', error);
        
        // Handle different types of error responses
        if (error.response) {
          // The request was made and the server responded with a status code outside the 2xx range
          if (error.response.data) {
            // Try to extract error message from the response data
            if (typeof error.response.data === 'string') {
              setError(error.response.data);
            } else if (error.response.data.detail) {
              setError(error.response.data.detail);
            } else if (error.response.data.email) {
              setError(`Email error: ${error.response.data.email}`);
            } else if (error.response.data.password) {
              setError(`Password error: ${error.response.data.password}`);
            } else if (error.response.data.non_field_errors) {
              setError(error.response.data.non_field_errors);
            } else {
              // Handle case where data is an object with error messages
              const errorMessages = Object.entries(error.response.data)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              setError(errorMessages || 'Registration failed. Please check your information.');
            }
          } else {
            setError(`Error: ${error.response.status} - ${error.response.statusText}`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          setError('No response from server. Please check your connection and try again.');
        } else {
          // Something happened in setting up the request
          setError('Registration failed. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  // Show/hide academic level based on role
  const showAcademicLevel = formik.values.role === 'TA';
  
  // Show/hide employment type based on role
  const showEmploymentType = formik.values.role === 'TA';

  return (
    <Container component="main" maxWidth="md">
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
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <PersonAddIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Register for Bilkent TA Management System
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ width: '100%', mt: 2 }}
            onClose={() => setError(null)}
          >
            {error}
            {formik.values.department === 'OTHER' && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Note: Only CS and IE departments are currently supported for registration.
              </Typography>
            )}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success" 
            sx={{ width: '100%', mt: 2 }}
          >
            Registration submitted successfully! Please check your email for verification instructions.
          </Alert>
        )}
        
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3, width: '100%' }}>
          <Stack spacing={2}>
            {/* Personal Information */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                id="first_name"
                name="first_name"
                label="First Name"
                value={formik.values.first_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.first_name && Boolean(formik.errors.first_name)}
                helperText={formik.touched.first_name && formik.errors.first_name}
              />
              <TextField
                fullWidth
                id="last_name"
                name="last_name"
                label="Last Name"
                value={formik.values.last_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.last_name && Boolean(formik.errors.last_name)}
                helperText={formik.touched.last_name && formik.errors.last_name}
              />
            </Stack>
            
            {/* Bilkent ID */}
            <TextField
              fullWidth
              id="bilkent_id"
              name="bilkent_id"
              label="Bilkent ID"
              type="number"
              value={formik.values.bilkent_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.bilkent_id && Boolean(formik.errors.bilkent_id)}
              helperText={formik.touched.bilkent_id && formik.errors.bilkent_id}
            />
            
            {/* Email */}
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            
            {/* Role and Department */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                id="role"
                name="role"
                label="Role"
                value={formik.values.role}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.role && Boolean(formik.errors.role)}
                helperText={formik.touched.role && formik.errors.role}
              >
                <MenuItem value="TA">Teaching Assistant</MenuItem>
                <MenuItem value="INSTRUCTOR">Course Instructor</MenuItem>
                <MenuItem value="STAFF">Authorized Staff</MenuItem>
                <MenuItem value="DEAN_OFFICE">Dean Office</MenuItem>
              </TextField>
              
              <TextField
                select
                fullWidth
                id="department"
                name="department"
                label="Department"
                value={formik.values.department}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.department && Boolean(formik.errors.department)}
                helperText={formik.touched.department && formik.errors.department}
              >
                <MenuItem value="CS">Computer Science</MenuItem>
                <MenuItem value="IE">Industrial Engineering</MenuItem>
              </TextField>
            </Stack>
            
            {/* TA Specific Fields */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Academic Level */}
              {showAcademicLevel && (
                <TextField
                  select
                  fullWidth
                  id="academic_level"
                  name="academic_level"
                  label="Academic Level"
                  value={formik.values.academic_level}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.academic_level && Boolean(formik.errors.academic_level)}
                  helperText={formik.touched.academic_level && formik.errors.academic_level}
                >
                  <MenuItem value="MASTERS">Masters</MenuItem>
                  <MenuItem value="PHD">PhD</MenuItem>
                </TextField>
              )}
              
              {/* Employment Type */}
              {showEmploymentType && (
                <TextField
                  select
                  fullWidth
                  id="employment_type"
                  name="employment_type"
                  label="Employment Type"
                  value={formik.values.employment_type}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.employment_type && Boolean(formik.errors.employment_type)}
                  helperText={
                    (formik.touched.employment_type && formik.errors.employment_type) || 
                    "Full-time TAs are required to complete twice the workload of part-time TAs"
                  }
                >
                  <MenuItem value="FULL_TIME">Full-Time</MenuItem>
                  <MenuItem value="PART_TIME">Part-Time</MenuItem>
                </TextField>
              )}
            </Stack>
            
            {/* Phone */}
            <TextField
              fullWidth
              id="phone"
              name="phone"
              label="Phone Number"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone || "Turkish number format (e.g. +905xxxxxxxxx)"}
              placeholder="+905xxxxxxxxx"
            />
            
            {/* IBAN */}
            <TextField
              fullWidth
              id="iban"
              name="iban"
              label="IBAN (Optional)"
              value={formik.values.iban}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.iban && Boolean(formik.errors.iban)}
              helperText={formik.touched.iban && formik.errors.iban || "Turkish IBAN format (e.g. TR12 3456 7890 1234 5678 9012 34)"}
              placeholder="TR12 3456 7890 1234 5678 9012 34"
            />
            
            {/* Password */}
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />
            
            {/* Password Confirmation */}
            <TextField
              fullWidth
              id="password_confirm"
              name="password_confirm"
              label="Confirm Password"
              type="password"
              value={formik.values.password_confirm}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password_confirm && Boolean(formik.errors.password_confirm)}
              helperText={formik.touched.password_confirm && formik.errors.password_confirm}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>
            
            <Typography variant="body2" align="center">
              Already have an account? <Link to="/login">Sign in</Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register; 