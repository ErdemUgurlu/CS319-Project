import api from './api';

export interface WeeklyScheduleEntry {
  id: number;
  day: string; // Three-letter code (MON, TUE, etc)
  day_display?: string; // Full day name (optional, for display)
  start_time: string;
  end_time: string;
  description: string;
}

// Check if we're using the correct API endpoint
const WEEKLY_SCHEDULE_ENDPOINT = '/accounts/weekly-schedule/';

const scheduleService = {
  // Get my weekly schedule
  getMySchedule: async (): Promise<WeeklyScheduleEntry[]> => {
    try {
      console.log(`Fetching schedule from API endpoint: ${WEEKLY_SCHEDULE_ENDPOINT}`);
      
      // Check for token before making request
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No authentication token available when trying to fetch schedule');
        throw new Error('Authentication required');
      }
      
      // Log authentication status
      console.log('Using authentication token:', token.substring(0, 15) + '...');
      
      const response = await api.get(WEEKLY_SCHEDULE_ENDPOINT);
      console.log('API response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      // If we get a response that's not an array, handle it appropriately
      if (!Array.isArray(response.data)) {
        console.error('Unexpected response format, expected array but got:', typeof response.data);
        return [];
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error getting schedule:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request was sent but no response received' : 'Request failed to send'
      });
      throw error;
    }
  },
  
  // Test API connection (using user profile endpoint as it's simpler)
  testApiConnection: async (): Promise<any> => {
    try {
      // First check the current user info from token
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      try {
        // Decode token to get user info
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const tokenData = JSON.parse(atob(base64));
        
        console.log('Token payload:', tokenData);
        
        // Check user role specifically
        const userRole = tokenData.role || 'UNKNOWN';
        console.log('User role from token:', userRole);
        
        if (userRole !== 'TA' && userRole !== 'ADMIN' && userRole !== 'STAFF' && userRole !== 'INSTRUCTOR') {
          console.warn('User role may not have permission for schedule: ', userRole);
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
      
      // Test with user profile, which is a much simpler endpoint
      console.log('Testing API connection with user profile endpoint...');
      const profileResponse = await api.get('/accounts/profile/');
      console.log('Profile API response:', profileResponse.data);
      
      // Test weekly schedule endpoint specifically
      console.log(`Testing weekly schedule endpoint: ${WEEKLY_SCHEDULE_ENDPOINT}`);
      try {
        const scheduleResponse = await api.get(WEEKLY_SCHEDULE_ENDPOINT);
        console.log('Schedule API response:', scheduleResponse.data);
        return {
          profile: profileResponse.data,
          schedule: scheduleResponse.data,
          success: true
        };
      } catch (error: any) {
        console.error('Schedule API error:', error.response?.status, error.response?.data);
        
        // Return profile data even if schedule fails
        return {
          profile: profileResponse.data,
          scheduleError: {
            status: error.response?.status,
            message: error.response?.data?.detail || error.message
          },
          success: false
        };
      }
    } catch (error: any) {
      console.error('API connection test failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request was sent but no response received' : 'Request failed to send'
      });
      throw error;
    }
  },
  
  // Create a new schedule entry
  createScheduleEntry: async (data: Omit<WeeklyScheduleEntry, 'id' | 'day_display'>): Promise<WeeklyScheduleEntry> => {
    try {
      console.log('Creating schedule entry with data:', data);
      const response = await api.post(WEEKLY_SCHEDULE_ENDPOINT, data);
      console.log('API response for create:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      throw error;
    }
  },
  
  // Update an existing schedule entry
  updateScheduleEntry: async (id: number, data: Omit<WeeklyScheduleEntry, 'id' | 'day_display'>): Promise<WeeklyScheduleEntry> => {
    try {
      console.log(`Updating schedule entry ${id} with data:`, data);
      const response = await api.put(`${WEEKLY_SCHEDULE_ENDPOINT}${id}/`, data);
      console.log('API response for update:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating schedule entry ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a schedule entry
  deleteScheduleEntry: async (id: number): Promise<void> => {
    try {
      console.log(`Deleting schedule entry ${id}`);
      await api.delete(`${WEEKLY_SCHEDULE_ENDPOINT}${id}/`);
      console.log(`Successfully deleted entry ${id}`);
    } catch (error) {
      console.error(`Error deleting schedule entry ${id}:`, error);
      throw error;
    }
  },
  
  // Get course options for schedule
  getCourseOptions: async (): Promise<string[]> => {
    try {
      const response = await api.get('/accounts/schedule/course-options/');
      return response.data;
    } catch (error) {
      console.error('Error fetching schedule course options:', error);
      throw error;
    }
  },
  
  // Verify API access - for debugging purposes
  verifyApiAccess: async (): Promise<boolean> => {
    try {
      // Simple endpoint that should always work if API is accessible
      const response = await api.get('/health-check/');
      console.log('API health check result:', response.data);
      return true;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
};

export default scheduleService; 
