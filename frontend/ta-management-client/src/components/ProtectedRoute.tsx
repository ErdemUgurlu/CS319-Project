import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { authState } = useAuth();
  const location = useLocation();

  // Show loading state
  if (authState.loading) {
    return <div>Loading...</div>;
  }

  // Check if user is authenticated
  if (!authState.isAuthenticated || !authState.user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is approved (except for ADMIN and STAFF roles who don't need approval)
  if (!authState.user.is_approved && 
      !['ADMIN', 'STAFF', 'DEAN_OFFICE'].includes(authState.user.role)) {
    // Redirect to approval pending page
    return <Navigate to="/approval-pending" replace />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(authState.user.role)) {
    // Redirect to unauthorized page if not in allowed roles
    return <Navigate to="/unauthorized" replace />;
  }

  // Render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 