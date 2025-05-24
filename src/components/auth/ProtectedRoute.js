// src/components/auth/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path if your AuthContext is elsewhere

const ProtectedRoute = ({ children }) => {
  const { currentUser, authLoading } = useAuth();
  const location = useLocation(); // To remember where the user was trying to go

  if (authLoading) {
    // Show a loading indicator while auth state is being determined
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-xl font-semibold text-indigo-600 animate-pulse">
          Loading Application Route...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    // User is not logged in, redirect them to the login page.
    // Save the current location they were trying to go to in `state.from`
    // so we can send them there after they login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is logged in, render the child components (the actual protected page)
  return children;
};

export default ProtectedRoute;