import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  TextField,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const LeaveEvaluation = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();

  // Mock leave request data
  const [request, setRequest] = useState({
    id: requestId,
    taName: 'John Doe',
    course: 'CS101',
    startDate: '2024-05-15',
    endDate: '2024-05-16',
    reason: 'Medical appointment',
    status: 'Pending',
    additionalInfo: 'I have a scheduled medical check-up that cannot be rescheduled.',
  });

  const [evaluationNote, setEvaluationNote] = useState('');

  const handleApprove = () => {
    // Here you would typically make an API call to update the request status
    setRequest({ ...request, status: 'Approved' });
    setTimeout(() => navigate('/instructor'), 1500);
  };

  const handleReject = () => {
    // Here you would typically make an API call to update the request status
    setRequest({ ...request, status: 'Rejected' });
    setTimeout(() => navigate('/instructor'), 1500);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>Leave Request Evaluation</Typography>
          <Chip
            label={request.status}
            color={
              request.status === 'Approved' ? 'success' :
              request.status === 'Rejected' ? 'error' :
              'warning'
            }
            sx={{ mt: 1 }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Request Details</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">TA Name</Typography>
              <Typography variant="body1">{request.taName}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">Course</Typography>
              <Typography variant="body1">{request.course}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">Date Range</Typography>
              <Typography variant="body1">{request.startDate} to {request.endDate}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Request Reason</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>{request.reason}</Typography>
            
            <Typography variant="subtitle1" gutterBottom>Additional Information</Typography>
            <Typography variant="body1">{request.additionalInfo}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>Evaluation Note</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Add your evaluation notes here..."
              value={evaluationNote}
              onChange={(e) => setEvaluationNote(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleApprove}
              >
                Approve
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default LeaveEvaluation; 