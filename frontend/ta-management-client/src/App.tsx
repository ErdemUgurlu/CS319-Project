import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import Schedule from './pages/Schedule';
import LeaveRequests from './pages/LeaveRequests';
import ApprovalPending from './pages/ApprovalPending';
import MyProctorings from './pages/MyProctorings';
import MyWorkload from './pages/MyWorkload';
import ApproveUsers from './pages/ApproveUsers';
import ExamManagement from './pages/ExamManagement';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
// Instructor pages
import InstructorProctoring from './pages/instructor/InstructorProctoring';
import LeaveApprovals from './pages/instructor/LeaveApprovals';
// Staff pages
import CourseManagement from './pages/staff/CourseManagement';
// Dean's Office pages
import DeanExamManagement from './pages/dean/DeanExamManagement';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import ManageTeachingAssistants from './components/ManageTeachingAssistants';
import ManageWorkload from './components/ManageWorkload';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#003366', // Bilkent Blue
    },
    secondary: {
      main: '#E14D2A', // Bilkent Red
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Role-based Proctoring component
const ProctoringRoute = () => {
  const { authState } = useAuth();
  
  // Redirect to appropriate proctoring page based on role
  if (authState.user?.role === 'INSTRUCTOR' || authState.user?.role === 'STAFF' || authState.user?.role === 'ADMIN') {
    return <InstructorProctoring />;
  } else {
    return <MyProctorings />;
  }
};

// Role-based Exam Management component
const ExamManagementRoute = () => {
  const { authState } = useAuth();
  
  // Redirect to appropriate exam management page based on role
  if (authState.user?.role === 'DEAN_OFFICE') {
    return <DeanExamManagement />;
  } else {
    return <ExamManagement />;
  }
};

// Layout component for protected routes
const ProtectedLayout = () => {
  return (
    <>
      <NavBar />
      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/leave-requests" element={<LeaveRequests />} />
          <Route path="/instructor/leave-approvals" element={<LeaveApprovals />} />
          <Route path="/proctoring" element={<ProctoringRoute />} />
          <Route path="/workload" element={<MyWorkload />} />
          <Route path="/approve-users" element={<ApproveUsers />} />
          <Route path="/manage-tas" element={<ManageTeachingAssistants />} />
          <Route path="/manage-workload/:taId" element={<ManageWorkload />} />
          <Route path="/courses" element={<CourseManagement />} />
          <Route path="/exam-management" element={<ExamManagementRoute />} />
          <Route path="/exams" element={<ExamManagementRoute />} />
          <Route path="/dean/exam-management" element={<DeanExamManagement />} />
          <Route path="/profile" element={<Profile />} />
          {/* Add other protected routes */}
        </Routes>
      </Box>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/approval-pending" element={<ApprovalPending />} />
            {/* Add other public routes like forgot password, etc. */}
            
            {/* Protected routes with layout */}
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<ProtectedLayout />} />
            </Route>
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
