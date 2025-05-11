import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  CircularProgress,
  Alert,
  Button,
  Tooltip
} from '@mui/material';
import { format } from 'date-fns';
import proctoringService, { ProctorAssignment } from '../../services/proctoringService';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';

const ProctoringDutiesPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ProctorAssignment[]>([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load proctor assignments from the database
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const data = await proctoringService.getMyProctorings();
        setAssignments(data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || err.response?.data?.detail || 'Error fetching proctor assignments');
        console.error('Error fetching proctor assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [refreshTrigger]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get the status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <Chip label="Assigned" color="primary" variant="outlined" />;
      case 'CONFIRMED':
        return <Chip label="Confirmed" color="success" />;
      case 'COMPLETED':
        return <Chip label="Completed" color="default" />;
      case 'SWAPPED':
        return <Chip label="Swapped" color="secondary" />;
      case 'DECLINED':
        return <Chip label="Declined" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  // Handle confirming an assignment
  const handleConfirmAssignment = async (assignmentId: number) => {
    try {
      await proctoringService.confirmAssignment(assignmentId);
      // Refresh data
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Error confirming assignment:', err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Error confirming assignment');
    }
  };

  // Handle rejecting an assignment
  const handleRejectAssignment = async (assignmentId: number) => {
    try {
      await proctoringService.rejectAssignment(assignmentId);
      // Refresh data
      setRefreshTrigger(prev => prev + 1);
      setError(null); // Clear previous errors
    } catch (err: any) {
      console.error('Error rejecting assignment:', err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Error rejecting assignment');
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper 
        sx={{ 
          p: 3, 
          mt: 3, 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: 3,
          borderRadius: 2
        }}
      >
        <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
          My Proctoring Duties
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {!loading && !error && assignments.length === 0 && (
          <Typography variant="body1">
            You have no assigned proctoring duties at this time.
          </Typography>
        )}

        {!loading && !error && assignments.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>Exam</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {assignment.exam.section?.course?.code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.exam.section?.course?.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">
                        {assignment.exam.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">
                        {formatDate(assignment.exam.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.exam.start_time} - {assignment.exam.end_time}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {assignment.exam_room ? (
                        <Typography variant="body1">
                          {assignment.exam_room.classroom_name} {assignment.exam_room.room_number}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not assigned yet
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusDisplay(assignment.status)}
                    </TableCell>
                    <TableCell>
                      {assignment.status === 'ASSIGNED' && (
                        <Tooltip title="Reject this assignment">
                          <Button
                            startIcon={<CancelIcon />}
                            onClick={() => handleRejectAssignment(assignment.id)}
                            color="error"
                            variant="outlined"
                            size="small"
                          >
                            REJECT
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default ProctoringDutiesPage; 