import api from './api';
import { EnhancedTA, TAProfile, User } from '../interfaces/user';
import { TAAssignment } from '../interfaces/user';

interface TAProfileUpdate {
  undergrad_university?: string;
  supervisor?: number | null;
  workload_number?: number | null;
  schedule_json?: Record<string, any> | null;
}

class TAService {
  // Get all TAs (with filtering options)
  async getAllTAs(filters?: { department?: string, academic_level?: string, employment_type?: string }): Promise<EnhancedTA[]> {
    try {
      let url = '/accounts/tas/';
      
      // Add query parameters if filters are provided
      if (filters) {
        const params = new URLSearchParams();
        if (filters.department) params.append('department', filters.department);
        if (filters.academic_level) params.append('academic_level', filters.academic_level);
        if (filters.employment_type) params.append('employment_type', filters.employment_type);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await api.get(url);
      // Handle paginated or direct array response
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results as EnhancedTA[];
      } else if (response.data && Array.isArray(response.data)) {
        return response.data as EnhancedTA[];
      }
      console.warn('Unexpected TAs response structure:', response.data);
      return []; // Return empty array if data is not in expected format
    } catch (error) {
      console.error('Error fetching TAs:', error);
      throw error;
    }
  }
  
  // Get TA detail with profile information
  async getTADetail(taId: number) {
    try {
      const response = await api.get(`/accounts/users/${taId}/`);
      return response.data as EnhancedTA;
    } catch (error) {
      console.error(`Error fetching TA detail for ID ${taId}:`, error);
      throw error;
    }
  }
  
  // Get TA profile
  async getTAProfile(taId: number) {
    try {
      const response = await api.get(`/accounts/tas/${taId}/profile/`);
      return response.data as TAProfile;
    } catch (error) {
      console.error(`Error fetching TA profile for ID ${taId}:`, error);
      throw error;
    }
  }
  
  // Update TA profile
  async updateTAProfile(taId: number, profileData: TAProfileUpdate) {
    try {
      const response = await api.patch(`/accounts/tas/${taId}/profile/`, profileData);
      return response.data as TAProfile;
    } catch (error) {
      console.error(`Error updating TA profile for ID ${taId}:`, error);
      throw error;
    }
  }
  
  // Get weekly schedule for a TA
  async getTASchedule(taId: number) {
    try {
      const response = await api.get(`/accounts/weekly-schedule/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching schedule for TA ID ${taId}:`, error);
      throw error;
    }
  }
  
  // Get TAs assigned to the current instructor
  async getMyTAs() {
    try {
      const response = await api.get('/accounts/instructor/tas/');
      return response.data;
    } catch (error) {
      console.error('Error fetching assigned TAs:', error);
      throw error;
    }
  }
  
  // Get available (unassigned) TAs
  async getAvailableTAs() {
    try {
      const response = await api.get('/accounts/instructor/available-tas/');
      return response.data;
    } catch (error) {
      console.error('Error fetching available TAs:', error);
      throw error;
    }
  }
  
  // Assign a TA to the current instructor
  async assignTA(taId: number) {
    try {
      const response = await api.post('/accounts/instructor/assign-ta/', { ta: taId });
      return response.data;
    } catch (error) {
      console.error(`Error assigning TA ID ${taId}:`, error);
      throw error;
    }
  }
  
  // Remove a TA assignment
  async removeTA(taId: number) {
    try {
      const response = await api.post('/accounts/instructor/remove-ta/', { ta: taId });
      return response.data;
    } catch (error) {
      console.error(`Error removing TA ID ${taId} assignment:`, error);
      throw error;
    }
  }

  // Assign a TA to a specific course section
  async assignTaToSection(taId: number, sectionId: number): Promise<TAAssignment> {
    try {
      const response = await api.post('/accounts/ta-assignments/', { ta_id: taId, section_id: sectionId });
      return response.data as TAAssignment;
    } catch (error) {
      console.error(`Error assigning TA ID ${taId} to Section ID ${sectionId}:`, error);
      // Consider re-throwing or returning a more specific error object
      throw error;
    }
  }
}

export default new TAService(); 