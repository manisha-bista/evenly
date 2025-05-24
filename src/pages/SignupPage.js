// src/pages/SignupPage.js
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { signup as signupService, checkUsernameAvailability } from '../services/authService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { EyeIcon, EyeSlashIcon, XCircleIcon } from '@heroicons/react/24/outline';

const SignupPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
    clearErrors,
    reset,
    getValues // <<< CORRECTED: getValues is now destructured
  } = useForm({ mode: "onBlur" });

  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState({
    loading: false,
    available: null, 
    message: '',     
    checkedValue: '',
  });

  const password = watch('password');
  // usernameField is not strictly needed here if we use getValues('username') in handleUsernameBlur
  // const usernameField = watch('username'); 

  const handleUsernameBlur = async () => {
    const currentUsername = getValues('username')?.trim(); // Use getValues to get current form value
    if (!currentUsername || currentUsername.length < 3) {
      setUsernameStatus({ loading: false, available: null, message: '', checkedValue: currentUsername });
      if (usernameStatus.message === 'Username taken.' || usernameStatus.message.includes('Could not verify')) {
        clearErrors("username"); 
      }
      // Let RHF handle required/minLength errors from its own rules
      return;
    }
    if (currentUsername === usernameStatus.checkedValue && usernameStatus.available !== null) {
      if (usernameStatus.available === false) {
        setError("username", { type: "manual", message: usernameStatus.message });
      } else {
        clearErrors("username"); 
      }
      return;
    }

    setUsernameStatus({ loading: true, available: null, message: 'Checking...', checkedValue: currentUsername });
    clearErrors("username"); 

    try {
      const isAvailable = await checkUsernameAvailability(currentUsername);
      if (isAvailable) {
        setUsernameStatus({ loading: false, available: true, message: 'Username available!', checkedValue: currentUsername });
        clearErrors("username"); 
      } else {
        setUsernameStatus({ loading: false, available: false, message: 'Username taken.', checkedValue: currentUsername });
        setError("username", { type: "manual", message: "This username is already taken." });
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameStatus({ loading: false, available: null, message: 'Could not verify username. Please try again.', checkedValue: currentUsername });
      // Don't set a form error here for "could not verify", onSubmit will handle if status is still null
    }
  };

  const getPasswordStrength = (pwd) => { 
    if (!pwd) return { label: '', color: 'bg-gray-200', widthClass: 'w-0' }; let s = 0; if (pwd.length >= 8) s++; else return { label: 'Too short (min 8 chars)', color: 'bg-red-300', widthClass: 'w-1/5' }; if (pwd.match(/[a-z]/)) s++; if (pwd.match(/[A-Z]/)) s++; if (pwd.match(/[0-9]/)) s++; if (pwd.match(/[^A-Za-z0-9\s]/)) s++; switch (s) { case 1: case 2: return { label: 'Weak', color: 'bg-red-500', widthClass: 'w-1/3' }; case 3: return { label: 'Medium', color: 'bg-yellow-500', widthClass: 'w-2/3' }; case 4: case 5: return { label: 'Strong', color: 'bg-green-500', widthClass: 'w-full' }; default: return { label: 'Very Weak', color: 'bg-red-300', widthClass: 'w-1/5' }; }
  };
  const passwordStrength = getPasswordStrength(watch('password'));

  const onSubmit = async (data) => { // data is from react-hook-form's handleSubmit
    setApiError(''); 

    // Re-validate username status if it changed since last blur or was never successfully validated
    const currentUsernameTrimmed = data.username.trim();
    if (usernameStatus.checkedValue !== currentUsernameTrimmed || usernameStatus.available === null) {
        // Directly call handleUsernameBlur, but now it uses getValues, so ensure it's called in a context where form values are stable for it
        // Or, for onSubmit, just rely on the latest usernameStatus if blur was the intended trigger.
        // Forcing a re-check if submitted and status is not definitively "available: true"
        if (usernameStatus.available !== true || usernameStatus.checkedValue !== currentUsernameTrimmed) {
            // If current state from blur isn't "available" for the submitted username, show error or re-check.
            // For simplicity in onSubmit, if the last blur check failed for the *current* username, stop.
            if (usernameStatus.available === false && usernameStatus.checkedValue === currentUsernameTrimmed) {
                 setError("username", { type: "manual", message: "This username is already taken." });
                 return;
            }
            // If it couldn't be verified on blur, prompt user.
            if (usernameStatus.available === null && usernameStatus.message.includes('Could not verify') && usernameStatus.checkedValue === currentUsernameTrimmed) {
                setApiError('Username status is uncertain. Please ensure it was checked or try again.');
                return;
            }
            // If it was changed since last blur, a re-check is needed (handleUsernameBlur would have done this)
            // But to be safe, if RHF has an error for username, stop
            if (errors.username) return;
        }
    }
    // If RHF has any errors (including from `setError` in `handleUsernameBlur`), don't submit
    if (Object.keys(errors).length > 0) {
        // If the only error is one we set manually and it's for "taken" or "could not verify", it's already handled.
        // This check is more for RHF's own validations (required, pattern, minLength).
        console.log("RHF Errors present, stopping submission:", errors);
        return;
    }


    try {
      await signupService(data.email, data.password, data.firstName, data.lastName, data.username, null);
      reset();
      setUsernameStatus({loading: false, available: null, message: '', checkedValue: ''});
      navigate('/verify-email', { state: { email: data.email }, replace: true }); 
    } catch (error) {
      console.error("SignupPage: Signup service error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setApiError('This email address is already registered.'); setError('email', { type: 'manual', message: 'Email already in use.' });
      } else if (error.code === 'auth/weak-password') {
        setApiError('The password is too weak.'); setError('password', { type: 'manual', message: 'Password is too weak.' });
      } else { setApiError(error.message || 'Failed to create account.'); }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl"><div className="text-center"><Link to="/" className="text-indigo-600 hover:text-indigo-500 text-4xl font-bold mb-6 inline-block">Evenly</Link><h2 className="mt-2 text-3xl font-extrabold text-gray-900">Join Evenly and split bills with ease.</h2></div></div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl"><div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2"><Input label="First Name" id="firstName" error={errors.firstName?.message} {...register('firstName', { required: 'First name is required' })} /><Input label="Last Name" id="lastName" error={errors.lastName?.message} {...register('lastName', { required: 'Last name is required' })} /></div>
            <Input
              label="Username" id="username"
              error={errors.username?.message} // RHF errors will show here
              // Hint will show our custom status messages
              hint={usernameStatus.loading && getValues('username')?.trim() === usernameStatus.checkedValue ? "Checking..." : 
                   (usernameStatus.available === true && getValues('username')?.trim() === usernameStatus.checkedValue ? usernameStatus.message : 
                   (usernameStatus.available === false && getValues('username')?.trim() === usernameStatus.checkedValue ? usernameStatus.message : 
                   (usernameStatus.message.includes("Could not verify") && getValues('username')?.trim() === usernameStatus.checkedValue ? usernameStatus.message :
                   "e.g., john_doe21 (min 3 chars)")))}
              {...register('username', { required: 'Username is required', minLength: { value: 3, message: 'Min 3 characters' }, pattern: { value: /^[a-zA-Z0-9_.]+$/, message: 'Letters, numbers, underscore, period only' }, })}
              onBlur={handleUsernameBlur} // Keep onBlur for proactive checks
            />
            <Input label="Email" id="email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email format' }, })} />
            <div className="relative"><Input label="Password" id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" error={errors.password?.message} hint="Min 8 chars, with uppercase, lowercase, number, symbol." {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 chars' }, validate: value => (/[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9\s]/.test(value)) || 'Include uppercase, lowercase, number, and symbol.' })} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-5 pr-3 flex items-center text-sm leading-5" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}</button></div>
            {watch('password') && (<div className="mt-1"><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-2 ${passwordStrength.color} ${passwordStrength.widthClass} rounded-full transition-all`}></div></div><p className={`text-xs mt-1 ${ passwordStrength.label === 'Weak' || passwordStrength.label.startsWith('Too short') ? 'text-red-500' : passwordStrength.label === 'Medium' ? 'text-yellow-600' : passwordStrength.label === 'Strong' ? 'text-green-600' : 'text-gray-500' }`}>{passwordStrength.label}</p></div>)}
            <div className="relative"><Input label="Confirm Password" id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword', { required: 'Please confirm your password', validate: value => value === password || 'Passwords do not match', })} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 top-5 pr-3 flex items-center text-sm leading-5" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>{showConfirmPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}</button></div>
            {apiError && (<div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4"><div className="flex"><div className="flex-shrink-0"><XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" /></div><div className="ml-3"><p className="text-sm text-red-700">{apiError}</p></div></div></div>)}
            <Button type="submit" color="primary" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Creating Account...' : 'Create Account'}</Button>
          </form>
          <p className="mt-8 text-center text-sm text-gray-600">Already have an account?{' '}<Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Login</Link></p>
        </div></div>
    </div>
  );
};

export default SignupPage;