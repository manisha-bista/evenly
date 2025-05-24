// src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    getUserOverallFinancialSummary, // This now refers to the complex aggregation function
    getUserGroups,
    getGroupExpenses,
    getGroupSettlements,
    calculateUserBalanceInGroupWithSettlements 
} from '../services/firestoreService';
import GroupCard from '../components/dashboard/GroupCard';
import { UserGroupIcon, PlusCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { currentUser, userData, logout, authLoading: contextAuthLoading } = useAuth();

  // State for Overall Balances (will be fetched by the complex summary function)
  const [overallBalances, setOverallBalances] = useState(null);
  const [loadingOverallBalances, setLoadingOverallBalances] = useState(true);
  const [errorOverallBalances, setErrorOverallBalances] = useState('');

  // State for Groups and their individual balances (for GroupCards)
  const [groupsWithBalances, setGroupsWithBalances] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [errorGroups, setErrorGroups] = useState('');

  // Effect for fetching the TRUE AGGREGATED Overall Financial Summary
  useEffect(() => {
    if (currentUser?.uid && !contextAuthLoading) {
      console.log("DashboardPage: Fetching TRUE AGGREGATED overall financial summary.");
      setLoadingOverallBalances(true); 
      setErrorOverallBalances('');
      getUserOverallFinancialSummary(currentUser.uid) // This calls the complex function
        .then(summary => {
          console.log("DashboardPage: Received TRUE AGGREGATED overall summary:", summary);
          if (summary && typeof summary.youOwe === 'number' && typeof summary.youAreOwed === 'number') {
            setOverallBalances({ 
              ...summary, 
              netBalance: summary.youAreOwed - summary.youOwe 
            });
          } else { 
            setErrorOverallBalances('Invalid overall balance summary received from service.'); 
          }
          setLoadingOverallBalances(false);
        })
        .catch(error => {
          console.error("DashboardPage: Error fetching TRUE AGGREGATED overall financial summary:", error);
          setErrorOverallBalances(error.message || 'Could not load overall financial balances.');
          setLoadingOverallBalances(false);
        });
    } else if (!contextAuthLoading && !currentUser) {
      setLoadingOverallBalances(false); 
      setErrorOverallBalances('User not authenticated. Cannot fetch overall balances.'); 
      setOverallBalances(null);
    } else if (!contextAuthLoading) { 
      setLoadingOverallBalances(false); // Ensure loading stops if no fetch occurs post-auth check
    }
  }, [currentUser, contextAuthLoading]);

  // Effect for fetching user groups and then their individual balances (for GroupCards)
  const fetchGroupsAndTheirBalances = useCallback(async () => {
    if (!currentUser?.uid || contextAuthLoading) return;
    setLoadingGroups(true); setErrorGroups('');
    try {
      const userGroups = await getUserGroups(currentUser.uid);
      if (userGroups.length === 0) { 
        setGroupsWithBalances([]); 
        setLoadingGroups(false); 
        return; 
      }
      const groupsDataPromises = userGroups.map(async (group) => {
        try {
          const [groupExpenses, groupSettlements] = await Promise.all([
            getGroupExpenses(group.id),
            getGroupSettlements(group.id)
          ]);
          const balanceInfo = calculateUserBalanceInGroupWithSettlements(currentUser.uid, groupExpenses, groupSettlements);
          return { ...group, userNetBalanceInGroup: balanceInfo.netInGroup };
        } catch (groupError) { 
          console.error(`Error processing balances for group ${group.name || group.id}:`, groupError);
          return { ...group, userNetBalanceInGroup: 'Error' }; 
        }
      });
      const resolvedGroupsData = await Promise.all(groupsDataPromises);
      setGroupsWithBalances(resolvedGroupsData);
    } catch (error) { 
      console.error("DashboardPage: Error fetching groups or their balances for cards:", error);
      setErrorGroups('Could not load your groups for card display.');
    } finally { 
      setLoadingGroups(false); 
    }
  }, [currentUser, contextAuthLoading]);

  useEffect(() => {
    fetchGroupsAndTheirBalances();
  }, [fetchGroupsAndTheirBalances]);

  if (contextAuthLoading && !currentUser) { 
    return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-2xl font-semibold text-indigo-600 animate-pulse">Initializing Evenly...</p></div>;
  }
  if (!currentUser || !userData) { 
    return <div className="text-center p-10"><p className="text-lg text-red-600">User data not available. Please log in.</p><Link to="/login" className="text-indigo-600 hover:underline mt-2 inline-block">Login</Link></div>;
  }

  return (
    <div className="space-y-10 pb-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome back, <span className="text-indigo-600">{userData.firstName || userData.displayName || currentUser.email}</span>!
        </h1>
        <p className="text-lg text-gray-600 mt-1">Here’s what’s happening with your shared expenses.</p>
      </header>

      {/* Overall Balances Section - Now uses the real aggregated summary */}
      <section className="p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-700 mb-5">Overall Financial Snapshot</h2>
        {loadingOverallBalances && !errorOverallBalances && <p className="text-gray-500 animate-pulse py-8 text-center">Calculating your overall summary...</p>}
        {errorOverallBalances && <p className="text-red-500 bg-red-100 p-4 rounded-md text-center">{errorOverallBalances}</p>}
        {!loadingOverallBalances && !errorOverallBalances && overallBalances && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 bg-red-50 rounded-lg text-center"><p className="text-sm font-medium text-red-700">YOU OWE (OVERALL)</p><p className="text-3xl font-bold text-red-600 mt-1">${overallBalances.youOwe.toFixed(2)}</p></div>
            <div className="p-4 bg-green-50 rounded-lg text-center"><p className="text-sm font-medium text-green-700">YOU ARE OWED (OVERALL)</p><p className="text-3xl font-bold text-green-600 mt-1">${overallBalances.youAreOwed.toFixed(2)}</p></div>
            <div className={`p-4 rounded-lg text-center ${overallBalances.netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}><p className={`text-sm font-medium ${overallBalances.netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>NET BALANCE (OVERALL)</p><p className={`text-3xl font-bold mt-1 ${overallBalances.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{overallBalances.netBalance >= 0 ? `+$${overallBalances.netBalance.toFixed(2)}` : `-$${Math.abs(overallBalances.netBalance).toFixed(2)}`}</p></div>
          </div>
        )}
        {!loadingOverallBalances && !errorOverallBalances && !overallBalances && <p className="text-gray-500 py-8 text-center">Overall balance data currently unavailable.</p>}
      </section>

      {/* Groups Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-3 sm:mb-0">Your Groups</h2>
            <Link to="/create-group" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"><PlusCircleIcon className="h-6 w-6 mr-2"/> Create New Group</Link>
        </div>
        {loadingGroups && !errorGroups && <p className="text-gray-500 animate-pulse py-8 text-center">Loading your groups...</p>}
        {errorGroups && <p className="text-red-500 bg-red-100 p-4 rounded-md text-center">{errorGroups}</p>}
        {!loadingGroups && !errorGroups && groupsWithBalances.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {groupsWithBalances.map(groupData => (
              <GroupCard 
                key={groupData.id} 
                group={groupData} // groupData contains the group object AND userNetBalanceInGroup
                // userBalanceInGroup prop is handled by GroupCard if it checks group.userNetBalanceInGroup
              />
            ))}
          </div>
        )}
        {!loadingGroups && !errorGroups && groupsWithBalances.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
            <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300" /><h3 className="mt-4 text-xl font-semibold text-gray-800">No groups yet!</h3><p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">Groups are the heart of Evenly. Create one to start splitting bills with friends or housemates.</p>
          </div>
        )}
      </section>

      <section className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
        <Link to="/settle-up" className="inline-flex items-center justify-center px-8 py-3 bg-teal-500 text-white font-semibold rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition ease-in-out duration-150"><CurrencyDollarIcon className="h-6 w-6 mr-2"/> Settle Up Debts (Overall)</Link>
      </section>
    </div>
  );
};

export default DashboardPage;