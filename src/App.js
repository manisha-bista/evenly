// src/App.js
// ... (Keep ALL existing imports: React, Router, useAuth, ALL page components, ALL service functions, ALL Heroicons)
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AddExpensePage from './pages/AddExpensePage';
import CreateGroupPage from './pages/CreateGroupPage';
import SettleUpPage from './pages/SettleUpPage';
import GroupDetailPage from './pages/GroupDetailPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import FriendsPage from './pages/FriendsPage';
import FriendDetailPage from './pages/FriendDetailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import NotificationPanel from './components/common/NotificationPanel'; 
import { 
    getUserNotificationsListener, 
    markNotificationAsRead,       
    markAllNotificationsAsRead    
} from './services/firestoreService'; 
import { 
    UserCircleIcon as SolidUserCircleIcon, 
    UsersIcon as SolidUsersIcon, // Used for Friends link in header AND Landing Page
    BellIcon as SolidBellIcon,
    // Outline icons for Landing Page features for a cleaner look on light bg
    CurrencyDollarIcon, UserGroupIcon as OutlineUserGroupIcon, ArrowPathIcon, ShieldCheckIcon, ScaleIcon 
} from '@heroicons/react/24/outline'; // Changed Landing Page icons to outline for this theme


// --- LANDING PAGE CONTENT - Refined Theme ---
const LandingPageContent = () => {
  const featureList = [
    { name: 'Track Expenses Easily', description: 'Log shared bills in seconds, from coffees to rent. No more guesswork or chasing payments.', icon: ScaleIcon },
    { name: 'Organize by Groups', description: 'Perfect for trips, housemates, projects, or any shared venture. Keep all group spending clear.', icon: OutlineUserGroupIcon },
    { name: 'Settle Up Smartly', description: 'Clear balances show who owes whom. Record payments in cash or digitally, and stay even.', icon: ArrowPathIcon },
    { name: 'Transparent & Fair', description: 'Everyone involved sees the splits and payments, building trust and ensuring fairness.', icon: ShieldCheckIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-gray-700 flex flex-col"> {/* Softer base background */}
      {/* Navigation Bar */}
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-5 sm:py-6">
          <Link to="/" className="text-3xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            Evenly
          </Link>
          <div className="space-x-2 sm:space-x-3">
            <Link 
              to="/login" 
              className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors duration-150"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-150 shadow-sm"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col justify-center">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 md:py-24">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
            Split Bills Effortlessly, <br className="hidden sm:block"/>
            <span className="block text-indigo-600 mt-1 sm:mt-2">Keep Friendships Strong.</span>
          </h1>
          <p className="max-w-xl lg:max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed">
            Evenly is the modern solution for managing shared expenses with transparency and ease. 
            Perfect for housemates, travel buddies, and anyone sharing costs.
          </p>
          <Link
            to="/signup"
            className="inline-block w-auto px-8 py-3.5 sm:px-10 sm:py-4 text-md sm:text-lg font-semibold bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transform hover:scale-105 transition-all duration-200"
          >
            Get Started - It's Free
          </Link>
        </section>

        {/* Optional: Placeholder for an image or illustration. 
            If you have one, place it in public folder (e.g., public/images/hero-app-mockup.png)
            and use src="/images/hero-app-mockup.png"
        <section className="container mx-auto px-6 my-10 md:my-16 flex justify-center">
            <div className="bg-white p-2 rounded-xl shadow-2xl max-w-3xl">
                 <img src="/images/your-app-screenshot-or-mockup.png" alt="Evenly App in action" className="rounded-lg"/>
            </div>
        </section>
        */}

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-white border-t border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything You Need, Nothing You Don't</h2>
              <p className="text-gray-600 text-lg max-w-xl mx-auto">Focus on fairness and forget the financial friction.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {featureList.map((feature) => (
                <div key={feature.name} className="flex items-start space-x-4 p-1">
                  <div className="flex-shrink-0 mt-1 flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white shadow">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1.5">{feature.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-slate-50"> {/* Consistent with page background */}
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
                  Ready to Make Splitting Bills Simple?
                </h2>
                <Link
                    to="/signup"
                    className="inline-block px-10 py-4 text-xl font-semibold bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transform hover:scale-105 transition-all duration-200"
                >
                    Create Your Free Account
                </Link>
            </div>
        </section>
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Evenly. Share Smarter. (Demo Application)</p>
      </footer>
    </div>
  );
};


function App() {
  // ... (The rest of your App component, including authLoading, currentUser, userData,
  // notification state, useEffects, handlers, and the main Router logic
  // REMAINS EXACTLY THE SAME as the last fully correct version that fixed ESLint issues.)
  const { authLoading, currentUser, userData, logout: appLogout } = useAuth();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const notificationTriggerRef = useRef(null); 
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  useEffect(() => { let unsubscribe = () => {}; if (currentUser?.uid && !authLoading) { unsubscribe = getUserNotificationsListener(currentUser.uid, (fetchedNotifications) => { setNotifications(fetchedNotifications); setUnreadNotificationCount(fetchedNotifications.filter(n => !n.isRead).length); }); return () => unsubscribe(); } else { setNotifications([]); setUnreadNotificationCount(0); } }, [currentUser, authLoading]);
  useEffect(() => { const handleClickOutside = (event) => { if (isNotificationPanelOpen && notificationTriggerRef.current && !notificationTriggerRef.current.contains(event.target) ) { setIsNotificationPanelOpen(false); } }; if (isNotificationPanelOpen) { document.addEventListener('mousedown', handleClickOutside); } else { document.removeEventListener('mousedown', handleClickOutside); } return () => document.removeEventListener('mousedown', handleClickOutside); }, [isNotificationPanelOpen]);
  const handleMarkAsRead = async (notificationId) => { if (currentUser?.uid && notificationId) { try { await markNotificationAsRead(currentUser.uid, notificationId); } catch (error) { console.error("App.js: Failed to mark notification as read", error); } } };
  const handleMarkAllAsRead = async () => { if (currentUser?.uid) { try { await markAllNotificationsAsRead(currentUser.uid); } catch (error) { console.error("App.js: Failed to mark all as read", error); } } };
  if (authLoading) { return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-2xl font-semibold text-indigo-600 animate-pulse">Initializing Evenly...</p></div>; }
  let mainContent;
  if (!currentUser) { mainContent = ( <Routes><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/verify-email" element={<VerifyEmailPage />} /><Route path="*" element={<LandingPageContent />} /></Routes> );
  } else if (!currentUser.emailVerified) { mainContent = ( <Routes><Route path="/verify-email" element={<VerifyEmailPage />} /><Route path="*" element={<Navigate to="/verify-email" state={{ email: currentUser.email }} replace />} /></Routes> );
  } else { mainContent = ( <div className="min-h-screen bg-slate-100 text-gray-800 font-sans"> <div className="container mx-auto p-4 sm:p-6 lg:px-8"> <header className="py-6 mb-8 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4"> <Link to="/dashboard" className="text-3xl lg:text-4xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Evenly</Link> {userData && ( <nav className="flex items-center space-x-3 sm:space-x-4"> <Link to="/friends" className="text-sm font-medium text-gray-600 hover:text-indigo-600 flex items-center p-2 rounded-md hover:bg-gray-200 transition-colors"><SolidUsersIcon className="h-5 w-5 sm:mr-1.5" /> <span className="hidden sm:inline">Friends</span></Link> <div className="relative" ref={notificationTriggerRef}> <button onClick={() => setIsNotificationPanelOpen(prev => !prev)} className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors relative" aria-label="View notifications" aria-expanded={isNotificationPanelOpen}> <SolidBellIcon className="h-6 w-6" /> {unreadNotificationCount > 0 && (<span className="absolute top-1 right-1 flex h-3.5 w-3.5 min-w-[0.75rem] items-center justify-center rounded-full bg-red-500 p-0.5 text-[8px] font-medium text-white ring-1 ring-white">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>)} </button> {isNotificationPanelOpen && (<NotificationPanel isOpen={isNotificationPanelOpen} onClose={() => setIsNotificationPanelOpen(false)} notifications={notifications} onMarkOneRead={handleMarkAsRead} onMarkAllAsRead={handleMarkAllAsRead}/> )} </div> <Link to="/profile-settings" className="flex items-center group p-1 rounded-md hover:bg-gray-200 transition-colors"><SolidUserCircleIcon className="h-8 w-8 text-gray-400 group-hover:text-indigo-500 transition-colors" /><span className="hidden sm:inline ml-2 text-sm text-gray-600 group-hover:text-indigo-600 group-hover:underline">{userData.username || currentUser.email}</span></Link> <button onClick={appLogout} className="px-3 sm:px-4 py-2 bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-red-700 shadow-sm transition duration-150">Logout</button> </nav> )} </header> <main className="py-1"> <Routes> <Route path="/" element={<Navigate to="/dashboard" replace />} /> <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} /> <Route path="/add-expense" element={<ProtectedRoute><AddExpensePage /></ProtectedRoute>} /> <Route path="/expense/:expenseIdToEdit/edit" element={<ProtectedRoute><AddExpensePage /></ProtectedRoute>} /> <Route path="/create-group" element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} /> <Route path="/settle-up" element={<ProtectedRoute><SettleUpPage /></ProtectedRoute>} /> <Route path="/settlement/:settlementIdToEdit/edit" element={<ProtectedRoute><SettleUpPage /></ProtectedRoute>} />  <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} /> <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} /> <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} /> <Route path="/friends/:friendId" element={<ProtectedRoute><FriendDetailPage /></ProtectedRoute>} />  <Route path="/login" element={<Navigate to="/dashboard" replace />} />  <Route path="/signup" element={<Navigate to="/dashboard" replace />} />  <Route path="/forgot-password" element={<Navigate to="/dashboard" replace />} />  <Route path="/verify-email" element={<Navigate to="/dashboard" replace />} /> <Route path="*" element={<div className="text-center py-10"><h2 className="text-3xl font-bold text-red-600">404 - Page Not Found!</h2><p className="mt-4 text-gray-600">Sorry, the page does not exist.</p><Link to="/dashboard" className="mt-6 inline-block px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700">Go to Dashboard</Link></div>}/> </Routes> </main> </div> </div> ); }
  return ( <Router> {mainContent} </Router> );
}
export default App;