// src/components/friends/FriendCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { UserCircleIcon, ArrowRightCircleIcon } from '@heroicons/react/24/outline';

const FriendCard = ({ friend }) => { // friend object includes { id, username, firstName, lastName, p2pBalance }
  let balanceText = "You are settled up";
  let balanceColor = "text-gray-600";

  if (friend.p2pBalance > 0) { // Positive: friend owes current user
    balanceText = `${friend.username || 'Friend'} owes you $${friend.p2pBalance.toFixed(2)}`;
    balanceColor = "text-green-600 font-semibold";
  } else if (friend.p2pBalance < 0) { // Negative: current user owes friend
    balanceText = `You owe ${friend.username || 'friend'} $${Math.abs(friend.p2pBalance).toFixed(2)}`;
    balanceColor = "text-red-600 font-semibold";
  }

  return (
    <Link
      to={`/friends/${friend.id}`} // <<< Link to the dynamic friend detail route
      className="group flex flex-col justify-between bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 overflow-hidden border border-gray-200 hover:border-sky-300"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0 p-2.5 bg-sky-100 group-hover:bg-sky-200 transition-colors rounded-full">
            <UserCircleIcon className="h-7 w-7 text-sky-600 group-hover:text-sky-700 transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-800 group-hover:text-sky-600 transition-colors truncate" title={friend.username}>
              {friend.username || 'Unknown Friend'}
            </h3>
            {(friend.firstName || friend.lastName) && (
                <p className="text-xs text-gray-400 mt-0.5">
                    {friend.firstName} {friend.lastName}
                </p>
            )}
          </div>
        </div>
        <div className={`text-sm ${balanceColor} space-y-1 mb-1`}>
          <p>{balanceText}</p>
        </div>
      </div>
      <div className="bg-gray-50 group-hover:bg-sky-50 transition-colors px-6 py-3.5 text-sky-600 group-hover:text-sky-700 font-medium text-sm flex items-center justify-between border-t border-gray-200 group-hover:border-sky-100">
        <span>View Details & Activity</span>
        <ArrowRightCircleIcon className="h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

export default FriendCard;