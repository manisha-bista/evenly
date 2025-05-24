// src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { sendPasswordReset } from '../services/authService'; // Import our service function
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const ForgotPasswordPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (data) => {
    setMessage('');
    setError('');
    try {
      await sendPasswordReset(data.email);
      setMessage(`Password reset email sent to ${data.email}. Please check your inbox (and spam folder).`);
      reset(); // Clear the form
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No user found with this email address. Please check the email and try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address is not valid. Please enter a valid email.');
      } else {
        setError(err.message || 'Failed to send password reset email. Please try again.');
      }
      console.error("ForgotPasswordPage error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center text-indigo-600 hover:text-indigo-500 text-4xl font-bold mb-6">
          Evenly
        </Link>
        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Forgot Your Password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          No worries! Enter your email address below, and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {message && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-300 rounded-md text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-300 rounded-md text-sm">
              {error}
            </div>
          )}
          {!message && ( // Hide form after successful message
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email Address"
                id="email"
                type="email"
                autoComplete="email"
                Icon={EnvelopeIcon} // Optional: Pass icon to Input component if it supports it
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email address is required.',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Please enter a valid email address.',
                  },
                })}
              />

              <div>
                <Button type="submit" color="primary" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? 'Sending Link...' : 'Send Password Reset Link'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center justify-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;