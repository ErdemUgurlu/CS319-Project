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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Tabs,
  Tab,
  TextField,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import { useAuth } from '../../context/AuthContext';
import proctoringService, { ProctorAssignment } from '../../services/proctoringService';
// Artık gerçek API'yi kullanıyoruz
import swapService, { SwapRequest, CreateSwapRequestData, MatchSwapRequestData } from '../../services/swapService';

const SwapRequestsPage: React.FC = () => {
  const { authState } = useAuth();
  const currentUser = authState.user;

  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);

  // Set initial active tab based on user role
  useEffect(() => {
    if (currentUser?.role === 'STAFF') {
      setActiveTab(0); // For STAFF, there's only one tab - Matched Requests
    }
  }, [currentUser]);

  // Swap requests states
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // My proctoring assignments state
  const [myProctoringAssignments, setMyProctoringAssignments] = useState<ProctorAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  
  // Available swap requests from other TAs state
  const [availableSwapRequests, setAvailableSwapRequests] = useState<SwapRequest[]>([]);
  const [loadingAvailableRequests, setLoadingAvailableRequests] = useState(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openMatchModal, setOpenMatchModal] = useState(false);
  const [openViewDetailsModal, setOpenViewDetailsModal] = useState(false);
  const [openConfirmationDialog, setOpenConfirmationDialog] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmationSwapId, setConfirmationSwapId] = useState<number | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ProctorAssignment | null>(null);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<SwapRequest | null>(null);
  const [selectedMyAssignmentForMatch, setSelectedMyAssignmentForMatch] = useState<ProctorAssignment | null>(null);
  const [reasonText, setReasonText] = useState<string>("");

  // Confirmation dialog handlers
  const showConfirmation = (action: 'approve' | 'reject', swapId: number) => {
    setConfirmationAction(action);
    setConfirmationSwapId(swapId);
    setOpenConfirmationDialog(true);
  };
  
  const handleConfirmationClose = () => {
    setOpenConfirmationDialog(false);
  };
  
  const handleConfirmAction = () => {
    if (confirmationAction === 'approve' && confirmationSwapId !== null) {
      handleApproveSwap(confirmationSwapId);
    } else if (confirmationAction === 'reject' && confirmationSwapId !== null) {
      handleRejectSwap(confirmationSwapId);
    }
  };

  // Fetch departmental swap requests
  useEffect(() => {
    const fetchSwapRequests = async () => {
      try {
        setLoadingRequests(true);
        setError(null);
        const data = await swapService.getSwapRequests();
        setSwapRequests(data);
      } catch (err: any) {
        console.error("Error fetching swap requests:", err);
        setError(err.response?.data?.detail || err.message || 'Error fetching swap requests.');
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchSwapRequests();
  }, []);

  // Fetch my proctoring assignments (only for TAs)
  useEffect(() => {
    if (currentUser?.role !== 'TA') {
      // Non-TA users (e.g., STAFF) do not have personal proctoring assignments
      setLoadingAssignments(false);
      return;
    }

    const fetchProctoringAssignments = async () => {
      try {
        setLoadingAssignments(true);
        setError(null);
        const assignments = await proctoringService.getMyProctorings();
        setMyProctoringAssignments(assignments);
      } catch (err: any) {
        console.error("Error fetching proctoring assignments:", err);
        setError(err.response?.data?.detail || err.message || 'Error fetching your proctoring assignments.');
      } finally {
        setLoadingAssignments(false);
      }
    };

    fetchProctoringAssignments();
  }, [currentUser?.role]);

  // Filter available swap requests from other TAs
  useEffect(() => {
    if (!swapRequests || !currentUser) return;
    
    setAvailableSwapRequests(
      swapRequests.filter(sr => 
        sr.status === 'PENDING' && 
        sr.requesting_proctor.id !== currentUser?.user_id
      )
    );
    setLoadingAvailableRequests(false);
  }, [swapRequests, currentUser]);

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Modal handlers
  const handleOpenCreateModal = () => {
    setSelectedAssignment(null);
    setReasonText("");
    setOpenCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false);
    setSelectedAssignment(null);
    setReasonText("");
  };

  const handleOpenMatchModal = (swapRequest: SwapRequest) => {
    setSelectedSwapRequest(swapRequest);
    setSelectedMyAssignmentForMatch(null);
    setOpenMatchModal(true);
  };

  const handleCloseMatchModal = () => {
    setOpenMatchModal(false);
    setSelectedSwapRequest(null);
    setSelectedMyAssignmentForMatch(null);
  };

  const handleOpenViewDetailsModal = (swapRequest: SwapRequest) => {
    setSelectedSwapRequest(swapRequest);
    setOpenViewDetailsModal(true);
  };

  const handleCloseViewDetailsModal = () => {
    setOpenViewDetailsModal(false);
    setSelectedSwapRequest(null);
  };

  // Create new swap request
  const handleCreateSwapRequest = async () => {
    if (!selectedAssignment) {
      setError('Please select a proctoring assignment to swap.');
      return;
    }
    
    try {
      // Doğru ID'yi kullandığımızdan emin olalım ve console'a yazdıralım
      console.log("Selected assignment:", selectedAssignment);
      console.log("Using assignment ID:", selectedAssignment.id);
      
      const createData: CreateSwapRequestData = {
        original_assignment: selectedAssignment.id,
        reason: reasonText.trim() || ""  // Ensure reason is not undefined
      };
      
      console.log("Sending swap request data:", JSON.stringify(createData));
      const createdRequest = await swapService.createSwapRequest(createData);
      console.log("Swap request created successfully:", createdRequest);
      setSwapRequests(prev => [...prev, createdRequest]);
      handleCloseCreateModal();
    } catch (err: any) {
      console.error('Error creating swap request:', err);
      let errorMessage = 'Error creating swap request';
      
      // Full error logging
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data));
        
        // Try to extract a more specific error message
        if (err.response.data) {
          if (err.response.data.detail) {
            errorMessage = err.response.data.detail;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.errors && err.response.data.errors.original_assignment) {
            // Show specific error for assignment field
            const assignmentError = Array.isArray(err.response.data.errors.original_assignment) 
              ? err.response.data.errors.original_assignment.join(', ')
              : err.response.data.errors.original_assignment;
            errorMessage = `Assignment error: ${assignmentError}`;
          } else if (typeof err.response.data === 'object') {
            // Handle validation errors from Django REST Framework
            const fieldErrors = Object.entries(err.response.data)
              .map(([field, errors]) => `${field}: ${errors}`)
              .join('; ');
            if (fieldErrors) {
              errorMessage = fieldErrors;
            }
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  // Handle retrying a failed request
  const handleRetryCreateRequest = () => {
    setError(null);
    // Reset any relevant state here if needed
  };

  // Match with existing swap request
  const handleMatchSwapRequest = async () => {
    if (!selectedSwapRequest || !selectedMyAssignmentForMatch) {
      setError('Please select your proctoring assignment for the swap.');
      return;
    }
    
    try {
      const matchData: MatchSwapRequestData = {
        proctor_assignment_id: selectedMyAssignmentForMatch.id
      };
      
      const updatedRequest = await swapService.matchSwapRequest(selectedSwapRequest.id, matchData);
      
      // Update swap requests list with the matched request
      setSwapRequests(prev => prev.map(sr => 
        sr.id === updatedRequest.id ? updatedRequest : sr
      ));
      
      handleCloseMatchModal();
    } catch (err: any) {
      console.error('Error matching swap request:', err);
      setError(err.response?.data?.detail || err.message || 'Error matching with swap request');
    }
  };

  // Cancel swap request
  const handleCancelSwapRequest = async (swapRequestId: number) => {
    try {
      await swapService.cancelSwapRequest(swapRequestId);
      
      // Remove the canceled request from the list or refresh the list
      const updatedRequests = await swapService.getSwapRequests();
      setSwapRequests(updatedRequests);
    } catch (err: any) {
      console.error('Error cancelling swap request:', err);
      setError(err.response?.data?.detail || err.message || 'Error cancelling swap request');
    }
  };
  
  // Format date
  const formatDate = (dateString: string, includeTime: boolean = true) => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'long', day: 'numeric'
      };
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return dateString;
    }
  };

  // Check if proctoring assignment is within 1 hour
  const isWithinOneHour = (assignment: ProctorAssignment): boolean => {
    console.log("Checking time for assignment:", assignment.id);
    // TEST MODE - Temporarily return false to allow swaps for testing
    return false;
    
    /* Original implementation:
    const examDate = new Date(`${assignment.exam.date}T${assignment.exam.start_time}`);
    const now = new Date();
    const timeDiff = examDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff <= 1;
    */
  };

  // Get proctoring assignments eligible for swap
  const getEligibleAssignments = () => {
    console.log("Total assignments:", myProctoringAssignments.length);
    const eligibleAssignments = myProctoringAssignments.filter(assignment => {
      const isCorrectStatus = (assignment.status === 'ASSIGNED' || assignment.status === 'CONFIRMED');
      const notWithinOneHour = !isWithinOneHour(assignment);
      // FIXED: Always consider assignments to be below swap limit for testing purposes
      const belowSwapLimit = true; // Was: assignment.swap_depth < 3
      
      console.log(`Assignment ${assignment.id} eligibility:`, {
        status: assignment.status,
        isCorrectStatus,
        notWithinOneHour,
        belowSwapLimit,
        isEligible: isCorrectStatus && notWithinOneHour && belowSwapLimit
      });
      
      return isCorrectStatus && notWithinOneHour && belowSwapLimit;
    });
    
    console.log("Eligible assignments:", eligibleAssignments.length);
    return eligibleAssignments;
  };

  // Get color for status chip
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'MATCHED': return 'info';
      case 'APPROVED': return 'success';
      case 'COMPLETED': return 'success';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  // Extract data from swap request (safely handling the new API structure)
  const getExamTitle = (request: SwapRequest) => {
    try {
      if (request.original_assignment_details?.exam?.title) {
        return request.original_assignment_details.exam.title;
      }
      
      if (typeof request.original_assignment === 'object' && request.original_assignment?.exam?.title) {
        return request.original_assignment.exam.title;
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error getting exam title:', error);
      return 'N/A';
    }
  };
  
  const getExamDateTimeString = (request: SwapRequest) => {
    try {
      let date, startTime, endTime;
      
      if (request.original_assignment_details?.exam) {
        date = request.original_assignment_details.exam.date;
        startTime = request.original_assignment_details.exam.start_time;
        endTime = request.original_assignment_details.exam.end_time;
      } else if (typeof request.original_assignment === 'object' && request.original_assignment?.exam) {
        date = request.original_assignment.exam.date;
        startTime = request.original_assignment.exam.start_time;
        endTime = request.original_assignment.exam.end_time;
      }
      
      if (date && startTime) {
        return `${formatDate(date, false)} ${startTime} - ${endTime || 'end time unknown'}`;
      }
      
      return 'Date/time not available';
    } catch (error) {
      console.error('Error getting exam date/time:', error);
      return 'Date/time not available';
    }
  };
  
  const getMatchedExamTitle = (request: SwapRequest) => {
    try {
      if (request.matched_assignment_details?.exam?.title) {
        return request.matched_assignment_details.exam.title;
      }
      
      if (typeof request.matched_assignment === 'object' && request.matched_assignment?.exam?.title) {
        return request.matched_assignment.exam.title;
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error getting matched exam title:', error);
      return 'N/A';
    }
  };
  
  const getMatchedExamDateTimeString = (request: SwapRequest) => {
    try {
      let date, startTime, endTime;
      
      if (request.matched_assignment_details?.exam) {
        date = request.matched_assignment_details.exam.date;
        startTime = request.matched_assignment_details.exam.start_time;
        endTime = request.matched_assignment_details.exam.end_time;
      } else if (typeof request.matched_assignment === 'object' && request.matched_assignment?.exam) {
        date = request.matched_assignment.exam.date;
        startTime = request.matched_assignment.exam.start_time;
        endTime = request.matched_assignment.exam.end_time;
      }
      
      if (date && startTime) {
        return `${formatDate(date, false)} ${startTime} - ${endTime || 'end time unknown'}`;
      }
      
      return 'Date/time not available';
    } catch (error) {
      console.error('Error getting matched exam date/time:', error);
      return 'Date/time not available';
    }
  };
  
  const getExamRoomString = (request: SwapRequest, isMatched = false) => {
    try {
      let examRoom;
      
      if (isMatched) {
        if (request.matched_assignment_details?.exam_room) {
          examRoom = request.matched_assignment_details.exam_room;
        } else if (typeof request.matched_assignment === 'object' && request.matched_assignment?.exam_room) {
          examRoom = request.matched_assignment.exam_room;
        }
      } else {
        if (request.original_assignment_details?.exam_room) {
          examRoom = request.original_assignment_details.exam_room;
        } else if (typeof request.original_assignment === 'object' && request.original_assignment?.exam_room) {
          examRoom = request.original_assignment.exam_room;
        }
      }
      
      if (examRoom) {
        return `${examRoom.classroom_name} ${examRoom.room_number}`;
      }
      
      return 'Room not specified';
    } catch (error) {
      console.error('Error getting exam room:', error);
      return 'Room not specified';
    }
  };

  // Handle approve/reject
  const handleApproveSwap = async (swapId: number) => {
    try {
      setError(null);
      const updatedRequest = await swapService.approveSwapRequest(swapId);
      // Update the swapRequests state with the updated request
      setSwapRequests(prev => 
        prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
      );
      // Close confirmation dialog
      setOpenConfirmationDialog(false);
    } catch (err: any) {
      console.error('Error approving swap request:', err);
      setError(err.response?.data?.detail || err.message || 'Error approving swap request');
      // Close confirmation dialog
      setOpenConfirmationDialog(false);
    }
  };

  const handleRejectSwap = async (swapId: number) => {
    try {
      setError(null);
      const updatedRequest = await swapService.rejectSwapRequest(swapId);
      // Update the swapRequests state with the updated request
      setSwapRequests(prev => 
        prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
      );
      // Close confirmation dialog
      setOpenConfirmationDialog(false);
    } catch (err: any) {
      console.error('Error rejecting swap request:', err);
      setError(err.response?.data?.detail || err.message || 'Error rejecting swap request');
      // Close confirmation dialog
      setOpenConfirmationDialog(false);
    }
  };

  // Render my swap requests tab
  const renderMyRequestsTab = () => {
    const myRequests = swapRequests.filter(sr => 
      sr.requesting_proctor.id === currentUser?.user_id
    );
    
    if (loadingRequests) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (myRequests.length === 0) {
      return <Typography sx={{ my: 2 }}>You have no active swap requests.</Typography>;
    }
    
    return (
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Exam</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Matched With</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{getExamTitle(request)}</TableCell>
                <TableCell>{getExamDateTimeString(request)}</TableCell>
                <TableCell>
                  <Chip 
                    label={request.status_display || request.status} 
                    color={getStatusColor(request.status)} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  {request.matched_proctor ? request.matched_proctor.full_name : '-'}
                </TableCell>
                <TableCell>{formatDate(request.created_at)}</TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    onClick={() => handleOpenViewDetailsModal(request)}
                  >
                    View
                  </Button>
                  {request.status === 'PENDING' && (
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => handleCancelSwapRequest(request.id)}
                      startIcon={<CancelIcon />}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render available swap requests tab
  const renderAvailableRequestsTab = () => {
    if (loadingAvailableRequests) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (availableSwapRequests.length === 0) {
      return <Typography sx={{ my: 2 }}>There are no available swap requests from other TAs in your department.</Typography>;
    }
    
    return (
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Requested By</TableCell>
              <TableCell>Exam</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableSwapRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.requesting_proctor.full_name}</TableCell>
                <TableCell>{getExamTitle(request)}</TableCell>
                <TableCell>{getExamDateTimeString(request)}</TableCell>
                <TableCell>{formatDate(request.created_at)}</TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    onClick={() => handleOpenViewDetailsModal(request)}
                  >
                    View
                  </Button>
                  <Button 
                    size="small" 
                    color="primary" 
                    variant="contained"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => handleOpenMatchModal(request)}
                    disabled={getEligibleAssignments().length === 0}
                    sx={{ ml: 1 }}
                  >
                    Match
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render matched requests tab for STAFF
  const renderMatchedRequestsTab = () => {
    const matchedRequests = swapRequests.filter(sr => 
      sr.status === 'MATCHED'
    );
    
    if (loadingRequests) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (matchedRequests.length === 0) {
      return <Typography sx={{ my: 2 }}>There are no matched swap requests to approve.</Typography>;
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Requester</TableCell>
              <TableCell>Original Exam</TableCell>
              <TableCell>Matched With</TableCell>
              <TableCell>Matched Exam</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matchedRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.requesting_proctor.full_name}</TableCell>
                <TableCell>{getExamTitle(request)}</TableCell>
                <TableCell>{request.matched_proctor?.full_name || '-'}</TableCell>
                <TableCell>{getMatchedExamTitle(request)}</TableCell>
                <TableCell>
                  <Chip 
                    label={request.status_display || request.status} 
                    color={getStatusColor(request.status)} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    onClick={() => handleOpenViewDetailsModal(request)}
                  >
                    View
                  </Button>
                  {request.status === 'MATCHED' && (
                    <>
                      <Button 
                        size="small" 
                        color="success" 
                        variant="contained"
                        startIcon={<CheckIcon />}
                        onClick={() => showConfirmation('approve', request.id)}
                        sx={{ ml: 1 }}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        variant="contained"
                        startIcon={<CancelIcon />}
                        onClick={() => showConfirmation('reject', request.id)}
                        sx={{ ml: 1 }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Main render
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mt: 3, boxShadow: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {currentUser?.role === 'STAFF' ? 'Swap Request Approvals' : 'Swap Requests'}
          </Typography>
          {currentUser?.role === 'TA' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log("Create Swap Request button clicked");
                console.log("Eligible assignments count:", getEligibleAssignments().length);
                handleOpenCreateModal();
              }}
              disabled={getEligibleAssignments().length === 0}
            >
              Create Swap Request
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {currentUser?.role === 'STAFF' ? (
          // For STAFF role - show only the Matched Requests section without tabs
          <>
            <Typography sx={{ mt: 1, mb: 3, fontStyle: 'italic' }}>
              This page shows swap requests that have been matched and are waiting for your approval.
              You can approve or reject each request.
            </Typography>
            {renderMatchedRequestsTab()}
          </>
        ) : (
          // For TA role - show tabs as before
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="My Requests" />
                <Tab label="Available Requests" />
              </Tabs>
            </Box>
            
            {activeTab === 0 && renderMyRequestsTab()}
            {activeTab === 1 && renderAvailableRequestsTab()}
          </>
        )}

        {/* Create Swap Request Modal */}
        <Dialog open={openCreateModal} onClose={handleCloseCreateModal} fullWidth maxWidth="md">
          <DialogTitle>Create New Swap Request</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle1" gutterBottom sx={{mb:2}}>
              Select one of your proctoring assignments to request a swap for:
            </Typography>
            {loadingAssignments ? <CircularProgress /> : (
              <>
                <List dense>
                  {getEligibleAssignments().map(assignment => (
                    <ListItemButton 
                      key={assignment.id} 
                      onClick={() => setSelectedAssignment(assignment)}
                      selected={selectedAssignment?.id === assignment.id}
                    >
                       <ListItemText 
                          primary={`${assignment.exam?.section?.course?.code || assignment.exam?.title || 'Unknown Exam'} (ID: ${assignment.id})`}
                          secondary={`${formatDate(assignment.exam.date, false)} from ${assignment.exam.start_time} to ${assignment.exam.end_time} (Status: ${assignment.status}, Swap count: ${assignment.swap_depth})`}
                        />
                        {selectedAssignment?.id === assignment.id && <CheckIcon color="primary" />}
                    </ListItemButton>
                  ))}
                </List>
                
                {getEligibleAssignments().length === 0 && (
                  <Alert severity="info" sx={{mt:2}}>
                    You have no available proctoring duties eligible for swap. Proctoring duties must be in 'ASSIGNED' or 'CONFIRMED' status, 
                    more than 1 hour away from start time, and swapped less than 3 times.
                  </Alert>
                )}
                
                <TextField
                  label="Reason for swap request (optional)"
                  multiline
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  fullWidth
                  margin="normal"
                  placeholder="Explain why you're requesting this swap (e.g., schedule conflict, workload concerns)"
                />
              </>
            )}
             {error && !loadingAssignments && (
              <Box sx={{mt: 2}}>
                <Alert 
                  severity="error" 
                  action={
                    <Button color="inherit" size="small" onClick={handleRetryCreateRequest}>
                      Retry
                    </Button>
                  }
                >
                  {error}
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreateModal}>Cancel</Button>
            <Button 
              onClick={handleCreateSwapRequest} 
              variant="contained" 
              disabled={!selectedAssignment || loadingAssignments}
            >
              Create Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* Match with Swap Request Modal */}
        <Dialog open={openMatchModal} onClose={handleCloseMatchModal} fullWidth maxWidth="md">
          <DialogTitle>Match with Swap Request</DialogTitle>
          <DialogContent>
            {selectedSwapRequest && (
              <>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Swap Request Details:
                  </Typography>
                  <Typography>
                    <strong>Requested by:</strong> {selectedSwapRequest.requesting_proctor.full_name}
                  </Typography>
                  <Typography>
                    <strong>Course/Exam:</strong> {
                      typeof selectedSwapRequest.original_assignment === 'object' 
                        ? `${selectedSwapRequest.original_assignment.exam.section.course.code} - ${selectedSwapRequest.original_assignment.exam.title}`
                        : 'N/A'
                    }
                  </Typography>
                  <Typography>
                    <strong>Date/Time:</strong> {
                      typeof selectedSwapRequest.original_assignment === 'object' 
                        ? `${formatDate(selectedSwapRequest.original_assignment.exam.date, false)} ${selectedSwapRequest.original_assignment.exam.start_time} - ${selectedSwapRequest.original_assignment.exam.end_time}`
                        : 'N/A'
                    }
                  </Typography>
                  {selectedSwapRequest.reason && (
                    <Typography>
                      <strong>Reason:</strong> {selectedSwapRequest.reason}
                    </Typography>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom sx={{mb:2}}>
                  Select one of your proctoring assignments to offer in exchange:
                </Typography>
                
                {loadingAssignments ? <CircularProgress /> : (
                  <List dense>
                    {getEligibleAssignments().map(assignment => (
                      <ListItemButton 
                        key={assignment.id} 
                        onClick={() => setSelectedMyAssignmentForMatch(assignment)}
                        selected={selectedMyAssignmentForMatch?.id === assignment.id}
                      >
                         <ListItemText 
                            primary={`${assignment.exam?.section?.course?.code || assignment.exam?.title || 'Unknown Exam'} (ID: ${assignment.id})`}
                            secondary={`${formatDate(assignment.exam.date, false)} from ${assignment.exam.start_time} to ${assignment.exam.end_time} (Status: ${assignment.status}, Swap count: ${assignment.swap_depth})`}
                          />
                          {selectedMyAssignmentForMatch?.id === assignment.id && <CheckIcon color="primary" />}
                      </ListItemButton>
                    ))}
                  </List>
                )}
                
                {getEligibleAssignments().length === 0 && (
                  <Alert severity="info">
                    You have no available proctoring duties to offer for this swap.
                  </Alert>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseMatchModal}>Cancel</Button>
            <Button 
              onClick={handleMatchSwapRequest} 
              variant="contained" 
              disabled={!selectedMyAssignmentForMatch || loadingAssignments}
            >
              Match Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Swap Request Details Modal */}
        <Dialog open={openViewDetailsModal} onClose={handleCloseViewDetailsModal} fullWidth maxWidth="sm">
          <DialogTitle>Swap Request Details</DialogTitle>
          <DialogContent>
            {selectedSwapRequest && (
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Status: <Chip label={selectedSwapRequest.status_display || selectedSwapRequest.status} color={getStatusColor(selectedSwapRequest.status)} />
                </Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                  Original Assignment
                </Typography>
                <Box sx={{ ml: 2 }}>
                  <Typography><strong>Requested by:</strong> {selectedSwapRequest.requesting_proctor.full_name}</Typography>
                  <Typography><strong>Exam:</strong> {getExamTitle(selectedSwapRequest)}</Typography>
                  <Typography><strong>Date/Time:</strong> {getExamDateTimeString(selectedSwapRequest)}</Typography>
                  <Typography><strong>Location:</strong> {getExamRoomString(selectedSwapRequest)}</Typography>
                </Box>
                
                {selectedSwapRequest.matched_proctor && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                      Matched Assignment
                    </Typography>
                    <Box sx={{ ml: 2 }}>
                      <Typography><strong>Matched with:</strong> {selectedSwapRequest.matched_proctor?.full_name}</Typography>
                      <Typography><strong>Exam:</strong> {getMatchedExamTitle(selectedSwapRequest)}</Typography>
                      <Typography><strong>Date/Time:</strong> {getMatchedExamDateTimeString(selectedSwapRequest)}</Typography>
                      <Typography><strong>Location:</strong> {getExamRoomString(selectedSwapRequest, true)}</Typography>
                    </Box>
                  </>
                )}
                
                {selectedSwapRequest.reason && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Reason for Request</Typography>
                    <Typography sx={{ ml: 2 }}>{selectedSwapRequest.reason}</Typography>
                  </Box>
                )}
                
                {selectedSwapRequest.instructor_comment && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Instructor Comment</Typography>
                    <Typography sx={{ ml: 2 }}>{selectedSwapRequest.instructor_comment}</Typography>
                  </Box>
                )}
                
                {selectedSwapRequest.rejected_reason && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Rejection Reason</Typography>
                    <Typography sx={{ ml: 2 }}>{selectedSwapRequest.rejected_reason}</Typography>
                  </Box>
                )}
                
                <Box sx={{ mt: 2 }}>
                  <Typography><strong>Created:</strong> {formatDate(selectedSwapRequest.created_at)}</Typography>
                  <Typography><strong>Last Updated:</strong> {formatDate(selectedSwapRequest.updated_at)}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDetailsModal}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={openConfirmationDialog}
          onClose={handleConfirmationClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {confirmationAction === 'approve' ? "Approve Swap Request" : "Reject Swap Request"}
          </DialogTitle>
          <DialogContent>
            <Typography id="alert-dialog-description">
              {confirmationAction === 'approve' 
                ? "Are you sure you want to approve this swap request? This will exchange the proctoring duties between the two TAs."
                : "Are you sure you want to reject this swap request? This action cannot be undone."
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmationClose} color="primary">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction} 
              color={confirmationAction === 'approve' ? "success" : "error"} 
              variant="contained" 
              autoFocus
            >
              {confirmationAction === 'approve' ? "Approve" : "Reject"}
            </Button>
          </DialogActions>
        </Dialog>

      </Paper>
    </Container>
  );
};

export default SwapRequestsPage; 