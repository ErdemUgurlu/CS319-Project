import api from './api';

// Interface for leave type
export interface LeaveType {
  id: number;
  name: string;
  description: string;
  requires_documentation: boolean;
}

// Interface for leave request with basic information
export interface LeaveRequest {
  id: number;
  ta: number;
  ta_name: string;
  leave_type: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  status: string;
  status_display: string;
  created_at: string;
  duration_days: number;
}

// Interface for leave request with detailed information
export interface LeaveRequestDetail extends LeaveRequest {
  reason: string;
  documentation: string | null;
  updated_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

// Interface for creating a leave request
export interface LeaveRequestCreate {
  leave_type: number;
  start_date: string;
  end_date: string;
  reason: string;
  documentation?: File | null;
}

// Interface for updating a leave request
export interface LeaveRequestUpdate {
  leave_type?: number;
  start_date?: string;
  end_date?: string;
  reason?: string;
  documentation?: File | null;
}

// Interface for reviewing a leave request
export interface LeaveRequestReview {
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
}

// Get all leave types
export const getLeaveTypes = async (): Promise<LeaveType[]> => {
  try {
    console.log('Fetching leave types...');
    const response = await api.get('/leaves/types/');
    console.log('Leave types API response:', response.data);
    
    if (!response.data) {
      console.warn('API returned empty response for leave types');
      return [];
    }
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      // If it's already an array, use it directly
      return response.data;
    } else if (typeof response.data === 'object') {
      // If it's an object, check if it has results property
      if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      
      // If it has a nested data property
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Try to extract all values from the object if they look like leave types
      const possibleTypes = Object.values(response.data);
      if (possibleTypes.length > 0 && possibleTypes[0] && typeof possibleTypes[0] === 'object' && 'id' in possibleTypes[0]) {
        return possibleTypes as LeaveType[];
      }
      
      console.warn('API returned object but could not extract leave types:', response.data);
      return [];
    }
    
    console.warn('API did not return an array or object for leave types, got:', typeof response.data);
    return [];
  } catch (error) {
    console.error('Error fetching leave types:', error);
    
    // Try to retrieve from localStorage as a fallback
    try {
      const cachedTypes = localStorage.getItem('leave_types');
      if (cachedTypes) {
        console.log('Using cached leave types due to API error');
        const parsedTypes = JSON.parse(cachedTypes);
        return Array.isArray(parsedTypes) ? parsedTypes : [];
      }
    } catch (e) {
      console.error('Error retrieving cached leave types:', e);
    }
    
    // Return an empty array in case of error
    return [];
  }
};

// Get leave requests for the authenticated TA
export const getMyLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    console.log('Making API request to /leaves/my-requests/');
    const response = await api.get('/leaves/my-requests/');
    console.log('API response for my leave requests:', response);
    
    if (!response.data) {
      console.warn('API returned empty response for my leave requests');
      return [];
    }
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      // If it's already an array, use it directly
      console.log('API returned array for my leave requests:', response.data);
      return response.data;
    } else if (typeof response.data === 'object') {
      // If it's an object, check if it has results property (common pagination format)
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log('API returned paginated results for my leave requests:', response.data.results);
        return response.data.results;
      }
      
      // If it has a nested data property
      if (response.data.data && Array.isArray(response.data.data)) {
        console.log('API returned nested data property for my leave requests:', response.data.data);
        return response.data.data;
      }
      
      // Try to extract all values from the object if they look like leave requests
      const possibleRequests = Object.values(response.data);
      if (possibleRequests.length > 0 && possibleRequests[0] && typeof possibleRequests[0] === 'object' && 'id' in possibleRequests[0]) {
        console.log('Extracted leave requests from object:', possibleRequests);
        return possibleRequests as LeaveRequest[];
      }
      
      console.warn('API returned object but could not extract leave requests:', response.data);
      return [];
    }
    
    console.warn('API did not return an array or object for my leave requests, got:', typeof response.data);
    return [];
  } catch (error) {
    console.error('Error fetching my leave requests:', error);
    
    // Try to retrieve from localStorage as a fallback
    try {
      const cachedRequests = localStorage.getItem('ta_leave_requests');
      if (cachedRequests) {
        console.log('Using cached leave requests due to API error');
        const parsedRequests = JSON.parse(cachedRequests);
        return Array.isArray(parsedRequests) ? parsedRequests : [];
      }
    } catch (e) {
      console.error('Error retrieving cached leave requests:', e);
    }
    
    // Return an empty array in case of error
    return [];
  }
};

// Get leave requests for TAs assigned to the authenticated instructor
export const getInstructorLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    console.log('Making API request to /leaves/instructor/requests/');
    const response = await api.get('/leaves/instructor/requests/');
    console.log('API response for instructor leave requests:', response);
    
    if (!response.data) {
      console.warn('API returned empty response for instructor leave requests');
      return [];
    }
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      // If it's already an array, use it directly
      console.log('API returned array for instructor leave requests:', response.data);
      return response.data;
    } else if (typeof response.data === 'object') {
      // If it's an object, check if it has results property (common pagination format)
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log('API returned paginated results for instructor leave requests:', response.data.results);
        return response.data.results;
      }
      
      // If it has a nested data property
      if (response.data.data && Array.isArray(response.data.data)) {
        console.log('API returned nested data property for instructor leave requests:', response.data.data);
        return response.data.data;
      }
      
      // Try to extract all values from the object if they look like leave requests
      const possibleRequests = Object.values(response.data);
      if (possibleRequests.length > 0 && possibleRequests[0] && typeof possibleRequests[0] === 'object' && 'id' in possibleRequests[0]) {
        console.log('Extracted instructor leave requests from object:', possibleRequests);
        return possibleRequests as LeaveRequest[];
      }
      
      console.warn('API returned object but could not extract instructor leave requests:', response.data);
      return [];
    }
    
    console.warn('API did not return an array or object for instructor leave requests, got:', typeof response.data);
    return [];
  } catch (error) {
    console.error('Error fetching instructor leave requests:', error);
    // Return an empty array in case of error
    return [];
  }
};

// Get leave request details by ID
export const getLeaveRequestById = async (id: number): Promise<LeaveRequestDetail> => {
  const response = await api.get(`/leaves/requests/${id}/`);
  return response.data;
};

// Create a new leave request
export const createLeaveRequest = async (data: LeaveRequestCreate): Promise<LeaveRequest> => {
  // If there's a file to upload, use FormData
  if (data.documentation) {
    const formData = new FormData();
    formData.append('leave_type', data.leave_type.toString());
    formData.append('start_date', data.start_date);
    formData.append('end_date', data.end_date);
    formData.append('reason', data.reason);
    formData.append('documentation', data.documentation);
    
    const response = await api.post('/leaves/my-requests/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    const response = await api.post('/leaves/my-requests/', data);
    return response.data;
  }
};

// Update an existing leave request
export const updateLeaveRequest = async (id: number, data: LeaveRequestUpdate): Promise<LeaveRequestDetail> => {
  // If there's a file to upload, use FormData
  if (data.documentation) {
    const formData = new FormData();
    if (data.leave_type) formData.append('leave_type', data.leave_type.toString());
    if (data.start_date) formData.append('start_date', data.start_date);
    if (data.end_date) formData.append('end_date', data.end_date);
    if (data.reason) formData.append('reason', data.reason);
    formData.append('documentation', data.documentation);
    
    const response = await api.patch(`/leaves/requests/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    const response = await api.patch(`/leaves/requests/${id}/`, data);
    return response.data;
  }
};

// Cancel a leave request
export const cancelLeaveRequest = async (id: number): Promise<void> => {
  await api.delete(`/leaves/requests/${id}/`);
};

// Review (approve/reject) a leave request
export const reviewLeaveRequest = async (id: number, data: LeaveRequestReview): Promise<{ message: string; status: string }> => {
  const response = await api.post(`/leaves/requests/${id}/review/`, data);
  return response.data;
}; 