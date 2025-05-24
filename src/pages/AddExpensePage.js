// src/pages/AddExpensePage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { 
    addExpense as addExpenseService, 
    updateExpense as updateExpenseService,
    getExpenseDetails,
    getGroupDetails 
} from '../services/firestoreService';
import { doc as firebaseDoc, getDoc as getFirebaseDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Helper to get participants - this should be stable if inputs (currentUser, groupId, friendId) are stable
const getParticipantsForForm = async (currentUser, CUserData, groupId, friendId, existingParticipantUIDs = []) => {
  if (!currentUser) return { participants: [], preselectedUIDs: [] }; 
  let initialParticipants = [];
  let preselectedUIDs = new Set(existingParticipantUIDs);

  // Default current user option
  const currentUserDisplay = { id: currentUser.uid, name: `${CUserData?.username || CUserData?.displayName || currentUser.email || 'You'}` };

  if (groupId) {
    try { 
      const group = await getGroupDetails(groupId); 
      if (group?.members) { 
        initialParticipants = group.members.map(m => ({ 
          id: m.uid, 
          name: m.uid === currentUser.uid 
                ? `${CUserData?.username || CUserData?.displayName || currentUser.email || 'You'} (In Group: ${group.name?.substring(0,10) || ''})` 
                : m.username || `User ${m.uid.slice(0,5)}` 
        }));
        if (existingParticipantUIDs.length === 0) { // If new expense in group, preselect all
            group.members.forEach(m => preselectedUIDs.add(m.uid));
        }
      } else { initialParticipants = [currentUserDisplay]; }
    } catch (e) { 
      console.error("Error fetching group members for AddExpensePage:", e); 
      initialParticipants = [currentUserDisplay]; 
    }
  } else if (friendId) { 
    initialParticipants.push(currentUserDisplay); 
    if (existingParticipantUIDs.length === 0) preselectedUIDs.add(currentUser.uid);
    try { 
      const friendRef = firebaseDoc(db, "users", friendId); 
      const friendSnap = await getFirebaseDoc(friendRef); 
      if (friendSnap.exists()) { 
        const f = friendSnap.data(); 
        initialParticipants.push({ id: friendId, name: f.username || f.firstName || `Friend ${friendId.slice(0,5)}` });
        if (existingParticipantUIDs.length === 0) preselectedUIDs.add(friendId); 
      } else { initialParticipants.push({ id: friendId, name: `Friend ${friendId.slice(0,5)} (N/A)` }); }
    } catch (e) { initialParticipants.push({ id: friendId, name: `Friend ${friendId.slice(0,5)} (Err)` }); }
  } else { // General expense
    initialParticipants = [currentUserDisplay];
    if (existingParticipantUIDs.length === 0) preselectedUIDs.add(currentUser.uid);
  }
  
  const uniqueParticipants = []; 
  const idsProcessed = new Set();
  initialParticipants.forEach(p => { 
    if (!idsProcessed.has(p.id)) { 
      idsProcessed.add(p.id); 
      uniqueParticipants.push(p); 
    } 
  });
  // Ensure all explicitly passed existingParticipantUIDs are options if not already present
  for (const uid of existingParticipantUIDs) {
      if (!idsProcessed.has(uid)) {
          // Minimal info for participants not in current context but part of an old expense
          uniqueParticipants.push({id: uid, name: `User ${uid.substring(0,5)} (Prev.)`});
          idsProcessed.add(uid);
      }
  }
  return { participants: uniqueParticipants, preselectedUIDs: Array.from(preselectedUIDs) };
};


const AddExpensePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { expenseIdToEdit } = useParams();
  const isEditMode = !!expenseIdToEdit;

  const { state: routeState } = location;
  
  // Use useMemo for values derived from routeState to stabilize them for useEffect dependencies
  const contextGroupId = useMemo(() => !isEditMode ? routeState?.groupId : null, [isEditMode, routeState?.groupId]);
  const contextGroupName = useMemo(() => !isEditMode ? routeState?.groupName : null, [isEditMode, routeState?.groupName]);
  const contextFriendId = useMemo(() => !isEditMode ? routeState?.friendId : null, [isEditMode, routeState?.friendId]);
  const contextFriendUsername = useMemo(() => !isEditMode ? routeState?.friendUsername : null, [isEditMode, routeState?.friendUsername]);
  const preselectParticipantsFromStateForP2PAdd = useMemo(() => 
    !isEditMode && Array.isArray(routeState?.participantsToPreselect) 
      ? routeState.participantsToPreselect.map(p => p.id) 
      : [], 
  [isEditMode, routeState?.participantsToPreselect]);


  const { currentUser, userData, authLoading } = useAuth();
  const [apiError, setApiError] = useState('');
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [pageTitle, setPageTitle] = useState(isEditMode ? "Loading Expense..." : "Add New Expense");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [originalExpenseData, setOriginalExpenseData] = useState(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors }, reset, getValues } = useForm({
    defaultValues: { title: '', amount: '', paidBy: '', date: new Date().toISOString().split('T')[0], splitType: 'equally', notes: '', category: '', participants: [], splitDetails: [] },
  });
  const { fields, replace } = useFieldArray({ control, name: 'splitDetails' });
  const watchedAmount = watch('amount'); // RHF typically handles number conversion if valueAsNumber
  const watchedSplitType = watch('splitType');
  const watchedSelectedParticipantsUIDs = watch('participants') || [];

  // Main useEffect for form setup
  useEffect(() => {
    if (authLoading) { setIsLoadingData(true); return; }
    if (!currentUser || !userData) { setApiError("User data not available."); setIsLoadingData(false); return; }
    
    setIsLoadingData(true); setApiError('');

    const setupForm = async () => {
      let fetchedExpense = null;
      let effectiveGroupId = contextGroupId;
      let effectiveFriendId = contextFriendId;
      let initialParticipantUIDsForSplit = preselectParticipantsFromStateForP2PAdd;

      if (isEditMode && expenseIdToEdit) {
        try {
          fetchedExpense = await getExpenseDetails(expenseIdToEdit);
          if (!fetchedExpense) { setApiError("Expense not found or permission denied."); setIsLoadingData(false); return; }
          if (fetchedExpense.createdByUID !== currentUser.uid && fetchedExpense.paidByUID !== currentUser.uid ) {
            setApiError("You don't have permission to edit this expense."); setIsLoadingData(false); return;
          }
          setOriginalExpenseData(fetchedExpense);
          effectiveGroupId = fetchedExpense.groupId; 
          initialParticipantUIDsForSplit = fetchedExpense.participantUIDs || [];
          
          let titlePrefix = "Edit Expense";
          if (effectiveGroupId) { const group = await getGroupDetails(effectiveGroupId); if (group) titlePrefix = `Edit Expense in "${group.name}"`; }
          else if (fetchedExpense.participantUIDs?.length === 2) { const otherUid = fetchedExpense.participantUIDs.find(uid => uid !== currentUser.uid); if (otherUid) { const friendUserDoc = await getFirebaseDoc(firebaseDoc(db, "users", otherUid)); if (friendUserDoc.exists()) titlePrefix = `Edit Expense with ${friendUserDoc.data().username}`; } }
          setPageTitle(titlePrefix + (fetchedExpense.title ? `: "${fetchedExpense.title}"` : ''));
        } catch (err) { setApiError("Failed to load expense for editing. " + err.message); setIsLoadingData(false); return; }
      } else { 
        if (contextGroupId && contextGroupName) setPageTitle(`Add Expense to "${contextGroupName}"`);
        else if (contextFriendId && contextFriendUsername) setPageTitle(`Add Expense with ${contextFriendUsername}`);
        else setPageTitle("Add General Expense");
      }
      
      const { participants: parts, preselectedUIDs: finalPreselectedUIDsFromHelper } = await getParticipantsForForm(currentUser, userData, effectiveGroupId, effectiveFriendId, initialParticipantUIDsForSplit);
      setAvailableParticipants(parts);

      if (fetchedExpense) {
        reset({
          title: fetchedExpense.title, amount: parseFloat(fetchedExpense.totalAmount) || '',
          paidBy: fetchedExpense.paidByUID,
          date: fetchedExpense.expenseDate?.toDate ? fetchedExpense.expenseDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          splitType: fetchedExpense.splitType, notes: fetchedExpense.notes || '', category: fetchedExpense.category || '',
          participants: fetchedExpense.participantUIDs || [],
          splitDetails: (fetchedExpense.participants || []).map(p_detail => {
            const participantInfo = parts.find(ap => ap.id === p_detail.uid);
            let detailValuesForForm = { amount: p_detail.shareAmount || 0, percentage: 0, shares: 1 };
            if (fetchedExpense.splitType === 'percentage' && fetchedExpense.totalAmount > 0 && typeof p_detail.shareAmount === 'number') {
                detailValuesForForm.percentage = parseFloat(((p_detail.shareAmount / fetchedExpense.totalAmount) * 100).toFixed(2));
            }
            // Note: reconstructing original 'shares' count is difficult if not stored.
            // 'rawSplitDetails' on the expense doc would be needed for perfect reconstruction.
            return { participantId: p_detail.uid, name: participantInfo?.name || `User...${p_detail.uid.slice(-4)}`, ...detailValuesForForm };
          })
        });
      } else {
        // For ADD mode, set initial values
        reset({ // Reset ensures all fields are controlled if user navigates back and forth
            title: '', amount: '', 
            paidBy: currentUser.uid, // Default payer
            date: new Date().toISOString().split('T')[0], 
            splitType: 'equally', notes: '', category: '', 
            participants: finalPreselectedUIDsFromHelper.length > 0 ? finalPreselectedUIDsFromHelper : (parts.length > 0 ? parts.map(p=>p.id) : []), 
            splitDetails: []
        });
      }
      setIsLoadingData(false);
    };
    setupForm();
  }, [currentUser, userData, authLoading, expenseIdToEdit, isEditMode, contextGroupId, contextGroupName, contextFriendId, contextFriendUsername, preselectParticipantsFromStateForP2PAdd, reset]);


  // useEffect for managing splitDetails array based on selections
  useEffect(() => {
    if (isLoadingData || !availableParticipants.length || !setValue) return; // Ensure setValue is available

    const selectedParticipantObjects = availableParticipants.filter(p =>
      (watchedSelectedParticipantsUIDs || []).includes(p.id)
    );

    let newSplitDetails = [];
    if (selectedParticipantObjects.length > 0) {
      const currentAmount = parseFloat(getValues('amount')) || 0; // Use getValues for current amount
      newSplitDetails = selectedParticipantObjects.map(p => {
        const existingDetail = (getValues('splitDetails') || []).find(f => f.participantId === p.id);
        let calculatedValue = 0;
        if (watchedSplitType === 'equally' && selectedParticipantObjects.length > 0 && currentAmount > 0) {
          calculatedValue = currentAmount / selectedParticipantObjects.length;
        }
        return {
          participantId: p.id,
          name: p.name,
          amount: watchedSplitType === 'exact'
            ? (existingDetail?.amount ?? 0)
            : parseFloat(calculatedValue.toFixed(2)),
          percentage: watchedSplitType === 'percentage'
            ? (existingDetail?.percentage ?? (selectedParticipantObjects.length > 0 ? parseFloat((100 / selectedParticipantObjects.length).toFixed(2)) : 0))
            : 0,
          shares: watchedSplitType === 'shares'
            ? (existingDetail?.shares ?? 1)
            : 0,
        };
      });
    }
    // Only call replace if the structure or key values actually change.
    // A simple stringify comparison can help prevent unnecessary replace calls.
    if (JSON.stringify(fields) !== JSON.stringify(newSplitDetails)) {
        replace(newSplitDetails);
    }
  // `replace` and `getValues` from RHF are stable.
  // `availableParticipants` should only change when context (group/friend) changes or initial load.
  // `watchedSelectedParticipantsUIDs`, `watchedSplitType`, `watchedAmount` are the primary drivers.
  }, [watchedAmount, watchedSplitType, watchedSelectedParticipantsUIDs, availableParticipants, replace, isLoadingData, getValues]);

  const validateSplitDetails = () => { /* ... (Keep existing, ensure it uses getValues()) ... */ 
    const data = getValues(); if(!data.splitDetails) return true; // No details to validate if empty
    if (data.splitType === 'exact') { const totalExact = data.splitDetails.reduce((sum, detail) => sum + (parseFloat(detail.amount) || 0), 0); if (data.amount && Math.abs(totalExact - parseFloat(data.amount)) > 0.015) { setApiError(`Sum of exact amounts ($${totalExact.toFixed(2)}) must equal total expense ($${parseFloat(data.amount).toFixed(2)}).`); return false; } 
    } else if (data.splitType === 'percentage') { const totalPercentage = data.splitDetails.reduce((sum, detail) => sum + (parseFloat(detail.percentage) || 0), 0); if (data.splitDetails.length > 0 && Math.abs(totalPercentage - 100) > 0.015) { setApiError(`Sum of percentages (${totalPercentage.toFixed(2)}%) must equal 100%.`); return false; } } 
    return true;
  };

  const onSubmit = async (data) => { /* ... (Keep existing onSubmit, ensure it uses finalGroupId correctly) ... */ 
    setApiError(''); if (!validateSplitDetails()) {setIsSubmittingForm(false); return;} setIsSubmittingForm(true); // Moved before validation call
    const finalGroupId = isEditMode ? originalExpenseData?.groupId : contextGroupId;
    // Ensure data sent to service matches expected structure, especially amount as number
    const expensePayload = { ...data, amount: parseFloat(data.amount) || 0, groupId: finalGroupId }; 
    try {
      if (isEditMode && expenseIdToEdit) { await updateExpenseService(expenseIdToEdit, expensePayload); alert(`Expense updated!`); } 
      else { await addExpenseService(expensePayload, finalGroupId); alert(`Expense added!`); }
      reset(); 
      let backUrl = '/dashboard'; 
      if (finalGroupId) backUrl = `/groups/${finalGroupId}`;
      else if (contextFriendId && !isEditMode) backUrl = `/friends/${contextFriendId}`;
      else if (isEditMode && originalExpenseData && !originalExpenseData.groupId) { 
          const participantsInvolved = originalExpenseData.participantUIDs || [];
          const otherUidInP2P = participantsInvolved.length === 2 ? participantsInvolved.find(uid => uid !== currentUser?.uid) : null;
          if(otherUidInP2P) backUrl = `/friends/${otherUidInP2P}`; 
      }
      navigate(backUrl);
    } catch (error) { setApiError(error.message || `Failed to ${isEditMode ? 'update' : 'add'} expense.`); } 
    finally { setIsSubmittingForm(false); }
  };
  
  // ... (Loading states and JSX for the form - largely the same as the "V1.0 Final Push Part 1" version)
  // Ensure `determinedBackLink` is calculated correctly using the memoized context variables.
  if (authLoading && !currentUser) return <p className="text-center p-10">Authenticating...</p>;
  if (isLoadingData) return <p className="text-center p-10 animate-pulse text-lg text-indigo-600">Loading expense form...</p>;
  if (isEditMode && !originalExpenseData && !isLoadingData && apiError) return <p className="text-center p-10 text-red-500">{apiError} <Link to="/dashboard" className="underline">Back to Dashboard</Link></p>;
  if (isEditMode && !originalExpenseData && !isLoadingData) return <p className="text-center p-10 text-red-500">Could not load expense data. <Link to="/dashboard" className="underline">Back to Dashboard</Link></p>;
  
  let determinedBackLink = '/dashboard'; 
    if (isEditMode && originalExpenseData) {
        if (originalExpenseData.groupId) { determinedBackLink = `/groups/${originalExpenseData.groupId}`; }
        else if (originalExpenseData.participantUIDs?.length === 2) { const otherUid = originalExpenseData.participantUIDs.find(uid => uid !== currentUser?.uid); if (otherUid) determinedBackLink = `/friends/${otherUid}`; }
    } else { 
        if (contextGroupId) determinedBackLink = `/groups/${contextGroupId}`;
        else if (contextFriendId) determinedBackLink = `/friends/${contextFriendId}`;
    }

  return ( 
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-2xl mb-10">
      <div className="flex justify-between items-center mb-8 pb-4 border-b"><h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1><Link to={determinedBackLink} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"><ArrowLeftIcon className="h-4 w-4 mr-1"/> Back</Link></div>
      {apiError && <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{apiError}</p></div>}
      {!isLoadingData && availableParticipants.length === 0 && !(isEditMode && originalExpenseData) && <div className="p-4 text-center bg-yellow-50 border border-yellow-300 rounded-md"><p className="text-yellow-700">Cannot determine participants for splitting. Ensure context is valid or add participants manually if feature allows.</p></div>}
      {(!isLoadingData && (availableParticipants.length > 0 || (isEditMode && originalExpenseData))) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input label="Title / Description" id="title" error={errors.title?.message} {...register('title', { required: 'Expense title is required.' })}/>
            <Input label="Amount ($)" id="amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: 'Amount is required.', valueAsNumber: true, min: { value: 0.01, message: 'Amount > 0.' }, })} />
            <div><label htmlFor="paidBy" className="block text-sm font-medium text-gray-700">Paid By</label><select id="paidBy" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('paidBy', { required: "Payer is required."})}>{availableParticipants.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>{errors.paidBy && <p className="mt-1 text-xs text-red-600">{errors.paidBy.message}</p>}</div>
            <Input label="Date" id="date" type="date" error={errors.date?.message} {...register('date', { required: 'Date is required.' })} />
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Split With</label><div className="space-y-2 max-h-40 overflow-y-auto border p-3 rounded-md bg-gray-50">{availableParticipants.map(participant => (<label key={participant.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-1.5 rounded"><input type="checkbox" value={participant.id} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" {...register('participants', { required: 'Select at least one person.' })} /><span className="text-sm text-gray-700">{participant.name}</span></label>))}</div>{errors.participants && <p className="mt-1 text-xs text-red-600">{errors.participants.message}</p>}</div>
            <div><label className="block text-sm font-medium text-gray-700">Split Type</label><div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">{['equally', 'exact', 'percentage', 'shares'].map(type => (<label key={type} className="flex items-center space-x-2 cursor-pointer"><input type="radio" value={type} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" {...register('splitType')} /><span className="text-sm text-gray-700 capitalize">{type === 'exact' ? 'Exact Amounts' : type}</span></label>))}</div></div>
            {watchedSplitType !== 'equally' && fields.length > 0 && (<div className="space-y-3 border-t border-gray-200 pt-4 mt-4"><h3 className="text-md font-semibold text-gray-700">Details per Person:</h3>{fields.map((field, index) => (<div key={field.id} className="grid grid-cols-2 gap-x-4 items-center"><span className="text-sm text-gray-600 truncate" title={field.name}>{field.name}</span>{watchedSplitType === 'exact' && (<Input type="number" step="0.01" placeholder="Amount ($)" {...register(`splitDetails.${index}.amount`, { valueAsNumber: true, min: 0 })} className="text-sm py-1"/>)}{watchedSplitType === 'percentage' && (<Input type="number" step="0.01" placeholder="Percent (%)" {...register(`splitDetails.${index}.percentage`, { valueAsNumber: true, min: 0, max: 100 })} className="text-sm py-1"/>)}{watchedSplitType === 'shares' && (<Input type="number" step="1" placeholder="Shares" {...register(`splitDetails.${index}.shares`, { valueAsNumber: true, min: 1 })} className="text-sm py-1"/>)}</div>))}</div>)}
            {watchedSplitType === 'equally' && fields.length > 0 && watchedAmount > 0 && (<div className="mt-2 p-3 bg-indigo-50 rounded-md text-sm text-indigo-700">Each of {fields.length} selected person(s) will owe: <span className="font-semibold">${(watchedAmount / fields.length).toFixed(2)}</span></div>)}
            <Input label="Notes (Optional)" id="notes" type="textarea" rows={3} {...register('notes')} />
            <div><label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label><select id="category" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('category')}><option value="">Select Category</option><option value="food">🍔 Food</option><option value="transport">🚗 Transport</option><option value="other">❓ Other</option></select></div>
            <div className="pt-5"><div className="flex justify-end space-x-3"><Button type="button" color="secondary" outline onClick={() => { reset(); navigate(determinedBackLink); }}>Cancel</Button><Button type="submit" color="primary" disabled={isSubmittingForm || isLoadingData}>{isSubmittingForm ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Expense')}</Button></div></div>
        </form>
      )}
    </div>
  );
};
export default AddExpensePage;