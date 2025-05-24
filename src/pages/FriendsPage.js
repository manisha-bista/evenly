// src/pages/FriendsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFriendsWithP2PBalances } from '../services/firestoreService';
import FriendCard from '../components/friends/FriendCard';
import { UsersIcon as SolidUsersIcon, UserPlusIcon } from '@heroicons/react/24/solid'; // Main page icon
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const FriendsPage = () => {
  const { currentUser, authLoading: contextAuthLoading } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState('');

  const fetchFriendsData = useCallback(async () => {
    if (!currentUser?.uid || contextAuthLoading) return;

    setLoadingFriends(true);
    setErrorFriends('');
    try {
      const friendsData = await getFriendsWithP2PBalances(currentUser.uid);
      setFriends(friendsData);
    } catch (error) {
      console.error("FriendsPage: Error fetching friends data:", error);
      setErrorFriends('Could not load your friends list.');
    } finally {
      setLoadingFriends(false);
    }
  }, [currentUser, contextAuthLoading]);

  useEffect(() => {
    fetchFriendsData();
  }, [fetchFriendsData]);

  if (contextAuthLoading && !currentUser) {
    return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-2xl font-semibold text-indigo-600 animate-pulse">Initializing...</p></div>;
  }
  if (!currentUser) { // Should be caught by ProtectedRoute if this page is protected
    return <div className="text-center p-10"><p className="text-lg text-red-600">Please log in to view your friends.</p><Link to="/login" className="text-indigo-600 hover:underline mt-2 inline-block">Login</Link></div>;
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <div className="flex items-center">
            <SolidUsersIcon className="h-10 w-10 text-sky-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Your Friends</h1>
        </div>
        <Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center mt-2 sm:mt-0">
            <ArrowLeftIcon className="h-5 w-5 mr-1"/> Back to Dashboard
        </Link>
      </header>

      {/* TODO: Add Friend Button/Search - Future Step */}
      {/* <div className="mb-6 text-right">
        <Button color="primary">
          <UserPlusIcon className="h-5 w-5 mr-2" /> Add Friend
        </Button>
      </div> */}

      {loadingFriends && <p className="text-center text-gray-500 animate-pulse py-10 text-lg">Loading friends list...</p>}
      {errorFriends && <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">{errorFriends}</p>}
      
      {!loadingFriends && !errorFriends && friends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.map(friend => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      )}

      {!loadingFriends && !errorFriends && friends.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
          <SolidUsersIcon className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-xl font-semibold text-gray-800">No friends found yet.</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
            Friends are users you share groups with or have had direct expenses/settlements with. 
            Start by creating or joining a group!
          </p>
          <Link to="/dashboard" className="mt-6 inline-block px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition">
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;