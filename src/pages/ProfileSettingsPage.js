// src/pages/ProfileSettingsPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PencilSquareIcon, EyeIcon, EyeSlashIcon, KeyIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { reauthenticateUser, changeUserPassword, deleteCurrentUserAccount } from '../services/authService';

const ProfileSettingsPage = () => {
  const { currentUser, userData, logout, authLoading } = useAuth();
  const navigate = useNavigate();

  // ... (other state variables: isEditingName, updateMessage, etc. - keep as is)
  const [isEditingName, setIsEditingName] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' });
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [reauthPasswordForDelete, setReauthPasswordForDelete] = useState('');
  const [showReauthInputForDelete, setShowReauthInputForDelete] = useState(false); // True if re-auth is currently needed


  const { register: registerName, handleSubmit: handleSubmitName, reset: resetNameForm, formState: { errors: nameErrors } } = useForm({ defaultValues: { firstName: '', lastName: '' } });
  const { register: registerPassword, handleSubmit: handleSubmitPassword, watch: watchPassword, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm();
  const newPasswordValue = watchPassword("newPassword");

  useEffect(() => { /* ... (name form reset - keep as is) ... */ 
    if (userData) { resetNameForm({ firstName: userData.firstName || '', lastName: userData.lastName || '' }); }
  }, [userData, resetNameForm]);

  const onNameSubmit = async (data) => { /* ... (keep as is) ... */ 
    if (!currentUser) return; setIsSubmittingName(true); setUpdateMessage({ type: '', text: '' }); try { const userDocRef = doc(db, "users", currentUser.uid); await updateDoc(userDocRef, { firstName: data.firstName, lastName: data.lastName }); setUpdateMessage({ type: 'success', text: 'Name updated! (Reflected on next full login/refresh)' }); setIsEditingName(false); } catch (error) { setUpdateMessage({ type: 'error', text: 'Failed to update name: ' + error.message }); } finally { setIsSubmittingName(false); }
  };
  const onChangePasswordSubmit = async (data) => { /* ... (keep as is) ... */ 
    setPasswordChangeError(''); setPasswordChangeSuccess(''); setIsChangingPassword(true); 
    try { await reauthenticateUser(data.currentPassword); await changeUserPassword(data.newPassword); setPasswordChangeSuccess('Password changed successfully!'); resetPasswordForm(); setShowChangePasswordForm(false); } 
    catch (error) { if (error.code === 'auth/wrong-password') { setPasswordChangeError('Incorrect current password.'); } else if (error.code === 'auth/requires-recent-login') { setPasswordChangeError('Action requires recent login. Current password may be incorrect or session expired.'); } else if (error.code === 'auth/weak-password'){ setPasswordChangeError('New password is too weak.'); } else { setPasswordChangeError(error.message || 'Failed to change password.'); } } 
    finally { setIsChangingPassword(false); }
  };

  const handleDeleteAccountAttempt = () => {
    setDeleteAccountError(''); 
    setShowReauthInputForDelete(false); // Initially, don't assume re-auth is needed
    setReauthPasswordForDelete(''); 
    setShowDeleteConfirmModal(true); 
  };

  // This function is called when the primary action button in the modal is clicked.
  const handleModalPrimaryActionForDelete = async () => {
    if (showReauthInputForDelete) { // If password input is visible, this click is for re-auth then delete
        if (!reauthPasswordForDelete.trim()) {
            setDeleteAccountError('Password is required to confirm deletion.');
            return; // Don't proceed further, keep modal open
        }
        setIsDeletingAccount(true);
        setDeleteAccountError('');
        try {
            console.log("ProfileSettingsPage: Re-authenticating with password for delete...");
            await reauthenticateUser(reauthPasswordForDelete);
            console.log("ProfileSettingsPage: Re-authentication successful. Now attempting account deletion...");
            await deleteCurrentUserAccount(); // This deletes Firestore doc then Auth user
            alert("Account deleted successfully. You will be logged out.");
            setShowDeleteConfirmModal(false); // Close modal on full success
            // Logout and redirect will be handled by AuthContext/App.js
        } catch (error) {
            console.error("ProfileSettingsPage: Error during re-auth or delete:", error);
            if (error.code === 'auth/wrong-password') {
                setDeleteAccountError('Incorrect password provided for re-authentication. Account not deleted.');
            } else if (error.code === 'auth/too-many-requests') {
                setDeleteAccountError('Too many re-authentication attempts. Please try again later.');
            } else {
                setDeleteAccountError(error.message || "Could not delete account after re-authentication.");
            }
            // Keep modal open with error if re-auth or final delete failed
        } finally {
            setIsDeletingAccount(false);
        }
    } else { // First confirmation click, attempt delete directly
        setIsDeletingAccount(true);
        setDeleteAccountError('');
        try {
            console.log("ProfileSettingsPage: Attempting direct account deletion...");
            await deleteCurrentUserAccount();
            alert("Account deleted successfully. You will be logged out.");
            setShowDeleteConfirmModal(false);
        } catch (error) {
            console.error("ProfileSettingsPage: Error during initial delete attempt:", error);
            if (error.code === 'auth/requires-recent-login') {
                setDeleteAccountError('This sensitive action requires your current password to confirm deletion. Please enter it below.');
                setShowReauthInputForDelete(true); // Now show password input
            } else {
                setDeleteAccountError(error.message || "Could not delete account. Please try again.");
                setShowDeleteConfirmModal(false); // Close modal on other errors
            }
        } finally {
            setIsDeletingAccount(false);
        }
    }
  };


  if (authLoading && !currentUser) return <p className="text-center p-10 animate-pulse">Loading...</p>;
  if (!currentUser || !userData) return <p className="text-center p-10 text-red-500">User data not available.</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-2xl mb-10">
      <Modal 
        isOpen={showDeleteConfirmModal} 
        onClose={() => { setShowDeleteConfirmModal(false); setShowReauthInputForDelete(false); setDeleteAccountError(''); setReauthPasswordForDelete('');}}
        title="Permanently Delete Your Account?"
        // The primary action button in the modal will now always call handleModalPrimaryActionForDelete
        primaryActionText={
            isDeletingAccount ? "Processing..." : 
            showReauthInputForDelete ? "Confirm & Delete with Password" : 
            "Yes, Delete My Account"
        }
        onPrimaryAction={handleModalPrimaryActionForDelete}
        primaryActionColor="red"
        secondaryActionText="Cancel"
        onSecondaryAction={() => { setShowDeleteConfirmModal(false); setShowReauthInputForDelete(false); setDeleteAccountError(''); setReauthPasswordForDelete('');}}
        disablePrimaryAction={isDeletingAccount || (showReauthInputForDelete && !reauthPasswordForDelete.trim())}
      >
        <p className="text-sm text-gray-700">
          This action is irreversible. All your data, including groups, expenses, and settlements, will be permanently deleted.
        </p>
        {deleteAccountError && <p className="mt-3 text-sm text-red-600 bg-red-100 p-2 rounded-md">{deleteAccountError}</p>}
        {showReauthInputForDelete && (
          <div className="mt-4">
            <Input 
              label="Enter Current Password to Confirm" 
              id="reauthPasswordForDelete" 
              type="password" 
              value={reauthPasswordForDelete} 
              onChange={(e) => {
                setReauthPasswordForDelete(e.target.value);
                if (deleteAccountError) setDeleteAccountError(''); // Clear previous error on input change
              }}
              autoFocus 
            />
          </div>
        )}
      </Modal>

      {/* ... Rest of the ProfileSettingsPage JSX (Your Information, Change Password, Logout button) ... */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b"><h1 className="text-3xl font-bold text-gray-800">Profile & Settings</h1><Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">← Back</Link></div>
      {updateMessage.text && (<div className={`mb-4 p-3 rounded-md text-sm ${updateMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{updateMessage.text}</div>)}
      <div className="space-y-10">
        <section>
          <div className="flex justify-between items-center mb-3"><h2 className="text-xl font-semibold text-gray-700">Your Information</h2>{!isEditingName && (<Button onClick={() => setIsEditingName(true)} color="secondary" outline className="text-xs py-1 px-2"><PencilSquareIcon className="h-4 w-4 mr-1"/> Edit Name</Button>)}</div>
          {!isEditingName ? (<div className="p-4 bg-gray-50 rounded-md space-y-2 text-gray-700"><p><strong>First Name:</strong> {userData.firstName}</p><p><strong>Last Name:</strong> {userData.lastName}</p><p><strong>Username:</strong> <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">{userData.username}</span></p><p><strong>Email:</strong> {currentUser.email}</p></div>) : (<form onSubmit={handleSubmitName(onNameSubmit)} className="p-4 bg-gray-50 rounded-md space-y-4"><Input label="First Name" id="profileFirstName" error={nameErrors.firstName?.message} {...registerName('firstName', { required: "Required" })} /><Input label="Last Name" id="profileLastName" error={nameErrors.lastName?.message} {...registerName('lastName', { required: "Required" })} /><div className="flex space-x-3 justify-end"><Button type="button" color="secondary" outline onClick={() => { setIsEditingName(false); resetNameForm({ firstName: userData.firstName, lastName: userData.lastName }); setUpdateMessage({type:'', text:''}); }}>Cancel</Button><Button type="submit" color="primary" disabled={isSubmittingName}>{isSubmittingName ? "Saving..." : "Save Name"}</Button></div></form>)}
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Security</h2>
          {!showChangePasswordForm ? (<Button onClick={() => { setShowChangePasswordForm(true); setPasswordChangeError(''); setPasswordChangeSuccess(''); resetPasswordForm();}} color="secondary" outline><KeyIcon className="h-5 w-5 mr-2" />Change Password</Button>) : 
          (<form onSubmit={handleSubmitPassword(onChangePasswordSubmit)} className="p-4 bg-gray-50 rounded-md space-y-4 border border-indigo-200">
              <h3 className="text-lg font-medium text-gray-900">Change Your Password</h3>
              {passwordChangeError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{passwordChangeError}</p>}
              {passwordChangeSuccess && <p className="text-sm text-green-600 bg-green-100 p-2 rounded">{passwordChangeSuccess}</p>}
              {!passwordChangeSuccess && (<>
                <div className="relative"><Input label="Current Password" id="currentPassword" type={showCurrentPassword ? "text" : "password"} error={passwordErrors.currentPassword?.message} {...registerPassword('currentPassword', { required: 'Current password is required.' })} /><button type="button" onClick={()=>setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 z-10">{showCurrentPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button></div>
                <div className="relative"><Input label="New Password" id="newPassword" type={showNewPassword ? "text" : "password"} error={passwordErrors.newPassword?.message} {...registerPassword('newPassword', { required: 'New password is required.', minLength: { value: 8, message: 'Min 8 characters.'} })} /><button type="button" onClick={()=>setShowNewPassword(!showNewPassword)} className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 z-10">{showNewPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button></div>
                <div className="relative"><Input label="Confirm New Password" id="confirmNewPassword" type={showConfirmNewPassword ? "text" : "password"} error={passwordErrors.confirmNewPassword?.message} {...registerPassword('confirmNewPassword', { required: 'Please confirm new password.', validate: value => value === newPasswordValue || "New passwords do not match."})} /><button type="button" onClick={()=>setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 z-10">{showConfirmNewPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button></div>
              </>)}
              <div className="flex space-x-3 justify-end pt-2">
                <Button type="button" color="secondary" outline onClick={() => { setShowChangePasswordForm(false); resetPasswordForm(); setPasswordChangeError(''); setPasswordChangeSuccess(''); }}>Cancel</Button>
                {!passwordChangeSuccess && (<Button type="submit" color="primary" disabled={isChangingPassword}>{isChangingPassword ? 'Updating...' : 'Update Password'}</Button>)}
              </div>
            </form>
          )}
        </section>
        <section className="mt-10 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Account Actions</h2>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-gray-600">Need to sign out from this device?</p>
                <Button color="secondary" outline onClick={logout} className="w-full sm:w-auto flex-shrink-0">Logout</Button>
            </div>
        </section>
        <section className="mt-8 pt-8 border-t border-red-300">
            <h2 className="text-xl font-semibold text-red-600 mb-3 flex items-center"><ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-500"/>Danger Zone</h2>
            <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-medium text-red-700">Delete Your Account</h3>
                        <p className="text-sm text-red-600 mt-1">Once you delete your account, all of your data will be permanently removed. This action cannot be undone.</p>
                    </div>
                    <Button color="danger" outline onClick={handleDeleteAccountAttempt} disabled={isDeletingAccount} className="w-full mt-3 sm:mt-0 sm:w-auto flex-shrink-0">
                        <TrashIcon className="h-5 w-5 mr-2"/> 
                        {isDeletingAccount ? "Processing..." : "Delete Account"}
                    </Button>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;