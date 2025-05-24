// src/pages/SettleUpPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom'; // Keep useParams if you plan edit mode soon
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { 
    recordSettlement as recordSettlementService, 
    getGroupExpenses, 
    getGroupSettlements,
    calculateUserBalanceInGroupWithSettlements,
    getUsersConnectedViaGroups,
    getDirectP2PExpenses,      
    getDirectP2PSettlements, 
    calculateDirectP2PBalanceWithFriend 
    // getSettlementDetails, // Not using for edit in this version
    // updateSettlement as updateSettlementService // Not using for edit in this version
} from '../services/firestoreService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const SettleUpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { settlementIdToEdit } = useParams(); // Keep for future edit mode
  // const isEditMode = !!settlementIdToEdit;    // Keep for future edit mode

  const { currentUser, userData, authLoading } = useAuth(); 

  const { state } = location;
  const contextGroupId = state?.groupId; // From GroupDetail or FriendDetail (if P2P eventually becomes group-like)
  const contextGroupName = state?.groupName;
  const contextSettleWithUid = state?.settleWithUid; 
  const contextSettleWithUsername = state?.settleWithUsername;
  // Determine if it's a P2P settlement (no groupId, but there is a settleWithUid from FriendDetail)
  const contextIsDirectP2P = !contextGroupId && !!contextSettleWithUid;

  const [apiError, setApiError] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); 
  
  const [isGeneralModeActive, setIsGeneralModeActive] = useState(!contextGroupId && !contextIsDirectP2P);
  
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [loadingConnectedUsers, setLoadingConnectedUsers] = useState(false);

  const [targetMemberGroupBalance, setTargetMemberGroupBalance] = useState(null);
  const [p2pBalanceWithFriend, setP2PBalanceWithFriend] = useState(null);
  const [paymentDirectionPayer, setPaymentDirectionPayer] = useState('');
  const [paymentDirectionPayee, setPaymentDirectionPayee] = useState('');
  // const [originalSettlementData, setOriginalSettlementData] = useState(null); // For future edit mode

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    defaultValues: { payerUID: '', payeeUID: '', amount: '', settlementDate: new Date().toISOString().split('T')[0], paymentMethod: 'cash', notes: '' },
  });

  useEffect(() => {
    if (authLoading || !currentUser) { setIsLoadingDetails(true); return; }
    const modeIsGeneral = !contextGroupId && !contextIsDirectP2P;
    setIsGeneralModeActive(modeIsGeneral);
    setIsLoadingDetails(true);

    // Removed isEditMode logic for now from this useEffect
    if (contextGroupId && contextSettleWithUid) { 
      Promise.all([getGroupExpenses(contextGroupId), getGroupSettlements(contextGroupId)])
        .then(([groupExpenses, groupSettlements]) => {
          const balanceResult = calculateUserBalanceInGroupWithSettlements(contextSettleWithUid, groupExpenses, groupSettlements);
          setTargetMemberGroupBalance(balanceResult.netInGroup); const amount = Math.abs(balanceResult.netInGroup);
          setValue('amount', amount > 0 ? amount.toFixed(2) : '');
          if (balanceResult.netInGroup > 0) { setPaymentDirectionPayer(userData?.username || "You"); setPaymentDirectionPayee(contextSettleWithUsername); } 
          else if (balanceResult.netInGroup < 0) { setPaymentDirectionPayer(contextSettleWithUsername); setPaymentDirectionPayee(userData?.username || "You"); }
          else { setPaymentDirectionPayer(''); setPaymentDirectionPayee(''); }
          setIsLoadingDetails(false);
        }).catch(err => { setApiError("Could not load group balance."); setIsLoadingDetails(false); });
    } else if (contextIsDirectP2P && contextSettleWithUid) { 
        Promise.all([getDirectP2PExpenses(currentUser.uid, contextSettleWithUid), getDirectP2PSettlements(currentUser.uid, contextSettleWithUid)])
        .then(([p2pExpenses, p2pSettlements]) => {
            const balance = calculateDirectP2PBalanceWithFriend(currentUser.uid, contextSettleWithUid, p2pExpenses, p2pSettlements);
            setP2PBalanceWithFriend(balance); const amount = Math.abs(balance);
            setValue('amount', amount > 0 ? amount.toFixed(2) : '');
            if (balance > 0) { setPaymentDirectionPayer(contextSettleWithUsername); setPaymentDirectionPayee(userData?.username || "You"); } 
            else if (balance < 0) { setPaymentDirectionPayer(userData?.username || "You"); setPaymentDirectionPayee(contextSettleWithUsername); }
            setIsLoadingDetails(false);
        }).catch(err => { setApiError("Could not load P2P balance."); setIsLoadingDetails(false); });
    } else { // General settlement mode
      setLoadingConnectedUsers(true);
      getUsersConnectedViaGroups(currentUser.uid).then(users => {
        const self = {id: currentUser.uid, username: userData?.username || currentUser.email, ...userData};
        const uniqueOptions = [self, ...users.filter(u => u.id !== currentUser.uid)].filter((user, index, selfArr) => index === selfArr.findIndex(u => u.id === user.id));
        setConnectedUsers(uniqueOptions); setLoadingConnectedUsers(false);
        setIsLoadingDetails(false);
      }).catch(err => { setApiError("Could not load users list."); setLoadingConnectedUsers(false); setIsLoadingDetails(false);});
    }
  }, [currentUser, userData, authLoading, contextGroupId, contextSettleWithUid, contextIsDirectP2P, contextSettleWithUsername, setValue]); // Removed isEditMode, settlementIdToEdit

  const onSubmit = async (data) => { /* ... (onSubmit from previous version, it doesn't use isEditMode directly for submission path) ... */ 
    if (!currentUser) { setApiError("Auth error."); return; } setApiError(''); setIsSubmittingForm(true);
    let finalPayerUID = ''; let finalPayeeUID = ''; let currentContextBalance = null;
    // const currentIsEditMode = !!settlementIdToEdit; // Determine edit mode inside onSubmit if needed for service call

    if (isGeneralModeActive) { // General Settlement (not edit mode of a specific one yet)
        if (!data.payerUID || !data.payeeUID) { setApiError("Payer and Payee must be selected."); setIsSubmittingForm(false); return; }
        if (data.payerUID === data.payeeUID){ setApiError("Payer and Payee cannot be same."); setIsSubmittingForm(false); return; }
        finalPayerUID = data.payerUID; finalPayeeUID = data.payeeUID;
    } else if (contextGroupId && contextSettleWithUid) { // Group context Add mode
        if (targetMemberGroupBalance === null) { setApiError("Balance not loaded."); setIsSubmittingForm(false); return; }
        if (targetMemberGroupBalance === 0) { setApiError("Already settled in group."); setIsSubmittingForm(false); return; }
        currentContextBalance = targetMemberGroupBalance;
        if (targetMemberGroupBalance > 0) { finalPayerUID = currentUser.uid; finalPayeeUID = contextSettleWithUid; } 
        else { finalPayerUID = contextSettleWithUid; finalPayeeUID = currentUser.uid; }
    } else if (contextIsDirectP2P && contextSettleWithUid) { // Direct P2P Add mode
        if (p2pBalanceWithFriend === null) { setApiError("P2P Balance not loaded."); setIsSubmittingForm(false); return; }
        if (p2pBalanceWithFriend === 0) { setApiError("Already settled with friend."); setIsSubmittingForm(false); return; }
        currentContextBalance = p2pBalanceWithFriend;
        if (p2pBalanceWithFriend > 0) { finalPayerUID = contextSettleWithUid; finalPayeeUID = currentUser.uid; } 
        else { finalPayerUID = currentUser.uid; finalPayeeUID = contextSettleWithUid; }
    } else { setApiError("Cannot determine settlement context."); setIsSubmittingForm(false); return;}

    if (parseFloat(data.amount) <= 0) { setApiError("Amount must be > 0."); setIsSubmittingForm(false); return;}
    if (!isGeneralModeActive && currentContextBalance !== null && Math.abs(parseFloat(data.amount) - Math.abs(currentContextBalance)) > 0.015) {
        setApiError("Amount does not match calculated balance. Please settle the exact calculated amount or refresh.");
        setIsSubmittingForm(false); return;
    }
    
    const settlementPayload = { paidByUID: finalPayerUID, paidToUID: finalPayeeUID, amount: parseFloat(data.amount), date: data.settlementDate, method: data.paymentMethod, notes: data.notes, groupId: isGeneralModeActive ? null : contextGroupId, };
    try { 
        // if (currentIsEditMode && settlementIdToEdit) {
        //    await updateSettlementService(settlementIdToEdit, settlementPayload); // For future edit
        //    alert('Settlement updated!'); 
        // } else {
           await recordSettlementService(settlementPayload); 
           alert('Settlement recorded!'); 
        // }
        reset();
        let navigateTo = '/dashboard';
        if (contextGroupId) navigateTo = `/groups/${contextGroupId}`;
        else if (contextIsDirectP2P && contextSettleWithUid) navigateTo = `/friends/${contextSettleWithUid}`;
        // else if (currentIsEditMode && originalSettlementData?.groupId) navigateTo = `/groups/${originalSettlementData.groupId}`;
        // else if (currentIsEditMode && !originalSettlementData?.groupId) navigateTo = `/friends`; // Or specific friend
        navigate(navigateTo);
    } catch (error) { setApiError(error.message || "Failed to record/update."); } 
    finally { setIsSubmittingForm(false); }
  };
  
  // Corrected derivedPageTitle
  const derivedPageTitle = contextGroupName 
    ? `Settle Up with ${contextSettleWithUsername || 'member'} in "${contextGroupName}"` 
    : contextSettleWithUsername && contextIsDirectP2P 
        ? `Settle Up with ${contextSettleWithUsername}`
        : `Record a General Payment`;

  const backLink = contextGroupId ? `/groups/${contextGroupId}` : (contextIsDirectP2P && contextSettleWithUid ? `/friends/${contextSettleWithUid}` : '/dashboard');
  let displayBalanceVal = contextGroupId ? targetMemberGroupBalance : (contextIsDirectP2P ? p2pBalanceWithFriend : null);
  const formShouldBeDisabled = isSubmittingForm || isLoadingDetails || (!isGeneralModeActive && displayBalanceVal === 0) || (isGeneralModeActive && loadingConnectedUsers);

  if (authLoading && !currentUser) return <p className="text-center p-10">Authenticating...</p>;
  if (!currentUser) return <p className="text-center p-10">Please log in to record a settlement.</p>;
  
  return ( /* ... JSX for SettleUpPage form ... */ 
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-2xl mb-10">
      <div className="flex justify-between items-center mb-8 pb-4 border-b"><h1 className="text-2xl font-bold text-gray-800">{derivedPageTitle}</h1><Link to={backLink} className="text-sm text-indigo-600 hover:text-indigo-800">← Back</Link></div>
      {apiError && <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{apiError}</p></div>}
      {isLoadingDetails && <p className="text-center animate-pulse text-indigo-600 py-4">Loading details...</p>}
      {!isGeneralModeActive && !isLoadingDetails && displayBalanceVal !== null && ( <div className={`mb-6 p-4 rounded-md text-center ${displayBalanceVal === 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}> {displayBalanceVal === 0 ? (<div className="flex flex-col items-center"><CheckCircleIcon className="h-10 w-10 text-blue-500 mb-2"/><p className="text-lg font-semibold">All settled with {contextSettleWithUsername || 'this member'}!</p></div>) : (paymentDirectionPayer && paymentDirectionPayee && <><p className="text-lg font-medium"><span className="font-semibold text-indigo-600">{paymentDirectionPayer}</span> should pay <span className="font-semibold text-indigo-600">{paymentDirectionPayee}</span></p><p className="text-3xl font-bold text-indigo-600">${Math.abs(displayBalanceVal).toFixed(2)}</p></>)} </div> )}
      {(!isLoadingDetails && (isGeneralModeActive || displayBalanceVal !== 0) ) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {isGeneralModeActive && ( <> <div><label htmlFor="payerUID" className="block text-sm font-medium text-gray-700">Who Paid?</label><select id="payerUID" {...register('payerUID', { required: 'Payer required.'})} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={loadingConnectedUsers}><option value="">-- Select Payer --</option>{connectedUsers.map(user => <option key={user.id} value={user.id}>{user.username} ({user.firstName} {user.lastName})</option>)}</select>{errors.payerUID && <p className="mt-1 text-xs text-red-600">{errors.payerUID.message}</p>}</div> <div><label htmlFor="payeeUID" className="block text-sm font-medium text-gray-700">Who Received?</label><select id="payeeUID" {...register('payeeUID', { required: 'Payee required.'})} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={loadingConnectedUsers}><option value="">-- Select Payee --</option>{connectedUsers.map(user => <option key={user.id} value={user.id}>{user.username} ({user.firstName} {user.lastName})</option>)}</select>{errors.payeeUID && <p className="mt-1 text-xs text-red-600">{errors.payeeUID.message}</p>}</div> </> )}
            <Input label="Amount ($)" id="amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: 'Amount required.', valueAsNumber: true, min: { value: 0.01, message: 'Amount > 0.' }, })} readOnly={!isGeneralModeActive && displayBalanceVal !== null && displayBalanceVal !== 0} />
            <Input label="Date" id="settlementDate" type="date" error={errors.settlementDate?.message} {...register('settlementDate', { required: 'Date required.' })} />
            <div><label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Method</label><select id="paymentMethod" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('paymentMethod')}><option value="cash">Cash 💵</option><option value="bank_transfer">Bank 🏦</option><option value="other_app">App 📱</option><option value="other">Other</option></select></div>
            <Input label="Notes (Optional)" id="notes" type="textarea" rows={3} {...register('notes')} />
            <div className="pt-5 flex justify-end space-x-3"><Button type="button" color="secondary" outline onClick={() => navigate(backLink)}>Cancel</Button><Button type="submit" color="primary" disabled={formShouldBeDisabled}>Record Payment</Button></div>
        </form>
      )}
    </div>
  );
};
export default SettleUpPage;