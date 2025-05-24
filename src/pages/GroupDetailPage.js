// src/pages/GroupDetailPage.js
// ... (all existing imports from the version in "Next 10 important steps" - after ESLint fixes)
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    getGroupDetails, getGroupExpenses, getGroupSettlements,
    calculateUserBalanceInGroupWithSettlements,
    searchUsersByUsername, addUserToGroup,
    updateGroupName, removeUserFromGroup, leaveGroup,
    deleteExpense as deleteExpenseService 
} from '../services/firestoreService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ExpenseItem from '../components/expenses/ExpenseItem';
import { 
    UserPlusIcon, UsersIcon, ArrowLeftIcon, DocumentPlusIcon, CurrencyDollarIcon, 
    UserCircleIcon, CheckCircleIcon, PencilIcon, TrashIcon, ArrowRightOnRectangleIcon, 
    ExclamationTriangleIcon, InformationCircleIcon, ArchiveBoxXMarkIcon
} from '@heroicons/react/24/outline'; // Added more icons for states

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [memberBalances, setMemberBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // ... (all other state variables: isEditingGroupName, add member UI states, modal states - keep them)
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMemberUI, setShowAddMemberUI] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: null, confirmText: 'Confirm', confirmColor: 'indigo' });
  
  const isGroupAdmin = group && userData && group.members.find(m => m.uid === userData.uid)?.role === 'admin';

  const fetchAllGroupData = useCallback(async (showSuccessMessage = false) => {
    // ... (keep existing fetchAllGroupData logic)
    if (!groupId || !currentUser) { setError("Context missing."); setLoading(false); return; }
    setLoading(true); setError(''); if (!showSuccessMessage) setActionSuccess('');
    try {
      const groupDetails = await getGroupDetails(groupId);
      if (!groupDetails || !groupDetails.memberUIDs?.includes(currentUser.uid)) { setError("Group not found or you're not a member."); setGroup(null); setLoading(false); return; }
      setGroup(groupDetails); setNewGroupName(groupDetails.name);
      const [groupExpensesData, groupSettlementsData] = await Promise.all([getGroupExpenses(groupId), getGroupSettlements(groupId)]);
      setExpenses(groupExpensesData);
      if (groupDetails.members) {
        const balances = groupDetails.members.map(member => {
          const balanceInfo = calculateUserBalanceInGroupWithSettlements(member.uid, groupExpensesData, groupSettlementsData);
          return { uid: member.uid, username: member.username, role: member.role, balance: parseFloat(balanceInfo.netInGroup.toFixed(2)) };
        });
        setMemberBalances(balances);
      }
      if (showSuccessMessage && !actionSuccess && !error) setActionSuccess("Group data refreshed.");
    } catch (err) { setError(err.message || "Could not load group data."); } 
    finally { setLoading(false); if(showSuccessMessage) {setTimeout(() => setActionSuccess(''), 3000);} }
  }, [groupId, currentUser, actionSuccess, error]);

  useEffect(() => { fetchAllGroupData(); }, [fetchAllGroupData]);

  // ... (all handler functions: handleEditExpense, confirmDeleteExpense, handleDeleteExpense, handleSearchUsers, handleAddMember, handleSettleUpWithMember, handleUpdateGroupName, confirmRemoveMember, handleRemoveMember, confirmLeaveGroup, handleLeaveGroup - keep them as is)
  const handleEditExpense = (expenseToEdit) => { navigate(`/expense/${expenseToEdit.id}/edit`); };
  const confirmDeleteExpense = (expenseId, expenseTitle) => { setModalContent({ title: `Delete "${expenseTitle}"?`, message: "This will affect balances and cannot be undone.", onConfirm: () => handleDeleteExpense(expenseId), confirmText: 'Delete', confirmColor: 'red' }); setShowConfirmModal(true); };
  const handleDeleteExpense = async (expenseId) => { setShowConfirmModal(false); setActionError(''); setActionSuccess(''); try { await deleteExpenseService(expenseId); setActionSuccess("Expense deleted successfully."); fetchAllGroupData(true); } catch (err) { setActionError("Failed to delete expense: " + err.message); } };
  const handleSearchUsers = async () => { if (memberSearchTerm.trim().length < 3) { setMemberSearchResults([]); setAddMemberError('Min 3 chars.'); return; } setIsSearchingMembers(true); setAddMemberError(''); try { const users = await searchUsersByUsername(memberSearchTerm); const existingMemberUIDs = group?.memberUIDs || []; setMemberSearchResults(users.filter(user => !existingMemberUIDs.includes(user.id))); } catch (err) { setAddMemberError('Failed to search.'); } finally { setIsSearchingMembers(false); } };
  const handleAddMember = async (userToAdd) => { if (!group || !isGroupAdmin) { setAddMemberError("Admin only."); return; } setAddMemberError(''); if (group.memberUIDs.includes(userToAdd.id)) { setAddMemberError(`${userToAdd.username} already in group.`); return; } try { await addUserToGroup(group.id, userToAdd); setActionSuccess(`${userToAdd.username} added!`); fetchAllGroupData(true); setMemberSearchTerm(''); setMemberSearchResults([]); setShowAddMemberUI(false); } catch (err) { setAddMemberError(`Failed to add: ${err.message}`); } };
  const handleSettleUpWithMember = (member) => { navigate('/settle-up', { state: { groupId: group.id, groupName: group.name, settleWithUid: member.uid, settleWithUsername: member.username } }); };
  const handleUpdateGroupName = async () => { if (!isGroupAdmin || !group || !newGroupName.trim() || newGroupName.trim() === group.name) { setIsEditingGroupName(false); return; } setActionError(''); setActionSuccess(''); try { await updateGroupName(group.id, newGroupName); setIsEditingGroupName(false); setActionSuccess("Group name updated!"); fetchAllGroupData(true); } catch (err) { setActionError("Failed to update group name: " + err.message); } };
  const confirmRemoveMember = (memberToRemove) => { setModalContent({ title: `Remove ${memberToRemove.username}?`, message: `Remove ${memberToRemove.username} from "${group.name}"? Past records remain.`, onConfirm: () => handleRemoveMember(memberToRemove), confirmText: 'Remove Member', confirmColor: 'red' }); setShowConfirmModal(true); };
  const handleRemoveMember = async (memberToRemove) => { setShowConfirmModal(false); if (!isGroupAdmin || !group) return; setActionError(''); setActionSuccess(''); try { await removeUserFromGroup(group.id, memberToRemove.uid, group.members); setActionSuccess(`${memberToRemove.username} removed.`); fetchAllGroupData(true); } catch (err) { setActionError("Failed to remove member: " + err.message); } };
  const confirmLeaveGroup = () => { setModalContent({ title: `Leave "${group.name}"?`, message: "Are you sure? Past records remain.", onConfirm: handleLeaveGroup, confirmText: 'Leave Group', confirmColor: 'red' }); setShowConfirmModal(true); };
  const handleLeaveGroup = async () => { setShowConfirmModal(false); if (!group || !currentUser) return; setActionError(''); setActionSuccess(''); try { await leaveGroup(group.id, currentUser.uid, group); setActionSuccess("You have left the group."); navigate('/dashboard'); } catch (err) { setActionError("Failed to leave group: " + err.message); } };


  if (loading && !group) return <div className="flex justify-center items-center min-h-[60vh]"><p className="text-xl font-semibold text-indigo-600 animate-pulse">Loading Group Details...</p></div>;
  if (error) return <div className="text-center p-10"><div className="inline-flex items-center bg-red-100 text-red-700 p-4 rounded-lg shadow-md"><ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0"/>Error: {error}</div><Link to="/dashboard" className="mt-6 block text-indigo-600 hover:underline font-semibold">Return to Dashboard</Link></div>;
  if (!group) return <div className="text-center p-10"><div className="inline-flex items-center bg-yellow-100 text-yellow-700 p-4 rounded-lg shadow-md"><InformationCircleIcon className="h-6 w-6 mr-3 flex-shrink-0"/>Group not found or access denied.</div><Link to="/dashboard" className="mt-6 block text-indigo-600 hover:underline font-semibold">Return to Dashboard</Link></div>;

  const currentUserGroupBalanceDetails = memberBalances.find(b => b.uid === currentUser.uid);
  const currentUserGroupBalance = currentUserGroupBalanceDetails?.balance || 0;

  return (
    <div className="space-y-10 pb-16"> {/* Added more bottom padding */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={modalContent.title} onPrimaryAction={modalContent.onConfirm} primaryActionText={modalContent.confirmText} primaryActionColor={modalContent.confirmColor} secondaryActionText="Cancel" onSecondaryAction={() => setShowConfirmModal(false)}><p className="text-sm text-gray-600">{modalContent.message}</p></Modal>
      {actionError && <div className="fixed top-24 right-5 z-[100] mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg animate-fade-in-out" role="alert"><p>{actionError}</p></div>}
      {actionSuccess && <div className="fixed top-24 right-5 z-[100] mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg animate-fade-in-out" role="alert"><p>{actionSuccess}</p></div>}
      
      {/* ... (Header Section, Add Member Section, Member Balances Section - keep polished versions from "Block 1" fix) ... */}
      {/* These sections already have decent loading/empty/display states based on previous updates. */}
      <section className="p-6 bg-white rounded-xl shadow-xl">
         <div className="flex flex-wrap justify-between items-start mb-6 pb-4 border-b border-gray-200"><div className="flex-1 min-w-0">{!isEditingGroupName ? (<div className="flex items-center"><UsersIcon className="h-9 w-9 text-indigo-500 mr-3 flex-shrink-0"/><h1 className="text-3xl font-bold text-gray-800 truncate" title={group.name}>{group.name}</h1>{isGroupAdmin && <Button onClick={() => { setIsEditingGroupName(true); setNewGroupName(group.name); }} iconOnly color="secondary" outline className="ml-3 p-1.5 text-xs"><PencilIcon className="h-4 w-4"/></Button>}</div>) : (<div className="flex items-center gap-2"><Input id="editGroupName" value={newGroupName} onChange={(e)=>setNewGroupName(e.target.value)} className="text-3xl font-bold !py-1 !px-2 flex-grow"/><Button onClick={handleUpdateGroupName} color="primary" size="sm" className="text-xs">Save</Button><Button onClick={() => setIsEditingGroupName(false)} color="secondary" outline size="sm" className="text-xs">Cancel</Button></div>)}<p className="text-sm text-gray-500 mt-1 lg:ml-12">Created: {group.createdAt?.toDate ? new Date(group.createdAt.toDate()).toLocaleDateString() : 'N/A'} by {group.members.find(m=>m.uid === group.createdByUID)?.username || 'Unknown'}</p></div><Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center self-start sm:self-center mt-2 sm:mt-0 whitespace-nowrap"><ArrowLeftIcon className="h-5 w-5 mr-1"/> Back to Dashboard</Link></div>
        <div className={`mb-6 p-4 rounded-lg shadow ${currentUserGroupBalance === 0 ? 'bg-blue-50' : currentUserGroupBalance > 0 ? 'bg-green-50' : 'bg-red-50'}`}><h3 className={`text-lg font-semibold ${currentUserGroupBalance === 0 ? 'text-blue-700' : currentUserGroupBalance > 0 ? 'text-green-700' : 'text-red-700'}`}>Your Status in "{group.name}"</h3>{currentUserGroupBalance === 0 && <p className="text-blue-700 flex items-center"><CheckCircleIcon className="h-6 w-6 mr-2"/>You are all settled up!</p>}{currentUserGroupBalance > 0 && <p className="text-green-600 font-medium text-xl">Group owes you ${currentUserGroupBalance.toFixed(2)}</p>}{currentUserGroupBalance < 0 && <p className="text-red-600 font-medium text-xl">You owe group ${Math.abs(currentUserGroupBalance).toFixed(2)}</p>}</div>
      </section>
      {isGroupAdmin && ( <section className="p-6 bg-white rounded-xl shadow-xl"> <Button onClick={() => setShowAddMemberUI(!showAddMemberUI)} color="secondary" outline className="w-full sm:w-auto text-sm"> <UserPlusIcon className="h-5 w-5 mr-2"/> {showAddMemberUI ? 'Hide Add Member Form' : 'Add New Member'} </Button> {showAddMemberUI && ( <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-4"> <Input label="Search username" id="memberSearch" value={memberSearchTerm} onChange={(e) => { setMemberSearchTerm(e.target.value); if(e.target.value.trim().length < 3) setMemberSearchResults([]); }} placeholder="Min 3 chars" className="text-sm" /> <Button onClick={handleSearchUsers} disabled={isSearchingMembers || memberSearchTerm.trim().length < 3} color="primary" className="text-sm"> {isSearchingMembers ? 'Searching...' : 'Search'} </Button> {addMemberError && <p className="text-xs text-red-600 mt-1">{addMemberError}</p>} {memberSearchResults.length > 0 && ( <div className="mt-3"> <h4 className="text-xs font-medium text-gray-500 mb-1">Results:</h4> <ul className="space-y-1 max-h-32 overflow-y-auto border rounded-md"> {memberSearchResults.map(user => ( <li key={user.id} className="flex justify-between items-center p-2 hover:bg-indigo-50 rounded text-sm"> <span>{user.username} ({user.firstName} {user.lastName})</span> <Button size="sm" color="primary" outline onClick={() => handleAddMember(user)} className="text-xs py-1 px-2">Add</Button> </li> ))} </ul> </div> )} {memberSearchTerm.trim().length >=3 && !isSearchingMembers && memberSearchResults.length === 0 && <p className="text-xs text-gray-500 mt-2">No new users found.</p>} </div> )} </section> )}
      <section className="p-6 bg-white rounded-xl shadow-xl">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Member Balances</h2> {loading && memberBalances.length === 0 && !error && <div className="py-6 text-center text-gray-400 animate-pulse">Loading balances...</div>} {!loading && !error && memberBalances.length > 0 ? (<ul className="space-y-3">{memberBalances.map(member => (<li key={member.uid} className="flex flex-wrap justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 gap-2"><div className="flex items-center"><UserCircleIcon className={`h-8 w-8 mr-3 ${member.uid === currentUser?.uid ? 'text-indigo-500' : 'text-gray-400'}`}/><div><span className={`block font-medium ${member.uid === currentUser?.uid ? 'text-indigo-700' : 'text-gray-800'}`}>{member.username}{member.uid === currentUser?.uid && " (You)"}</span>{member.role === 'admin' && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">Admin</span>}</div></div><div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0"><span className={`font-semibold text-md ${member.balance > 0 ? 'text-green-600' : member.balance < 0 ? 'text-red-600' : 'text-blue-600'}`}>{member.balance > 0 ? `Owed $${member.balance.toFixed(2)}` : member.balance < 0 ? `Owes $${Math.abs(member.balance).toFixed(2)}` : 'Settled Up'}</span>{member.uid !== currentUser.uid && member.balance !== 0 && ( <Button onClick={() => handleSettleUpWithMember(member)} color="secondary" outline className="text-xs py-1 px-2 whitespace-nowrap">Settle Up</Button> )}{isGroupAdmin && member.uid !== currentUser.uid && ( <Button onClick={() => confirmRemoveMember(member)} color="danger" outline iconOnly className="text-xs p-1.5"><TrashIcon className="h-4 w-4"/></Button> )}</div></li>))}</ul>) : null } {!loading && !error && memberBalances.length === 0 && ( <div className="text-center py-10"><UsersIcon className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-3 text-sm text-gray-500">No members in this group, or everyone is settled up.</p></div> )}
      </section>

      {/* Expenses in this Group - Using ExpenseItem */}
      <section className="p-6 bg-white rounded-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-3 sm:mb-0">Group Expenses</h2>
          <Button onClick={() => navigate('/add-expense', { state: { groupId: group.id, groupName: group.name } })} color="primary" className="w-full sm:w-auto">
            <DocumentPlusIcon className="h-5 w-5 mr-2"/>Add Expense to "{group.name}"
          </Button>
        </div>
        {loading && expenses.length === 0 && !error && <div className="py-6 text-center text-gray-400 animate-pulse">Loading expenses...</div>}
        {!loading && !error && expenses.length > 0 ? (
          <ul className="space-y-4">
            {expenses.map(exp => (
              <ExpenseItem 
                key={exp.id} 
                expense={exp} 
                onEdit={handleEditExpense} 
                onDelete={confirmDeleteExpense}
                groupMembers={group.members}
                isGroupAdmin={isGroupAdmin}
              />
            ))}
          </ul>
        ) : null }
        {!loading && !error && expenses.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                <ArchiveBoxXMarkIcon className="mx-auto h-12 w-12 text-gray-300" /> {/* Changed Icon */}
                <p className="mt-3 text-sm font-medium text-gray-700">No expenses found for this group.</p>
                <p className="text-xs text-gray-500">Be the first to add an expense!</p>
            </div>
        )}
      </section>

      {/* Leave Group Button */}
      {group.members.length > 0 && group.memberUIDs.includes(currentUser.uid) && ( <section className="mt-8 pt-6 border-t p-6 bg-white rounded-xl shadow-xl"><Button color="danger" outline onClick={confirmLeaveGroup} className="w-full sm:w-auto"><ArrowRightOnRectangleIcon className="h-5 w-5 mr-2"/> Leave Group "{group.name}"</Button></section>)}
    </div>
  );
};

export default GroupDetailPage;