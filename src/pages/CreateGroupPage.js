// src/pages/CreateGroupPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { createGroup as createGroupService } from '../services/firestoreService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const CreateGroupPage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth(); // userData should have username
  const [apiError, setApiError] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      groupName: '',
    },
  });

  const onSubmit = async (data) => {
    if (!currentUser || !userData) {
      setApiError("User not properly loaded. Please try again.");
      return;
    }
    setApiError('');
    setIsSubmittingForm(true);
    console.log("CreateGroupPage: Submitting group data:", data);

    try {
      const groupRef = await createGroupService(data.groupName, currentUser, userData);
      console.log("CreateGroupPage: Group created successfully, ID:", groupRef.id);
      alert(`Group "${data.groupName}" created successfully!`);
      reset();
      // TODO: Navigate to the newly created group's detail page later
      // For now, navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error("CreateGroupPage: Error creating group:", error);
      setApiError(error.message || "Failed to create group. Please try again.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (!currentUser || !userData) {
    return <p className="text-center p-10">Loading user data or not authenticated...</p>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Create New Group</h1>
        <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      {apiError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Group Name"
          id="groupName"
          error={errors.groupName?.message}
          {...register('groupName', {
            required: 'Group name is required.',
            minLength: { value: 3, message: 'Group name must be at least 3 characters.' },
          })}
        />

        {/* Placeholder for adding members - will be implemented later */}
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            You will be automatically added as the first member and admin of this group.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            (Functionality to add other members will be available after group creation.)
          </p>
        </div>

        <div className="pt-5">
          <div className="flex justify-end space-x-3">
            <Button type="button" color="secondary" outline onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isSubmittingForm}>
              {isSubmittingForm ? 'Creating Group...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupPage;