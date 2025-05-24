// src/components/expenses/ExpenseItem.js
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import Button from '../common/Button';

const ExpenseItem = ({ expense, onEdit, onDelete, groupMembers = [] }) => {
  const { currentUser } = useAuth();

  const payer = groupMembers.find(m => m.uid === expense.paidByUID) || 
                (expense.paidByUID === currentUser.uid ? { username: 'You' } : { username: 'Unknown Payer' });
  
  const userIsPayer = expense.paidByUID === currentUser.uid;
  // In a group context, a group admin might also be able to edit/delete.
  // For now, only payer or creator (if different, though often same for initial add).
  // Let's simplify: only payer or creator can edit/delete.
  const canManage = userIsPayer || expense.createdByUID === currentUser.uid;

  // Determine what the current user's involvement is for this expense
  let userInvolvement = "";
  const userParticipantDetail = expense.participants.find(p => p.uid === currentUser.uid);

  if (userParticipantDetail) {
    if (expense.paidByUID === currentUser.uid) {
      // User paid. How much are they effectively getting back from others for this expense?
      let totalOthersShares = 0;
      expense.participants.forEach(p => {
        if (p.uid !== currentUser.uid) {
          totalOthersShares += p.shareAmount;
        }
      });
      if (totalOthersShares > 0) {
        userInvolvement = `You paid, get back $${totalOthersShares.toFixed(2)}`;
      } else if (expense.participants.length === 1 && expense.participants[0].uid === currentUser.uid) {
        userInvolvement = `You paid (personal expense)`;
      } else {
         userInvolvement = `You paid, all settled for this expense`;
      }
    } else {
      // Someone else paid, user owes their share
      userInvolvement = `You owe $${userParticipantDetail.shareAmount.toFixed(2)}`;
    }
  } else {
    userInvolvement = "Not directly involved in split." // Should not happen if listed via participantUIDs
  }


  return (
    <li className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-lg font-semibold text-indigo-700">{expense.title}</h3>
          <p className="text-xs text-gray-500">
            On: {expense.expenseDate?.toDate ? new Date(expense.expenseDate.toDate()).toLocaleDateString() : 'N/A'}
            {expense.category && ` • ${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}`}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Paid by: <strong className="font-medium">{payer.username}</strong>
          </p>
          {userParticipantDetail && (
            <p className={`text-sm mt-0.5 font-medium ${expense.paidByUID === currentUser.uid ? (userInvolvement.includes('get back') ? 'text-green-600' : 'text-gray-700') : 'text-red-600'}`}>
                {userInvolvement}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-gray-800">${parseFloat(expense.totalAmount).toFixed(2)}</p>
          {canManage && (
            <div className="mt-2 flex justify-end space-x-2">
              <Button onClick={() => onEdit(expense)} size="sm" color="secondary" outline iconOnly title="Edit Expense">
                <PencilSquareIcon className="h-4 w-4" />
              </Button>
              <Button onClick={() => onDelete(expense.id, expense.title)} size="sm" color="danger" outline iconOnly title="Delete Expense">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {expense.notes && (
        <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">Notes: {expense.notes}</p>
      )}
      {/* TODO: Expandable section to show full split details if complex */}
    </li>
  );
};

export default ExpenseItem;