import { Course } from './course';

// Interface for Classroom object returned by API
export interface Classroom {
  id: number;
  building: string;
  room_number: string;
  capacity: number;
}

// Enum for exam types
export enum ExamType {
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  QUIZ = 'QUIZ'
}

// Enum for exam status
export enum ExamStatus {
  WAITING_FOR_STUDENT_LIST = 'WAITING_FOR_STUDENT_LIST',
  WAITING_FOR_PLACES = 'WAITING_FOR_PLACES',
  AWAITING_PROCTORS = 'AWAITING_PROCTORS',
  WAITING_FOR_CROSS_DEPARTMENT_APPROVAL = 'WAITING_FOR_CROSS_DEPARTMENT_APPROVAL',
  AWAITING_CROSS_DEPARTMENT_PROCTOR = 'AWAITING_CROSS_DEPARTMENT_PROCTOR',
  READY = 'READY'
}

// Interface for Exam object returned by API
export interface Exam {
  id: number;
  course: Course;
  type: ExamType;
  type_display: string;
  date: string;
  time: string;
  duration: number;
  student_count: number;
  status: ExamStatus;
  status_display: string;
  classroom?: Classroom;
  proctor_count?: number;
  assigned_proctor_count?: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  student_list_file?: string | null;
  has_student_list: boolean;
}

// Interface for Exam creation/update form
export interface ExamForm {
  course_id: number;
  type: ExamType;
  date: string;
  time: string;
  duration: number;
  student_list_file?: File | null;
  status?: ExamStatus;
}

// Interface for assigning places to an exam
export interface AssignPlacesForm {
  classroom_id?: number | string | null;
}

// Interface for setting proctor count
export interface SetProctorsForm {
  proctor_count: number;
} 