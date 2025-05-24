// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login as loginService } from '../services/authService';
import Input from '../components/common/Input'; 
import Button from '../components/common/Button';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState(''); // For displaying login errors
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(''); 
    setLoading(true);
    // Basic client-side validation (can be enhanced)
    if (!email || !password) {
        setApiError("Email and password are required.");
        setLoading(false);
        return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        setApiError("Please enter a valid email address.");
        setLoading(false);
        return;
    }

    try {
      await loginService(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Specific Firebase error handling
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setApiError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setApiError('The email address format is invalid.');
      } else {
        setApiError(err.message || 'Failed to log in. Please try again later.');
      }
      console.error("LoginPage error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center text-indigo-600 hover:text-indigo-500 text-4xl font-bold mb-6">Evenly</Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-300 rounded-md text-sm" role="alert">
              {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Email Address" 
              id="emailLogin" // Changed ID to be unique if multiple email inputs exist across app
              type="email" 
              autoComplete="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              // error prop is removed as 'errors' object is not from react-hook-form here
              // We can pass apiError if we want to highlight the field on general apiError,
              // but that might not be specific to this field.
              // For now, client-side validation messages are shown in the apiError banner.
            />
            <div className="relative">
              <Input 
                label="Password" 
                id="passwordLogin" // Changed ID
                type={showPassword ? "text" : "password"} 
                autoComplete="current-password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                // error prop removed
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 top-5 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700" 
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </Link>
              </div>
            </div>
            <div>
              <Button type="submit" color="primary" fullWidth disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Not a member?{' '}
            <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;