import api from './api';
import axiosInstance from './api';
import API_URL from './api';

export interface ProctorAssignment {
  id: number;
  exam: {
    id: number;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    section: {
      course: {
        code: string;
        title: string;
      };
      section_number: string;
    };
  };
  exam_room: {
    classroom_name: string;
    room_number: string;
  };
  status: string;
  swap_depth: number;
}

export interface EligibleProctor {
  id: number;
  email: string;
  full_name: string;
  academic_level: string;
  is_eligible: boolean;
  current_workload: number;
  employment_type: string;
  is_assigned_to_current_exam?: boolean;
  is_teaching_course_sections?: boolean;
  details: {
    constraints: {
      type: string;
      message: string;
    }[];
    workload: {
      current: number;
      after_swap: number;
      cap: number;
    };
    is_cross_department: boolean;
  };
}

export interface SwapRequestData {
  original_assignment_id: number;
  requested_proctor_id: number;
  reason: string;
}

export interface SwapResponse {
  message: string;
  swap_request_id: number;
  details?: any;
}

export interface SwapRequest {
  id: number;
  original_assignment: ProctorAssignment;
  requesting_proctor: {
    id: number;
    email: string;
    full_name: string;
  };
  requested_proctor: {
    id: number;
    email: string;
    full_name: string;
  };
  reason: string;
  status: string;
  created_at: string;
  rejection_reason?: string;
}

// --- Interface for the payload of assignProctorsToExam --- 
export interface AssignProctorsPayload {
  assignment_type: 'MANUAL'; // Currently only manual is supported by frontend
  manual_proctors: number[];
  replace_existing: boolean;
  is_paid: boolean;
}
// --- End Interface --- 

// --- Interface for the payload of autoAssignProctorsToExam ---
export interface AutoAssignProctorsPayload {
  assignment_type: 'AUTOMATIC'; // This will be the new type for auto assignment
  proctor_ids: number[];       // IDs of TAs selected by frontend suggestion + user approval
  replace_existing: boolean;
  is_paid: boolean;
}
// --- End Interface ---

const proctoringService = {
  // Get all my proctoring assignments
  getMyProctorings: async (): Promise<ProctorAssignment[]> => {
    try {
      const response = await api.get('/proctoring/my-proctorings/');
      return response.data;
    } catch (error) {
      console.error('Error fetching proctoring assignments:', error);
      throw error;
    }
  },

  // Get eligible proctors for swap
  getEligibleProctors: async (assignmentId: number): Promise<EligibleProctor[]> => {
    try {
      const response = await api.get(`/proctoring/eligible-proctors/${assignmentId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching eligible proctors:', error);
      throw error;
    }
  },

  // Request a swap
  requestSwap: async (data: SwapRequestData): Promise<SwapResponse> => {
    try {
      const response = await api.post('/proctoring/swap-request/', data);
      return response.data;
    } catch (error) {
      console.error('Error requesting swap:', error);
      throw error;
    }
  },

  // Accept an existing swap request
  acceptSwap: async (swapRequestId: number): Promise<SwapResponse> => {
    try {
      const response = await api.post(`/proctoring/accept-swap/${swapRequestId}/`);
      return response.data;
    } catch (error) {
      console.error('Error accepting swap request:', error);
      throw error;
    }
  },

  // Get swap history
  getSwapHistory: async (): Promise<SwapRequest[]> => {
    try {
      const response = await api.get('/proctoring/swap-history/');
      return response.data;
    } catch (error) {
      console.error('Error fetching swap history:', error);
      throw error;
    }
  },

  // Confirm assignment
  confirmAssignment: async (assignmentId: number): Promise<any> => {
    try {
      const response = await api.post(`/proctoring/confirm-assignment/${assignmentId}/`);
      return response.data;
    } catch (error) {
      console.error('Error confirming assignment:', error);
      throw error;
    }
  },

  // Reject assignment
  rejectAssignment: async (assignmentId: number): Promise<any> => {
    try {
      const response = await api.delete(`/proctoring/reject-assignment/${assignmentId}/`);
      return response.data;
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      throw error;
    }
  },

  // Get upcoming exams that need proctors (for staff and instructors)
  getUpcomingExams: async (): Promise<any> => {
    try {
      console.log("Making API call to get exams");
      const response = await api.get('/proctoring/exams/');
      console.log("API response for exams:", response);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching upcoming exams:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Get eligible TAs for an exam (for instructors)
  getEligibleProctorsForExam: async (
    examId: number,
    overrideAcademicLevel?: boolean,
    overrideConsecutiveProctoring?: boolean
  ): Promise<EligibleProctor[]> => {
    try {
      let baseUrlString = '';
      if (axiosInstance.defaults.baseURL) {
        baseUrlString = axiosInstance.defaults.baseURL;
      } else {
        // FALLBACK: You NEED to replace this with your actual API base URL string
        // For example, if it was a named export: import { THE_ACTUAL_API_URL } from './api';
        // baseUrlString = THE_ACTUAL_API_URL;
        // Or if it's hardcoded for now (not ideal):
        baseUrlString = 'http://localhost:8000/api'; 
        console.warn('ProctoringService: API_URL not found in axiosInstance.defaults.baseURL, using fallback. Please configure properly.');
      }

      // Ensure baseUrlString doesn't cause double slashes if it already ends with one
      const cleanedBaseUrl = baseUrlString.endsWith('/') ? baseUrlString.slice(0, -1) : baseUrlString;
      let url = `${cleanedBaseUrl}/proctoring/exams/${examId}/eligible-tas/`;
      
      const params = new URLSearchParams();

      if (overrideAcademicLevel !== undefined) {
        params.append('override_academic_level', String(overrideAcademicLevel));
      }
      if (overrideConsecutiveProctoring !== undefined) {
        params.append('override_consecutive_proctoring', String(overrideConsecutiveProctoring));
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log('ProctoringService: Requesting eligible TAs with URL:', url);
      
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (err: any) {
      console.error("ProctoringService: Error fetching eligible TAs for exam:", err.message || err);
      throw err;
    }
  },

  // Assign proctors to an exam (for instructors)
  assignProctorsToExam: async (examId: number, payload: AssignProctorsPayload): Promise<any> => {
    try {
      const response = await api.post(`/proctoring/exams/${examId}/assign-proctors/`, payload);
      return response.data;
    } catch (error) {
      console.error('Error assigning proctors to exam:', error);
      throw error;
    }
  },

  // --- NEW: Auto-assign proctors to an exam ---
  autoAssignProctorsToExam: async (examId: number, payload: AutoAssignProctorsPayload): Promise<any> => {
    try {
      // The endpoint '/proctoring/exams/${examId}/auto-assign-proctors/' is an example.
      // This needs to match the actual backend API endpoint.
      const response = await api.post(`/proctoring/exams/${examId}/auto-assign-proctors/`, payload);
      return response.data;
    } catch (error) {
      console.error('Error auto-assigning proctors to exam:', error);
      throw error;
    }
  },
  // --- END NEW ---

  // Create a new exam (for instructors)
  createExam: async (examData: any): Promise<any> => {
    try {
      const response = await api.post('/proctoring/exams/', examData);
      return response.data;
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  },

  // Get proctoring statistics
  getProctorStats: async (): Promise<any> => {
    try {
      const response = await api.get('/proctoring/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching proctoring statistics:', error);
      throw error;
    }
  }
};

export default proctoringService; 