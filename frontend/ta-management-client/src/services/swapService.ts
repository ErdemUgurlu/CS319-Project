import api from './api';
import { ProctorAssignment } from './proctoringService';

export interface SwapRequest {
  id: number;
  original_assignment: number | ProctorAssignment;
  original_assignment_details?: {
    id: number;
    status: string;
    is_paid: boolean;
    swap_depth: number;
    exam: {
      id: number;
      title: string;
      date: string;
      start_time: string;
      end_time: string;
      section?: {
        id: number;
        course: {
          id: number;
          code: string;
          title: string;
        };
        section_number: string;
      } | null;
    };
    exam_room?: {
      classroom_name: string;
      room_number: string;
    } | null;
  } | null;
  requesting_proctor: {
    id: number;
    email: string;
    full_name: string;
  };
  matched_proctor?: {
    id: number;
    email: string;
    full_name: string;
  } | null;
  matched_assignment?: number | ProctorAssignment | null;
  matched_assignment_details?: {
    id: number;
    status: string;
    is_paid: boolean;
    swap_depth: number;
    exam: {
      id: number;
      title: string;
      date: string;
      start_time: string;
      end_time: string;
      section?: {
        id: number;
        course: {
          id: number;
          code: string;
          title: string;
        };
        section_number: string;
      } | null;
    };
    exam_room?: {
      classroom_name: string;
      room_number: string;
    } | null;
  } | null;
  reason?: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  instructor_comment?: string;
  rejected_reason?: string;
}

export interface CreateSwapRequestData {
  original_assignment: number;
  reason?: string;
}

export interface MatchSwapRequestData {
  proctor_assignment_id: number;
}

export interface ApproveSwapRequestData {
  comment?: string;
}

const swapService = {
  /**
   * Get all swap requests relevant to the current user
   */
  getSwapRequests: async (): Promise<SwapRequest[]> => {
    try {
      const response = await api.get('/proctoring/swap-requests/');
      return response.data;
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific swap request by ID
   */
  getSwapRequest: async (id: number): Promise<SwapRequest> => {
    try {
      const response = await api.get(`/proctoring/swap-requests/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching swap request #${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new swap request
   */
  createSwapRequest: async (data: CreateSwapRequestData): Promise<SwapRequest> => {
    try {
      console.log("Creating swap request with data:", data);
      
      // Validate the assignment ID before sending to the server
      if (!data.original_assignment || isNaN(Number(data.original_assignment))) {
        throw new Error(`Invalid assignment ID: ${data.original_assignment}. Please select a valid assignment.`);
      }
      
      // Add extra data verification to ensure data is formatted correctly
      const validatedData: CreateSwapRequestData = {
        original_assignment: Number(data.original_assignment), // Ensure it's a number
        reason: data.reason || "" // Ensure reason is at least an empty string
      };
      
      console.log("Validated data:", validatedData);
      const response = await api.post('/proctoring/swap-requests/', validatedData);
      console.log("Swap request created successfully:", response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating swap request:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  },
  
  /**
   * Cancel a swap request
   */
  cancelSwapRequest: async (id: number): Promise<void> => {
    try {
      await api.delete(`/proctoring/swap-requests/${id}/`);
    } catch (error) {
      console.error(`Error cancelling swap request #${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Match with an existing swap request (for TAs)
   */
  matchSwapRequest: async (id: number, data: MatchSwapRequestData): Promise<SwapRequest> => {
    try {
      const response = await api.post(`/proctoring/swap-requests/${id}/match/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error matching with swap request #${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Approve a swap request (for instructors)
   */
  approveSwapRequest: async (id: number, data: ApproveSwapRequestData = {}): Promise<SwapRequest> => {
    try {
      const response = await api.post(`/proctoring/swap-requests/${id}/approve/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error approving swap request #${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Reject a swap request (for instructors)
   */
  rejectSwapRequest: async (id: number, data: ApproveSwapRequestData = {}): Promise<SwapRequest> => {
    try {
      const response = await api.post(`/proctoring/swap-requests/${id}/reject/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error rejecting swap request #${id}:`, error);
      throw error;
    }
  },
};

export default swapService; 