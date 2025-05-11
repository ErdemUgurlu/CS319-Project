import api from './api';

export interface User {
  id: number;
  full_name: string;
  email: string;
}

export interface Task {
  id?: number;
  title: string;
  description: string;
  deadline?: string;
  due_date?: string;
  status: string;
  assignee?: User | null;
  creator?: User | null;
  assigned_to?: number | null;
  created_by?: number;
  course?: number | null;
  section?: number | null;
  credit_hours?: number;
  completion?: TaskCompletion;
  review?: TaskReview;
  priority?: string;
}

export interface TaskCompletion {
  id?: number;
  task: number;
  completion_note: string;
  hours_spent: number;
  completed_at: string;
}

export interface TaskReview {
  id?: number;
  task: number;
  is_approved: boolean;
  feedback: string;
  reviewed_at: string;
}

export interface CompleteTaskData {
  completion_note: string;
  hours_spent: number;
}

export interface ReviewTaskData {
  is_approved: boolean;
  feedback: string;
}

export interface TAAssignment {
  id: number;
  ta: any;
  assigned_at: string;
}

export interface TAWorkload {
  ta_id: number;
  current_workload: number;
  workload_cap: number;
  workload_percentage: number;
}

export interface EnhancedTA {
  id: number;
  ta_full_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  ta_email?: string;
  email?: string;
  department?: string;
  ta_employment_type?: string;
  employment_type?: string;
  employment_type_display?: string;
  current_workload?: number;
  workload_cap?: number;
  workload_percentage?: number;
  assignment_id?: number;
  assigned_date?: string;
}

class TaskService {
  // Get all tasks or tasks for a specific TA if user is TA
  async getTasks() {
    try {
      console.log('Fetching tasks from:', '/tasks/my-tasks/');
      const response = await api.get('/tasks/my-tasks/');
      console.log('Tasks API response:', response);
      
      // Check if response data is valid and transform if needed
      if (response.data && typeof response.data === 'object') {
        // If response is an object with a 'tasks' property, return that
        if (Array.isArray(response.data.tasks)) {
          return { data: response.data.tasks };
        }
        // If response is already an array, return it
        if (Array.isArray(response.data)) {
          return { data: response.data };
        }
        // If response is not in expected format, return empty array
        console.warn('Unexpected API response format:', response.data);
        return { data: [] };
      }
      return { data: [] };
    } catch (error: any) {
      console.error('Error in getTasks:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received, request details:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  }
  
  // Get a specific task by ID
  async getTask(id: number) {
    return await api.get(`/tasks/task/${id}/`);
  }
  
  // Create a new task
  async createTask(taskData: Task) {
    // Format date correctly - ensure it's in ISO format
    const formattedDate = taskData.deadline ? new Date(taskData.deadline).toISOString() : null;
    
    // Convert frontend field names to match backend expectations
    const backendTaskData = {
      ...taskData,
      // Format date properly
      due_date: formattedDate,
      // Set default priority if not provided
      priority: taskData.priority || 'MEDIUM'
    };
    
    // Remove frontend-specific fields that backend doesn't expect
    delete backendTaskData.deadline;
    delete backendTaskData.created_by;
    delete backendTaskData.course;
    
    // Log the data being sent to backend
    console.log('Creating task with data:', backendTaskData);
    console.log('Sending task creation request to:', '/tasks/create-task/');
    
    try {
      const response = await api.post('/tasks/create-task/', backendTaskData);
      console.log('Task creation response:', response);
      return response;
    } catch (error: any) {
      console.error('Error creating task:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received, request details:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  }
  
  // Update an existing task
  async updateTask(id: number, taskData: Task) {
    // Format date correctly - ensure it's in ISO format
    const formattedDate = taskData.deadline ? new Date(taskData.deadline).toISOString() : null;
    
    // Convert frontend field names to match backend expectations
    const backendTaskData = {
      ...taskData,
      // Format date properly
      due_date: formattedDate,
      // Keep assigned_to as is
      // Set default priority if not provided
      priority: taskData.priority || 'MEDIUM'
    };
    
    // Remove frontend-specific fields that backend doesn't expect
    delete backendTaskData.deadline;
    delete backendTaskData.created_by;
    delete backendTaskData.course;
    
    console.log('Updating task with data:', backendTaskData);
    
    try {
      return await api.put(`/tasks/task/${id}/`, backendTaskData);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }
  
  // Delete a task
  async deleteTask(id: number) {
    return await api.delete(`/tasks/task/${id}/`);
  }
  
  // Update task status only
  async updateTaskStatus(id: number, status: string) {
    return await api.patch(`/tasks/task/${id}/`, { status });
  }
  
  // Assign a task to a TA
  async assignTask(id: number, taId: number) {
    return await api.patch(`/tasks/task/${id}/`, { assigned_to: taId });
  }
  
  // Get available TAs for assignment
  async getAvailableTAs() {
    try {
      // Get TAs assigned to the instructor
      console.log('Fetching available TAs from:', '/accounts/instructor/tas/');
      const response = await api.get('/accounts/instructor/tas/');
      console.log('Raw TA response:', response.data);
      
      // Store the TAs
      let taData: EnhancedTA[] = [];
      
      // Handle paginated response format (most common Django REST Framework format)
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.results)) {
        console.log('Using results array from paginated response with count:', response.data.count);
        taData = response.data.results;
      }
      // Handle array response directly
      else if (Array.isArray(response.data)) {
        console.log('Direct array response with length:', response.data.length);
        
        // Handle case where each item contains a TA object
        if (response.data.length > 0 && response.data[0] && typeof response.data[0].ta === 'object') {
          console.log('Response contains assignment objects with TA objects inside');
          taData = response.data
            .filter((item: TAAssignment | any) => item && item.ta)
            .map((item: TAAssignment | any) => ({
              ...item.ta,
              // If there are any specific fields in the assignment item that we want to keep
              assignment_id: item.id,
              assigned_date: item.assigned_at
            }));
        } else {
          taData = response.data;
        }
      } else {
        // Log the actual shape of the data to help with debugging
        console.warn('Unexpected API response structure:', JSON.stringify(response.data, null, 2));
        console.warn('Response data keys:', Object.keys(response.data || {}));
      }
      
      // Skip workload API call as it doesn't exist in the backend
      // Just add placeholder workload values
      taData = taData.map((ta: EnhancedTA) => {
        return {
          ...ta,
          current_workload: 0,
          workload_cap: 40,
          workload_percentage: 0
        };
      });
      
      console.log('Final enriched TA data:', taData);
      return { data: taData };
    } catch (error: any) {
      console.error('Error in getAvailableTAs:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received, request details:', error.request);
      }
      return { data: [] }; // Return empty array instead of throwing
    }
  }
  
  // Get workload data for TAs
  async getTAWorkloads() {
    try {
      const response = await api.get('/workload/instructor/ta-workloads/');
      return response.data;
    } catch (error) {
      console.error('Error fetching TA workloads:', error);
      return [];
    }
  }
  
  // Mark a task as completed (for TAs)
  async completeTask(taskId: number, data: CompleteTaskData) {
    return await api.post(`/tasks/task/${taskId}/complete/`, data);
  }
  
  // Review a completed task (for instructors)
  async reviewTask(taskId: number, data: ReviewTaskData) {
    return await api.post(`/tasks/task/${taskId}/review/`, data);
  }

  // TA accepts a task
  async acceptTask(taskId: number) {
    console.log(`Sending request to accept task: ${taskId} to URL: /tasks/task/${taskId}/accept/`);
    try {
      const response = await api.post(`/tasks/task/${taskId}/accept/`);
      console.log('Accept task response:', response);
      return response;
    } catch (error) {
      console.error('Error accepting task:', error);
      throw error;
    }
  }
}

export default new TaskService(); 