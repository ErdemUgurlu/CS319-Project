import React, { useState } from 'react';
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
  Chip,
  TextField,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const ManualAssignment = ({ examData, availableTAs, onAssignTAs }) => {
  const [selectedTAs, setSelectedTAs] = useState([]);
  const [classrooms, setClassrooms] = useState({});
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const handleTASelect = (ta) => {
    if (selectedTAs.find(selected => selected.id === ta.id)) {
      setSelectedTAs(selectedTAs.filter(selected => selected.id !== ta.id));
      const newClassrooms = { ...classrooms };
      delete newClassrooms[ta.id];
      setClassrooms(newClassrooms);
    } else {
      if (selectedTAs.length >= examData.numberOfProctors) {
        alert(`You can only select ${examData.numberOfProctors} proctors`);
        return;
      }
      setSelectedTAs([...selectedTAs, ta]);
    }
  };

  const handleClassroomChange = (taId, value) => {
    setClassrooms({
      ...classrooms,
      [taId]: value
    });
  };

  const checkRestrictions = (ta) => {
    const restrictions = [];
    
    if (examData.level === 'MS/PHD' && !ta.is_phd) {
      restrictions.push('Only PhD students can be assigned to MS/PHD level courses');
    }
    
    if (ta.is_on_leave) {
      restrictions.push('TA is on leave');
    }
    
    if (ta.taking_course) {
      restrictions.push('TA is taking this course');
    }
    
    if (ta.has_exam_conflict) {
      restrictions.push('TA has an exam conflict');
    }
    
    return restrictions;
  };

  const handleAssign = () => {
    if (selectedTAs.length < examData.numberOfProctors) {
      alert(`Please select ${examData.numberOfProctors} proctors`);
      return;
    }

    if (Object.keys(classrooms).length < selectedTAs.length) {
      alert('Please assign classrooms for all selected TAs');
      return;
    }

    const assignments = selectedTAs.map(ta => ({
      ta: ta,
      classroom: classrooms[ta.id]
    }));

    onAssignTAs(assignments);
  };

  const handleTAClick = (ta) => {
    const restrictions = checkRestrictions(ta);
    if (restrictions.length > 0) {
      setWarningMessage(restrictions.join('\n'));
      setShowWarning(true);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Manual Assignment
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
          Number of Proctors Needed: {examData.numberOfProctors}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        TAs are listed in order of priority. Course TAs are listed first, followed by other department TAs.
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>TA Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Current Workload</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Classroom</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableTAs.map((ta) => {
              const isSelected = selectedTAs.find(selected => selected.id === ta.id);
              const restrictions = checkRestrictions(ta);
              const hasWarnings = restrictions.length > 0;

              return (
                <TableRow 
                  key={ta.id}
                  sx={{
                    backgroundColor: isSelected ? 'action.selected' : 'inherit',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <TableCell>
                    {ta.name}
                    {hasWarnings && (
                      <WarningIcon 
                        color="warning" 
                        sx={{ ml: 1, cursor: 'pointer' }}
                        onClick={() => handleTAClick(ta)}
                      />
                    )}
                  </TableCell>
                  <TableCell>{ta.department}</TableCell>
                  <TableCell>{ta.workload} hours</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {ta.is_course_ta && (
                        <Chip size="small" label="Course TA" color="primary" />
                      )}
                      {ta.is_phd && (
                        <Chip size="small" label="PhD" color="secondary" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {isSelected && (
                      <TextField
                        size="small"
                        value={classrooms[ta.id] || ''}
                        onChange={(e) => handleClassroomChange(ta.id, e.target.value)}
                        placeholder="e.g., EA-409"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={isSelected ? "outlined" : "contained"}
                      color={isSelected ? "error" : "primary"}
                      size="small"
                      onClick={() => handleTASelect(ta)}
                    >
                      {isSelected ? "Remove" : "Select"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssign}
          disabled={
            selectedTAs.length !== examData.numberOfProctors ||
            Object.keys(classrooms).length < selectedTAs.length
          }
        >
          Confirm Assignments
        </Button>
      </Stack>

      <Dialog open={showWarning} onClose={() => setShowWarning(false)}>
        <DialogTitle>Assignment Restrictions</DialogTitle>
        <DialogContent>
          <Typography whiteSpace="pre-line">
            {warningMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWarning(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ManualAssignment; 