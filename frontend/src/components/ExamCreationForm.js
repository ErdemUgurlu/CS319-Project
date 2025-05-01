import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const ExamCreationForm = () => {
  const [formData, setFormData] = useState({
    course: '',
    sections: '',
    date: null,
    duration: '',
    examType: '',
    numberOfProctors: '',
    assignmentType: 'automatic'
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleDateChange = (newDate) => {
    setFormData(prevState => ({
      ...prevState,
      date: newDate
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted:', formData);
    // API call will be added here
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Create New Exam
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Course</InputLabel>
          <Select
            name="course"
            value={formData.course}
            label="Course"
            onChange={handleChange}
            required
          >
            <MenuItem value="CS101">CS101 - Introduction to Programming</MenuItem>
            <MenuItem value="CS319">CS319 - Object-Oriented Software Engineering</MenuItem>
            <MenuItem value="CS315">CS315 - Programming Languages</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Sections"
          name="sections"
          value={formData.sections}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
          placeholder="e.g., 1,2,3"
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateTimePicker
            label="Exam Date & Time"
            value={formData.date}
            onChange={handleDateChange}
            renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} required />}
            sx={{ mb: 2, width: '100%' }}
          />
        </LocalizationProvider>

        <TextField
          fullWidth
          label="Duration (minutes)"
          name="duration"
          type="number"
          value={formData.duration}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Exam Type</InputLabel>
          <Select
            name="examType"
            value={formData.examType}
            label="Exam Type"
            onChange={handleChange}
            required
          >
            <MenuItem value="midterm">Midterm</MenuItem>
            <MenuItem value="final">Final</MenuItem>
            <MenuItem value="quiz">Quiz</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Number of Proctors Needed"
          name="numberOfProctors"
          type="number"
          value={formData.numberOfProctors}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
        />

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Assignment Type
          </Typography>
          <RadioGroup
            name="assignmentType"
            value={formData.assignmentType}
            onChange={handleChange}
          >
            <FormControlLabel 
              value="automatic" 
              control={<Radio />} 
              label="Automatic Assignment" 
            />
            <FormControlLabel 
              value="manual" 
              control={<Radio />} 
              label="Manual Assignment" 
            />
          </RadioGroup>
        </FormControl>

        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          fullWidth
          size="large"
        >
          Create Exam
        </Button>
      </Box>
    </Paper>
  );
};

export default ExamCreationForm; 