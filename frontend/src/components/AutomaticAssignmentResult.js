import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  TextField,
  Stack,
} from '@mui/material';

const AutomaticAssignmentResult = ({ examData, assignedTAs, onClassroomAssign }) => {
  const [classrooms, setClassrooms] = React.useState(
    assignedTAs.map(() => '')
  );

  const handleClassroomChange = (index, value) => {
    const newClassrooms = [...classrooms];
    newClassrooms[index] = value;
    setClassrooms(newClassrooms);
  };

  const handleSubmitClassrooms = () => {
    if (classrooms.some(classroom => !classroom)) {
      alert('Please assign all classrooms');
      return;
    }
    onClassroomAssign(classrooms);
  };

  if (!assignedTAs.length) {
    return (
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Alert severity="error">
          No TAs could be assigned automatically. Please try manual assignment.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Automatic Assignment Results
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" color="text.secondary">
          Exam Details:
        </Typography>
        <Typography>
          Course: {examData.course}
        </Typography>
        <Typography>
          Date: {new Date(examData.date).toLocaleString()}
        </Typography>
        <Typography>
          Duration: {examData.duration} minutes
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>TA Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Current Workload</TableCell>
              <TableCell>Classroom</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignedTAs.map((ta, index) => (
              <TableRow key={ta.id}>
                <TableCell>{ta.name}</TableCell>
                <TableCell>{ta.department}</TableCell>
                <TableCell>{ta.workload} hours</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={classrooms[index]}
                    onChange={(e) => handleClassroomChange(index, e.target.value)}
                    placeholder="e.g., EA-409"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmitClassrooms}
          disabled={classrooms.some(classroom => !classroom)}
        >
          Assign Classrooms
        </Button>
        <Button
          variant="outlined"
          color="secondary"
        >
          Switch to Manual Assignment
        </Button>
      </Stack>
    </Paper>
  );
};

export default AutomaticAssignmentResult; 