import api from './api';
import { AxiosResponse } from 'axios';

// Course management service for API calls
export const courseService = {
  // Get all courses
  getAllCourses: async (): Promise<any> => {
    console.log('Sending request to get all courses');
    try {
      const response = await api.get('/accounts/courses/');
      console.log('API response getAllCourses:', response);
      return response;
    } catch (error) {
      console.error('Error in getAllCourses:', error);
      throw error;
    }
  },

  // Get courses by instructor ID
  getCoursesByInstructor: async (instructorId: number): Promise<any> => {
    console.log(`Sending request to get courses for instructor ${instructorId}`);
    try {
      const response = await api.get(`/accounts/courses/?instructor_id=${instructorId}`);
      console.log('API response getCoursesByInstructor:', response);
      return response;
    } catch (error) {
      console.error(`Error in getCoursesByInstructor for ID ${instructorId}:`, error);
      throw error;
    }
  },

  // Get a specific course by ID
  getCourse: async (id: number): Promise<any> => {
    return api.get(`/accounts/courses/${id}/`);
  },

  // Create a new course
  createCourse: async (courseData: any): Promise<any> => {
    return api.post('/accounts/courses/create/', courseData);
  },

  // Update an existing course
  updateCourse: async (id: number, courseData: any): Promise<any> => {
    return api.put(`/accounts/courses/${id}/update/`, courseData);
  },

  // Delete a course
  deleteCourse: async (id: number): Promise<any> => {
    return api.delete(`/accounts/courses/${id}/delete/`);
  },

  // Import courses from Excel file
  importCoursesFromExcel: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/accounts/courses/import-excel/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get all sections
  getAllSections: async (): Promise<any> => {
    console.log('Sending request to get all sections');
    try {
      const response = await api.get('/accounts/sections/');
      console.log('API response getAllSections:', response);
      return response;
    } catch (error) {
      console.error('Error in getAllSections:', error);
      throw error;
    }
  },

  // Get sections by instructor ID
  getSectionsByInstructor: async (instructorId: number): Promise<any> => {
    console.log(`Sending request to get sections for instructor ${instructorId}`);
    try {
      const response = await api.get(`/accounts/sections/?instructor_id=${instructorId}`);
      console.log('API response getSectionsByInstructor:', response);
      return response;
    } catch (error) {
      console.error(`Error in getSectionsByInstructor for ID ${instructorId}:`, error);
      throw error;
    }
  },

  // Get sections by course ID
  getSectionsByCourse: async (courseId: number): Promise<any> => {
    return api.get(`/accounts/sections/?course=${courseId}`);
  },

  // Get a specific section by ID
  getSection: async (id: number): Promise<any> => {
    return api.get(`/accounts/sections/${id}/`);
  },

  // Create a new section
  createSection: async (sectionData: any): Promise<any> => {
    return api.post('/accounts/sections/create/', sectionData);
  },

  // Update an existing section
  updateSection: async (id: number, sectionData: any): Promise<any> => {
    return api.put(`/accounts/sections/${id}/update/`, sectionData);
  },

  // Delete a section
  deleteSection: async (id: number): Promise<any> => {
    return api.delete(`/accounts/sections/${id}/delete/`);
  },

  // Get all departments
  getAllDepartments: async (): Promise<any> => {
    console.log('Sending request to get all departments');
    try {
      const response = await api.get('/accounts/departments/');
      console.log('API response getAllDepartments:', response);
      return response;
    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      throw error;
    }
  },

  // Get all instructors (for assigning to sections)
  getAllInstructors: async (): Promise<any> => {
    console.log('Sending request to get all instructors');
    try {
      const response = await api.get('/accounts/users/?role=INSTRUCTOR');
      console.log('API response getAllInstructors:', response);
      return response;
    } catch (error) {
      console.error('Error in getAllInstructors:', error);
      throw error;
    }
  },
};

export default courseService; 