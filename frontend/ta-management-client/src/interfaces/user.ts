// Basic user interface
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  role_display?: string;
  department: string;
  department_name?: string;
  phone?: string;
  iban?: string;
  academic_level?: string;
  academic_level_display?: string;
  employment_type?: string;
  employment_type_display?: string;
  is_approved?: boolean;
  email_verified?: boolean;
  date_joined?: string;
  last_login?: string;
}

// TA Profile interface extending the User
export interface TAProfile {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department: string;
  academic_level: string;
  academic_level_display: string;
  employment_type: string;
  employment_type_display: string;
  undergrad_university?: string;
  supervisor?: number | null;
  supervisor_name?: string | null;
  workload_number?: number | null;
  workload_credits: number;
  schedule_json?: Record<string, any> | null;
}

// Enhanced TA with user and profile information combined
export interface EnhancedTA extends User {
  profile?: {
    undergrad_university?: string;
    supervisor?: number | null;
    supervisor_name?: string | null;
    workload_number?: number | null;
    workload_credits: number;
  };
  current_workload?: number;
  workload_cap?: number;
  workload_percentage?: number;
  assignment_id?: number;
  assigned_date?: string;
}

// Weekly schedule entry for TAs
export interface WeeklySchedule {
  id: number;
  day: string;
  day_display: string;
  start_time: string;
  end_time: string;
  description: string;
}

// TA assignment to instructor
export interface TAAssignment {
  id: number;
  instructor: number;
  instructor_name: string;
  ta: number;
  ta_name: string;
  ta_email: string;
  ta_academic_level: string;
  ta_employment_type: string;
  department: number;
  department_name: string;
  assigned_at: string;
} 