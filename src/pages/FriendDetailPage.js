// src/pages/FriendDetailPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    getDirectP2PExpenses, 
    getDirectP2PSettlements,
    calculateDirectP2PBalanceWithFriend,
    deleteExpense as deleteExpenseService // For deleting P2P expenses
} from '../services/firestoreService';
import Button from '../components/common/Button';
import ExpenseItem from '../components/expenses/ExpenseItem';
import Modal from '../components/common/Modal';
import { 
    UserCircleIcon, ArrowLeftIcon, DocumentPlusIcon, CurrencyDollarIcon, 
    ExclamationTriangleIcon, CheckCircleIcon, ScaleIcon, CalendarDaysIcon, TagIcon
} from '@heroicons/react/24/outline'; // Added CalendarDaysIcon, TagIcon

const FriendDetailPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData: currentUserData } = useAuth();

  const [friendData, setFriendData] = useState(null);
  const [p2pExpenses, setP2PExpenses] = useState([]);
  const [p2pSettlements, setP2PSettlements] = useState([]);
  const [p2pNetBalance, setP2PNetBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const fetchFriendDetailsAndActivity = useCallback(async () => {
    if (!friendId || !currentUser?.uid) { setError("Required information missing."); setLoading(false); return; }
    setLoading(true); setError(''); setActionMessage({type: '', text: ''});
    try {
      const friendDocRef = doc(db, "users", friendId);
      const friendDocSnap = await getDoc(friendDocRef);
      if (!friendDocSnap.exists()) { setError("Friend profile not found."); setLoading(false); return; }
      const fetchedFriendData = { id: friendDocSnap.id, ...friendDocSnap.data() };
      setFriendData(fetchedFriendData);

      const [expenses, settlements] = await Promise.all([
        getDirectP2PExpenses(currentUser.uid, friendId),
        getDirectP2PSettlements(currentUser.uid, friendId)
      ]);
      setP2PExpenses(expenses);
      setP2PSettlements(settlements);
      const balance = calculateDirectP2PBalanceWithFriend(currentUser.uid, friendId, expenses, settlements);
      setP2PNetBalance(balance);
    } catch (err) { setError(err.message || "Could not load friend details and activity.");
    } finally { setLoading(false); }
  }, [friendId, currentUser]);

  useEffect(() => { fetchFriendDetailsAndActivity(); }, [fetchFriendDetailsAndActivity]);

  const handleEditP2PExpense = (expense) => {
    navigate(`/expense/${expense.id}/edit`, { 
        state: { 
            isP2P: true, 
            friendId: friendId, 
            friendUsername: friendData?.username,
            // Pass participant UIDs for AddExpensePage to correctly pre-select
            preselectParticipantUIDs: [currentUser.uid, friendId]
        } 
    });
  };

  const confirmDeleteP2PExpense = (expense) => {
    setExpenseToDelete(expense);
    setShowConfirmDeleteModal(true);
  };

  const handleDeleteP2PExpense = async () => {
    if (!expenseToDelete) return; setActionMessage({type:'', text:''});
    try {
      await deleteExpenseService(expenseToDelete.id);
      setActionMessage({ type: 'success', text: `Expense "${expenseToDelete.title}" deleted.` });
      fetchFriendDetailsAndActivity(); 
    } catch (err) { setActionMessage({ type: 'error', text: `Failed to delete: ${err.message}` });
    } finally { setShowConfirmDeleteModal(false); setExpenseToDelete(null); setTimeout(() => setActionMessage({type: '', text: ''}), 4000); }
  };

  if (loading) return <p className="text-center p-10 animate-pulse text-sky-600 text-xl">Loading Friend Details...</p>;
  if (error) return <div className="text-center p-10"><div className="inline-flex items-center bg-red-100 text-red-700 p-4 rounded-lg shadow"><ExclamationTriangleIcon className="h-6 w-6 mr-3"/>Error: {error}</div><Link to="/friends" className="mt-6 block text-indigo-600 hover:underline font-semibold">Go to Friends List</Link></div>;
  if (!friendData) return <div className="text-center p-10"><p className="text-gray-600 text-lg">Friend information unavailable.</p><Link to="/friends" className="mt-6 block text-indigo-600 hover:underline font-semibold">Go to Friends List</Link></div>;

  let balanceMessage = `You and ${friendData.username} are all settled up.`;
  let balanceMessageColor = "text-blue-600";
  let BalanceIconToUse = <CheckCircleIcon className="h-6 w-6 mr-2 text-blue-500"/>;
  if (p2pNetBalance > 0) { balanceMessage = `${friendData.username} owes you $${p2pNetBalance.toFixed(2)}`; balanceMessageColor = "text-green-600"; BalanceIconToUse = <ScaleIcon className="h-6 w-6 mr-2 text-green-500 transform rotate-[-15deg]"/>; } 
  else if (p2pNetBalance < 0) { balanceMessage = `You owe ${friendData.username} $${Math.abs(p2pNetBalance).toFixed(2)}`; balanceMessageColor = "text-red-600"; BalanceIconToUse = <ScaleIcon className="h-6 w-6 mr-2 text-red-500 transform rotate-[15deg]"/>; }

  return (
    <div className="space-y-10 pb-10">
      <Modal isOpen={showConfirmDeleteModal} onClose={() => setShowConfirmDeleteModal(false)} title={`Delete "${expenseToDelete?.title}"?`} onPrimaryAction={handleDeleteP2PExpense} primaryActionText="Yes, Delete" primaryActionColor="red" secondaryActionText="Cancel" onSecondaryAction={() => setShowConfirmDeleteModal(false)}><p className="text-sm text-gray-600">Are you sure? This affects your P2P balance and cannot be undone.</p></Modal>
      {actionMessage.text && (<div className={`mb-4 p-3 rounded-md text-sm fixed top-20 right-5 z-50 shadow-lg animate-pulse ${actionMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{actionMessage.text}</div>)}

      <section className="p-6 bg-white rounded-xl shadow-xl">
        <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-4"><UserCircleIcon className="h-16 w-16 text-sky-500" /><div><h1 className="text-4xl font-bold text-gray-800">{friendData.username}</h1>{(friendData.firstName || friendData.lastName) && <p className="text-md text-gray-500">{friendData.firstName} {friendData.lastName}</p>}</div></div>
          <Link to="/friends" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center mt-2 sm:mt-0"><ArrowLeftIcon className="h-5 w-5 mr-1"/> Back to Friends</Link>
        </div>
        <div className={`mb-6 p-6 rounded-lg shadow-inner ${p2pNetBalance === 0 ? 'bg-blue-50' : p2pNetBalance > 0 ? 'bg-green-50' : 'bg-red-50'}`}><div className="flex items-center justify-center text-center">{BalanceIconToUse}<h3 className={`text-xl font-semibold ${balanceMessageColor}`}>{balanceMessage}</h3></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button color="primary" onClick={() => navigate('/add-expense', { state: { friendId: friendData.id, friendUsername: friendData.username, participantsToPreselect: [{id: currentUser.uid, name: currentUserData?.username || "You"}, {id: friendData.id, name: friendData.username}] }})} className="w-full"><DocumentPlusIcon className="h-5 w-5 mr-2"/> Add Expense</Button>
            <Button color="secondary" outline onClick={() => navigate('/settle-up', { state: { settleWithUid: friendData.id, settleWithUsername: friendData.username }})} className="w-full" disabled={p2pNetBalance === 0}><CurrencyDollarIcon className="h-5 w-5 mr-2"/> Settle Up</Button>
        </div>
      </section>

      <section className="p-6 bg-white rounded-xl shadow-xl">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Direct Expenses with {friendData.username}</h2>
        {loading && p2pExpenses.length === 0 && !error && <p className="text-gray-500 animate-pulse">Loading P2P expenses...</p>}
        {!loading && !error && p2pExpenses.length > 0 ? (
          <ul className="space-y-4">
            {p2pExpenses.map(exp => (
              <ExpenseItem key={exp.id} expense={exp} onEdit={handleEditP2PExpense} onDelete={() => confirmDeleteP2PExpense(exp)} groupMembers={[{uid: currentUser.uid, username: currentUserData?.username || "You"}, {uid: friendData.id, username: friendData.username}]} />
            ))}
          </ul>
        ) : null}
        {!loading && !error && p2pExpenses.length === 0 && (<div className="text-center py-8"><DocumentPlusIcon className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-2 text-sm text-gray-500 italic">No direct expenses shared yet.</p></div>)}
      </section>

      <section className="p-6 bg-white rounded-xl shadow-xl">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Direct Settlements with {friendData.username}</h2>
        {loading && p2pSettlements.length === 0 && !error && <p className="text-gray-500 animate-pulse">Loading P2P settlements...</p>}
        {!loading && !error && p2pSettlements.length > 0 ? (
          <ul className="space-y-3">
            {p2pSettlements.map(settle => (
              <li key={settle.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-700">
                        {settle.paidByUID === currentUser.uid ? "You paid " : `${friendData.username || 'Friend'} paid `}
                        <span className="font-bold text-indigo-600">${parseFloat(settle.amount).toFixed(2)}</span>
                        {settle.paidToUID === currentUser.uid ? " to you" : ` to ${friendData.username || 'friend'}`}
                    </p>
                    <p className="text-xs text-gray-500">
                        On: {settle.settlementDate?.toDate ? new Date(settle.settlementDate.toDate()).toLocaleDateString() : 'N/A'}
                        {settle.method && ` • ${settle.method.replace("_", " ")}`}
                    </p>
                  </div>
                  {/* TODO: Add Edit/Delete for settlements if current user recorded it */}
                </div>
                {settle.notes && <p className="mt-1 text-sm text-gray-600 border-t pt-1">Notes: {settle.notes}</p>}
              </li>
            ))}
          </ul>
        ) : null}
        {!loading && !error && p2pSettlements.length === 0 && (<div className="text-center py-8"><CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-2 text-sm text-gray-500 italic">No direct settlements recorded yet.</p></div>)}
      </section>
    </div>
  );
};
export default FriendDetailPage;