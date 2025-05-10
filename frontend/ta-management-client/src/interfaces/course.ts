// Interface for Department object returned by API
export interface Department {
  id: number;
  name: string;
  code: string;
  faculty: string;
}

// Interface for Course object returned by API
export interface Course {
  id: number;
  department: Department;
  code: string;
  title: string;
  credit: number;
  level: string;
  level_display: string;
}

// Interface for Instructor object returned by API
export interface Instructor {
  id: number;
  email: string;
  full_name: string;
}

// Interface for Section object returned by API
export interface Section {
  id: number;
  course: Course;
  section_number: string;
  instructor: Instructor | null;
  student_count: number;
}

// Interface for Course creation form
export interface CourseCreateForm {
  department_id: number;
  code: string;
  title: string;
  credit: number;
  level: string;
}

// Interface for Section creation form
export interface SectionCreateForm {
  course_id: number;
  section_number: string;
  instructor_id?: number;
  student_count: number;
}

// Interface for Course import response
export interface CourseImportResponse {
  created_courses: {
    id: number;
    code: string;
    title: string;
  }[];
  created_sections: {
    id: number;
    course: string;
    section: string;
    student_count: number;
  }[];
  errors: {
    row: number;
    error: string;
    data: any;
  }[];
  total_courses_created: number;
  total_sections_created: number;
  total_errors: number;
} 