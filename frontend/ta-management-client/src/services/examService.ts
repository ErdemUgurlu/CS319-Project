import api from './api';
import { ExamForm, AssignPlacesForm, SetProctorsForm, ExamStatus } from '../interfaces/exam';

// Exam management service for API calls
export const examService = {
  // Get all exams
  getAllExams: async (status?: string): Promise<any> => {
    console.log('Sending request to get all exams');
    try {
      const url = status ? `/accounts/exams/?status=${status}` : '/accounts/exams/';
      const response = await api.get(url);
      console.log('API response getAllExams:', response);
      return response;
    } catch (error) {
      console.error('Error in getAllExams:', error);
      throw error;
    }
  },

  // Get exams waiting for places (for Dean's Office)
  getExamsWaitingForPlaces: async (): Promise<any> => {
    console.log('Sending request to get exams waiting for places');
    try {
      const response = await api.get('/accounts/exams/?status=WAITING_FOR_PLACES');
      console.log('API response getExamsWaitingForPlaces:', response);
      return response;
    } catch (error) {
      console.error('Error in getExamsWaitingForPlaces:', error);
      throw error;
    }
  },

  // Get exams by instructor
  getExamsByInstructor: async (instructorId: number, status?: string): Promise<any> => {
    console.log(`Sending request to get exams for instructor ${instructorId}`);
    try {
      // The backend will automatically filter based on the authenticated user
      const url = status ? `/accounts/exams/?status=${status}` : '/accounts/exams/';
      const response = await api.get(url);
      console.log('API response getExamsByInstructor:', response);
      return response;
    } catch (error) {
      console.error(`Error in getExamsByInstructor for ID ${instructorId}:`, error);
      throw error;
    }
  },

  // Get exams by course
  getExamsByCourse: async (courseId: number, status?: string): Promise<any> => {
    console.log(`Sending request to get exams for course ${courseId}`);
    try {
      let url = `/accounts/exams/?course=${courseId}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await api.get(url);
      console.log('API response getExamsByCourse:', response);
      return response;
    } catch (error) {
      console.error(`Error in getExamsByCourse for ID ${courseId}:`, error);
      throw error;
    }
  },

  // Get a specific exam by ID
  getExam: async (id: number): Promise<any> => {
    return api.get(`/accounts/exams/${id}/`);
  },

  // Create a new exam
  createExam: async (examData: ExamForm): Promise<any> => {
    return api.post('/accounts/exams/create/', examData);
  },

  // Update an existing exam
  updateExam: async (id: number, examData: Partial<ExamForm>): Promise<any> => {
    return api.patch(`/accounts/exams/${id}/update/`, examData);
  },

  // Delete an exam
  deleteExam: async (id: number): Promise<any> => {
    try {
      const response = await api.delete(`/accounts/exams/${id}/`);
      console.log('API response deleteExam:', response);
      return response;
    } catch (error) {
      console.error(`Error in deleteExam for ID ${id}:`, error);
      throw error;
    }
  },

  // Assign places to an exam
  assignPlaces: async (id: number, data: AssignPlacesForm): Promise<any> => {
    return api.patch(`/accounts/exams/${id}/assign-places/`, data);
  },

  // Get available classrooms
  getClassrooms: async (): Promise<any> => {
    try {
      const response = await api.get('/accounts/classrooms/');
      console.log('API response getClassrooms:', response);
      return response;
    } catch (error) {
      console.error('Error in getClassrooms:', error);
      throw error;
    }
  },

  // Set proctor count for an exam
  setProctors: async (id: number, data: SetProctorsForm): Promise<any> => {
    return api.patch(`/accounts/exams/${id}/set-proctors/`, data);
  },

  // Upload student list for an exam
  uploadStudentList: async (examId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('student_list_file', file);
    try {
      const response = await api.post(`/accounts/exams/${examId}/upload-student-list/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error uploading student list for exam ${examId}:`, error);
      throw error;
    }
  },

  // Add a function to upload exam placements from Excel file
  importExamPlacements: async (file: File, examId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // If an exam ID is provided, include it in the request
    if (examId) {
      formData.append('exam_id', examId.toString());
    }
    
    return api.post('/accounts/exams/import-placements/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Import places from Excel
  importPlacesFromExcel: async (examId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(`/accounts/exams/${examId}/import-places/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error importing places for exam ${examId}:`, error);
      throw error;
    }
  },

  // Request cross-department proctors
  requestCrossDepartmentProctors: async (examId: number, departmentIds: number[]): Promise<any> => {
    try {
      const response = await api.post(`/accounts/exams/${examId}/request-cross-department/`, { department_ids: departmentIds });
      return response.data; // Or simply response if the backend sends 204 or similar
    } catch (error) {
      console.error(`Error requesting cross-department proctors for exam ${examId}:`, error);
      throw error;
    }
  },

  approveCrossDepartmentRequest: async (examId: number, departmentIds: number[]): Promise<any> => {
    try {
      const response = await api.post(`/accounts/exams/${examId}/approve-cross-department/`, { department_ids: departmentIds });
      return response.data; 
    } catch (error) {
      console.error(`Error approving cross-department request for exam ${examId}:`, error);
      throw error;
    }
  },

  rejectCrossDepartmentRequest: async (examId: number, reason: string): Promise<any> => {
    try {
      const response = await api.post(`/accounts/exams/${examId}/reject-cross-department/`, { reason });
      return response.data;
    } catch (error) {
      console.error(`Error rejecting cross-department request for exam ${examId}:`, error);
      throw error;
    }
  },

  // Notify TAs for cross-department proctoring
  notifyTAsForCrossDepartmentProctoring: async (examId: number, departmentId: number): Promise<any> => {
    try {
      console.log(`Sending request to notify TAs for exam ${examId} in department ${departmentId}`);
      // The endpoint will be POST /accounts/exams/{examId}/notify-department-tas/
      const response = await api.post(`/accounts/exams/${examId}/notify-department-tas/`, { department_id: departmentId });
      console.log('API response notifyTAsForCrossDepartmentProctoring:', response);
      return response; // Or response.data depending on what the backend returns
    } catch (error) {
      console.error(`Error in notifyTAsForCrossDepartmentProctoring for exam ${examId}, department ${departmentId}:`, error);
      throw error;
    }
  }
};

export default examService; 