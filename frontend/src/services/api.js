import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const examAPI = {
  // Get all exams
  getExams: () => api.get('/exams/'),
  
  // Get a single exam
  getExam: (id) => api.get(`/exams/${id}/`),
  
  // Create a new exam
  createExam: (data) => api.post('/exams/', data),
  
  // Update an exam
  updateExam: (id, data) => api.put(`/exams/${id}/`, data),
  
  // Delete an exam
  deleteExam: (id) => api.delete(`/exams/${id}/`),
  
  // Assign proctors to an exam
  assignProctors: (examId, proctorIds) => 
    api.post(`/exams/${examId}/assign_proctors/`, { proctor_ids: proctorIds }),
};

export const taAPI = {
  // Get all TAs
  getTAs: () => api.get('/tas/'),
  
  // Get a single TA
  getTA: (id) => api.get(`/tas/${id}/`),
  
  // Create a new TA
  createTA: (data) => api.post('/tas/', data),
  
  // Update a TA
  updateTA: (id, data) => api.put(`/tas/${id}/`, data),
  
  // Delete a TA
  deleteTA: (id) => api.delete(`/tas/${id}/`),
  
  // Get TA's workload
  getWorkload: (id) => api.get(`/tas/${id}/workload/`),
  
  // Get TA's assigned tasks
  getTasks: (id) => api.get(`/tas/${id}/tasks/`),
  
  // Get TA's proctoring schedule
  getProctoring: (id) => api.get(`/tas/${id}/proctoring/`),
};

export const taskAPI = {
  // Get all tasks
  getTasks: (params) => api.get('/tasks/', { params }),
  
  // Get a single task
  getTask: (id) => api.get(`/tasks/${id}/`),
  
  // Create a new task
  createTask: (data) => api.post('/tasks/', data),
  
  // Update a task
  updateTask: (id, data) => api.put(`/tasks/${id}/`, data),
  
  // Delete a task
  deleteTask: (id) => api.delete(`/tasks/${id}/`),
  
  // Mark task as complete
  markComplete: (id, completionNote) => 
    api.post(`/tasks/${id}/mark_complete/`, { completion_note: completionNote }),
  
  // Update task status
  updateStatus: (id, status) => 
    api.post(`/tasks/${id}/update_status/`, { status }),
};

export default api; 