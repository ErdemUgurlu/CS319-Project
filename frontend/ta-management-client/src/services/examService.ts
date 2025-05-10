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
    return api.delete(`/accounts/exams/${id}/delete/`);
  },

  // Assign places to an exam
  assignPlaces: async (id: number, data: AssignPlacesForm): Promise<any> => {
    return api.patch(`/accounts/exams/${id}/assign-places/`, data);
  },

  // Get available classrooms
  getClassrooms: async (): Promise<any> => {
    return api.get('/accounts/classrooms/');
  },

  // Set proctor count for an exam
  setProctors: async (id: number, data: SetProctorsForm): Promise<any> => {
    return api.patch(`/accounts/exams/${id}/set-proctors/`, data);
  },

  // Upload student list file for an exam
  uploadStudentList: async (id: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('student_list_file', file);
    
    return api.patch(`/accounts/exams/${id}/upload-student-list/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
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

  // Request cross-departmental proctors for an exam
  requestCrossDepartmentalProctors: async (examId: number): Promise<any> => {
    // The backend URL is in proctoring app, not accounts
    return api.post(`/proctoring/exams/${examId}/request-cross-departmental/`);
  },

  // Dean action for cross-departmental proctoring requests
  deanCrossDepartmentalAction: async (examId: number, action: 'APPROVE' | 'REJECT', helpingDepartmentCode?: string): Promise<any> => {
    const payload: any = { action };
    if (action === 'APPROVE' && helpingDepartmentCode) {
      payload.helping_department_code = helpingDepartmentCode;
    }
    // The backend URL is in proctoring app
    return api.post(`/proctoring/exams/${examId}/dean-cross-departmental-approval/`, payload);
  }
};

export default examService; 