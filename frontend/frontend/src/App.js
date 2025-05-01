import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TaskManagement from './components/TaskManagement';
import LeaveRequests from './components/LeaveRequests';
import Navbar from './components/Navbar';
import { Box } from '@mui/material';

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/leave-requests" element={<LeaveRequests />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App; 