// src/components/dashboard/GroupCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon, ArrowRightCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // Added CheckCircleIcon
import { useAuth } from '../../contexts/AuthContext';

const GroupCard = ({ group }) => {
  const { currentUser } = useAuth(); // We might not need currentUser directly if balance is passed in group object
  
  // Assuming group object now contains userNetBalanceInGroup directly from DashboardPage calculation
  const userBalanceInGroup = typeof group.userNetBalanceInGroup === 'number' ? group.userNetBalanceInGroup : null;

  let balanceText = "Status unavailable";
  let balanceColor = "text-gray-500";
  let BalanceIcon = null;

  if (userBalanceInGroup !== null && userBalanceInGroup !== 'Error') {
    if (userBalanceInGroup > 0) {
      balanceText = `Owed $${userBalanceInGroup.toFixed(2)}`;
      balanceColor = "text-green-600 font-semibold";
    } else if (userBalanceInGroup < 0) {
      balanceText = `You owe $${Math.abs(userBalanceInGroup).toFixed(2)}`;
      balanceColor = "text-red-600 font-semibold";
    } else { // userBalanceInGroup is 0
      balanceText = "You're settled up!";
      balanceColor = "text-blue-600 font-semibold"; // Changed to blue for positive "settled" indication
      BalanceIcon = <CheckCircleIcon className="h-5 w-5 inline mr-1 text-blue-500" />;
    }
  } else if (userBalanceInGroup === 'Error') {
    balanceText = "Error calculating balance";
    balanceColor = "text-yellow-600 font-semibold";
  }


  return (
    <Link
      to={`/groups/${group.id}`}
      className="group flex flex-col justify-between bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 overflow-hidden border border-gray-200 hover:border-indigo-300"
    >
      <div className="p-5 sm:p-6"> {/* Consistent padding */}
        <div className="flex items-start space-x-3 mb-3"> {/* Changed to items-start for better title wrapping */}
          <div className="flex-shrink-0 p-3 bg-indigo-50 group-hover:bg-indigo-100 transition-colors rounded-full">
            <UsersIcon className="h-7 w-7 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="flex-1 min-w-0"> {/* Added min-w-0 for better truncation */}
            <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors truncate" title={group.name}>
              {group.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
                Members: {group.memberUIDs?.length || 0}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-700 space-y-1 mb-1">
          <p className="flex items-center">
            {BalanceIcon}
            Your status: <span className={`ml-1 ${balanceColor}`}>{balanceText}</span>
          </p>
        </div>
      </div>
      <div className="bg-gray-50 group-hover:bg-indigo-50 transition-colors px-6 py-3.5 text-indigo-600 group-hover:text-indigo-700 font-medium text-sm flex items-center justify-between border-t border-gray-200 group-hover:border-indigo-100">
        <span>View Group</span>
        <ArrowRightCircleIcon className="h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

export default GroupCard;