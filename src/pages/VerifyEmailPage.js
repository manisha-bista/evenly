// src/pages/VerifyEmailPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/config'; // <<< ADD THIS IMPORT
import Button from '../components/common/Button';
import { EnvelopeOpenIcon, PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const VerifyEmailPage = () => {
  const { currentUser, authLoading, refreshAuthUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const emailFromState = location.state?.email;
  const displayEmail = emailFromState || currentUser?.email;

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.emailVerified) {
      console.log("VerifyEmailPage useEffect: Email is verified (from AuthContext), navigating to dashboard.");
      const timerId = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000); 
      return () => clearTimeout(timerId);
    }
  }, [currentUser, authLoading, navigate]);

  const handleResendVerification = async () => {
    const userToVerify = auth.currentUser; // Using the imported auth instance's currentUser
    if (!userToVerify) {
      setError("Session expired or user not found. Please try logging in again to resend verification.");
      return;
    }
    setIsResending(true); setError(''); setMessage('');
    try {
      await sendEmailVerification(userToVerify);
      setMessage("Verification email resent. Please check your inbox (and spam folder).");
    } catch (err) { setError(err.message || "Failed to resend email."); }
    setIsResending(false);
  };

  const handleCheckVerification = async () => {
    // Use auth.currentUser for the most direct access to the reloaded state
    const userToReload = auth.currentUser; 
    if (!userToReload) {
      setError("Not logged in. Cannot check verification status.");
      return;
    }
    setIsChecking(true); setError(''); setMessage('Checking verification status...');
    try {
      await refreshAuthUser(); // This calls auth.currentUser.reload() within AuthContext
      
      // After refreshAuthUser, the currentUser from useAuth() should update via onAuthStateChanged.
      // For immediate feedback, we can check auth.currentUser again.
      // The useEffect hook listening to `currentUser` from context will handle the redirect.
      if (auth.currentUser?.emailVerified) { // Check the possibly updated auth.currentUser
        setMessage("Email successfully verified! You will be redirected shortly if not already.");
      } else {
        setError("Email not yet verified. Please ensure you've clicked the link in your email. It may take a moment to update after clicking.");
      }
    } catch (err) { 
      console.error("Error during verification check:", err);
      setError("Could not re-check verification status: " + err.message); 
    }
    setIsChecking(false);
  };
  
  if (authLoading && !currentUser) { 
    return <div className="min-h-screen bg-slate-100 flex justify-center items-center"><p className="text-indigo-600 animate-pulse text-xl">Loading session...</p></div>;
  }
  
  if (currentUser && currentUser.emailVerified && !authLoading) {
      return <div className="min-h-screen bg-slate-100 flex justify-center items-center"><p className="text-green-600 text-xl">Email verified! Redirecting to dashboard...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 text-gray-800">
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl text-center max-w-md w-full border border-gray-200">
        <EnvelopeOpenIcon className="h-16 w-16 text-indigo-500 mx-auto mb-6" />
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">Verify Your Email</h1>
        {displayEmail ? (
          <p className="mb-6 text-gray-600 text-sm sm:text-base leading-relaxed">
            A verification link has been sent to <br/> <strong className="font-semibold text-indigo-600 break-all">{displayEmail}</strong>.
            <br/>Please click the link in that email to activate your account.
          </p>
        ) : ( <p className="mb-6 text-gray-600 text-sm sm:text-base leading-relaxed">Please check your email for a verification link to activate your account.</p> )}
        {message && <div role="alert" className="my-4 p-3 bg-green-100 text-green-700 border border-green-200 rounded-md text-sm">{message}</div>}
        {error && <div role="alert" className="my-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">{error}</div>}
        <div className="space-y-4 my-6">
          <Button 
            onClick={handleCheckVerification} 
            color="primary" 
            fullWidth
            className="shadow-md text-base py-2.5 sm:py-3"
            disabled={isChecking || (currentUser && currentUser.emailVerified)}
          >
            {isChecking ? <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin"/> : null}
            {isChecking ? 'Checking...' : "I've Verified, Continue"}
          </Button>
          <Button 
            onClick={handleResendVerification} 
            color="secondary" 
            outline 
            fullWidth
            disabled={isResending || (currentUser && currentUser.emailVerified)}
            className="shadow-sm text-base py-2.5 sm:py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-2"/>
            {isResending ? 'Resending...' : 'Resend Verification Email'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-6">After clicking the link in your email, use "Continue".<br/>It may take a moment for status to update.</p>
        <div className="mt-8 text-sm"><Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">← Back to Login</Link></div>
      </div>
       <footer className="pt-8 text-center text-gray-500 text-sm"><p>© {new Date().getFullYear()} Evenly.</p></footer>
    </div>
  );
};

export default VerifyEmailPage;