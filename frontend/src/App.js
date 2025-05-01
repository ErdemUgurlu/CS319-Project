import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useSelector } from 'react-redux';
import theme from './theme';
import store from './store';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseInstructorDashboard from './pages/CourseInstructorDashboard';
import TaskManagement from './pages/TaskManagement';
import WorkloadTracking from './pages/WorkloadTracking';
import ExamProctoring from './pages/ExamProctoring';
import LeaveRequest from './pages/LeaveRequest';
import ProctoringSwap from './pages/ProctoringSwap';
import TaskCompletionReport from './pages/TaskCompletionReport';
import ProctorAssignment from './pages/ProctorAssignment';
import LeaveEvaluation from './pages/LeaveEvaluation';
import Courses from './pages/Courses';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'instructor' ? '/instructor' : '/'} />;
  }
  
  return children;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={
                <ProtectedRoute allowedRoles={['ta', 'staff', 'dean']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="instructor" element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <CourseInstructorDashboard />
                </ProtectedRoute>
              } />
              <Route path="courses" element={
                <ProtectedRoute allowedRoles={['instructor', 'staff']}>
                  <Courses />
                </ProtectedRoute>
              } />
              <Route path="tasks" element={
                <ProtectedRoute allowedRoles={['ta', 'instructor', 'staff', 'dean']}>
                  <TaskManagement />
                </ProtectedRoute>
              } />
              <Route path="workload" element={
                <ProtectedRoute allowedRoles={['ta', 'staff', 'dean']}>
                  <WorkloadTracking />
                </ProtectedRoute>
              } />
              <Route path="proctoring" element={
                <ProtectedRoute allowedRoles={['ta', 'instructor', 'staff', 'dean']}>
                  <ExamProctoring />
                </ProtectedRoute>
              } />
              <Route path="leave" element={
                <ProtectedRoute allowedRoles={['ta']}>
                  <LeaveRequest />
                </ProtectedRoute>
              } />
              <Route path="swap" element={
                <ProtectedRoute allowedRoles={['ta']}>
                  <ProctoringSwap />
                </ProtectedRoute>
              } />
              <Route path="task-completion" element={<TaskCompletionReport />} />
              <Route path="proctor-assignment" element={
                <ProtectedRoute allowedRoles={['instructor', 'staff']}>
                  <ProctorAssignment />
                </ProtectedRoute>
              } />
              <Route path="leave-evaluation/:requestId" element={
                <ProtectedRoute allowedRoles={['instructor', 'staff']}>
                  <LeaveEvaluation />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
