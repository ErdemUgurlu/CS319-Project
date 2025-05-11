import { Exam } from './exam'; // Assuming Exam interface exists for related_exam

export interface Notification {
  id: number;
  user: number; // User ID
  user_email: string;
  message: string;
  notification_type: string; // Consider defining an enum for this if types are fixed
  created_at: string; // ISO date string
  is_read: boolean;
  read_at?: string | null; // ISO date string or null
  related_exam?: number | null; // Exam ID or null
  related_exam_info?: string | null; // String representation of the exam, e.g., "CS101 - Midterm (2023-10-26 14:00)"
  link?: string | null;
} 