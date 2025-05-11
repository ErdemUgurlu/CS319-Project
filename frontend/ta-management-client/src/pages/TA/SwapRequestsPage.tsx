import React, { useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Paper,
  Box,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
// import { useAuth } from '../../context/AuthContext'; // Assuming you'll need auth context
// import proctoringService, { ProctorAssignment } from '../../services/proctoringService'; // For fetching proctoring duties
// import swapService from '../../services/swapService'; // You'll need to create this service

// Define interfaces for SwapRequest and ProctorAssignment if not already defined globally
// interface ProctorAssignment {
//   id: number;
//   exam: {
//     title: string;
//     date: string;
//     start_time: string;
//     end_time: string;
//     section?: {
//       course?: {
//         code: string;
//         title: string;
//       };
//     };
//   };
//   exam_room?: {
//     classroom_name: string;
//     room_number: string;
//   };
//   status: string;
// }

// interface SwapRequest {
//   id: number;
//   proctoring_assignment_id: number;
//   requester_id: number;
//   requested_proctor_id?: number;
//   status: string; // e.g., PENDING, APPROVED, REJECTED, CANCELED
//   created_at: string;
//   // Potentially include details of the proctoring assignment being swapped
//   proctoring_assignment?: ProctorAssignment;
// }

const SwapRequestsPage: React.FC = () => {
  // const { authState } = useAuth();
  // const currentUser = authState.user;

  const [mySwapRequests, setMySwapRequests] = useState<any[]>([]); // Replace 'any' with SwapRequest interface
  const [proctoringAssignments, setProctoringAssignments] = useState<any[]>([]); // Replace 'any' with ProctorAssignment interface
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [openCreateModal, setOpenCreateModal] = useState(false);
  // const [selectedAssignment, setSelectedAssignment] = useState<ProctorAssignment | null>(null);

  // TODO: Fetch user's existing swap requests
  useEffect(() => {
    const fetchSwapRequests = async () => {
      try {
        setLoadingRequests(true);
        // const data = await swapService.getMySwapRequests(); // Example service call
        // setMySwapRequests(data);
        // Simulate API call
        setTimeout(() => {
          setMySwapRequests([]); // Initialize with empty array or mock data
          setLoadingRequests(false);
        }, 1000);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error fetching swap requests');
        setLoadingRequests(false);
      }
    };
    fetchSwapRequests();
  }, []);

  // TODO: Fetch user's proctoring assignments (eligible for swap)
  useEffect(() => {
    const fetchProctoringAssignments = async () => {
      try {
        setLoadingAssignments(true);
        // const assignments = await proctoringService.getSwappableAssignments(); // Example service call
        // setProctoringAssignments(assignments);
        // Simulate API call
        setTimeout(() => {
          setProctoringAssignments([]); // Initialize with empty array or mock data
          setLoadingAssignments(false);
        }, 1000);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error fetching proctoring assignments');
        setLoadingAssignments(false);
      }
    };
    fetchProctoringAssignments();
  }, []);

  // const handleOpenCreateModal = (assignment: ProctorAssignment) => {
  //   setSelectedAssignment(assignment);
  //   setOpenCreateModal(true);
  // };

  // const handleCloseCreateModal = () => {
  //   setOpenCreateModal(false);
  //   setSelectedAssignment(null);
  // };

  // const handleCreateSwapRequest = async () => {
  //   if (!selectedAssignment) return;
  //   try {
  //     // await swapService.createSwapRequest({ proctoring_assignment_id: selectedAssignment.id });
  //     // handleCloseCreateModal();
  //     // fetchSwapRequests(); // Refresh list
  //     alert('Swap request created (simulated)');
  //   } catch (err: any) {
  //     setError(err.response?.data?.detail || 'Error creating swap request');
  //   }
  // };
  
  // Format date (consider moving to a utils file if used elsewhere)
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mt: 3, boxShadow: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            My Swap Requests
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            // onClick={() => setOpenCreateModal(true)} // This will likely open a modal with assignments to pick from
            onClick={() => alert('Open create swap request modal/view')}
          >
            Create Swap Request
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h5" gutterBottom sx={{ mt: 3, mb: 2, color: 'secondary.main' }}>
          Existing Swap Requests
        </Typography>
        {loadingRequests ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : mySwapRequests.length === 0 ? (
          <Typography>You have no active swap requests.</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Exam</TableCell>
                  <TableCell>Original Date & Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mySwapRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.proctoring_assignment?.exam?.title || 'N/A'}</TableCell>
                    <TableCell>
                      {request.proctoring_assignment ? 
                        `${formatDate(request.proctoring_assignment.exam.date)} ${request.proctoring_assignment.exam.start_time} - ${request.proctoring_assignment.exam.end_time}` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip label={request.status} color="primary" />
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell>
                      {/* TODO: Add actions like Cancel, View Details etc. */}
                      <Button size="small" onClick={() => alert(`Viewing details for ${request.id}`)}>View</Button>
                       {request.status === 'PENDING' && (
                        <Button size="small" color="error" onClick={() => alert(`Cancelling ${request.id}`)}>Cancel</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Placeholder for Create Swap Request Modal/Form */}
        {/* This would list proctoringAssignments and allow selection */}
        {/* <Dialog open={openCreateModal} onClose={handleCloseCreateModal} fullWidth maxWidth="md">
          <DialogTitle>Create New Swap Request</DialogTitle>
          <DialogContent>
            {loadingAssignments ? <CircularProgress /> : (
              <List>
                {proctoringAssignments.map(assignment => (
                  <ListItemButton key={assignment.id} onClick={() => setSelectedAssignment(assignment)}>
                     <ListItemText 
                        primary={`${assignment.exam.section?.course?.code} - ${assignment.exam.title}`}
                        secondary={`${formatDate(assignment.exam.date)} ${assignment.exam.start_time}-${assignment.exam.end_time}`}
                      />
                      {selectedAssignment?.id === assignment.id && <CheckIcon color="primary" />}
                  </ListItemButton>
                ))}
              </List>
            )}
            {proctoringAssignments.length === 0 && !loadingAssignments && (
              <Typography>You have no available proctoring duties to swap.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreateModal}>Cancel</Button>
            <Button onClick={handleCreateSwapRequest} variant="contained" disabled={!selectedAssignment || loadingAssignments}>
              Create Request
            </Button>
          </DialogActions>
        </Dialog> */}

      </Paper>
    </Container>
  );
};

export default SwapRequestsPage; 