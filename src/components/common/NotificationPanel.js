// src/components/common/NotificationPanel.js
import React from 'react';
import { Link } from 'react-router-dom';
import { 
    BellAlertIcon, XMarkIcon, ChatBubbleLeftEllipsisIcon,
    CurrencyDollarIcon, UserGroupIcon, CheckCircleIcon, UserPlusIcon
} from '@heroicons/react/24/outline';

const NotificationPanel = ({ notifications = [], isOpen, onClose, onMarkOneRead, onMarkAllRead }) => {
  if (!isOpen) return null;

  // --- DEBUG LOG ---
  console.log("NotificationPanel: Received 'notifications' prop:", JSON.parse(JSON.stringify(notifications)));
  // --- END DEBUG LOG ---

  const getIconComponent = (type) => { /* ... (same getIconComponent as before) ... */ 
    switch (type) { case 'expense': case 'new_expense_group': case 'expense_added_p2p': return CurrencyDollarIcon; case 'settlement': case 'settlement_recorded_group': case 'settlement_recorded_p2p': return CheckCircleIcon; case 'group': case 'added_to_group': return UserGroupIcon; case 'group_invite': return UserPlusIcon; case 'message': return ChatBubbleLeftEllipsisIcon; case 'reminder': default: return BellAlertIcon; }
  };
  
  // For debugging, let's initially NOT fall back to mock data if the prop is empty.
  // This will help us see if App.js is correctly passing an empty array or if the listener isn't working.
  const displayNotifications = notifications; 
  
  // If you want to KEEP the mock data as a fallback when real data is empty:
  // const mockNotificationsData = [
  //   { id: "MOCK_n1", type: 'expense', message: "MOCK: Alice added 'Team Lunch'", time: "mock", read: false, linkTo: "#" },
  //   { id: "MOCK_n2", type: 'settlement', message: "MOCK: You received $22.50 from Bob", time: "mock", read: true, linkTo: "#" },
  // ];
  // const displayNotifications = notifications && notifications.length > 0 ? notifications : mockNotificationsData;


  const handleNotificationClick = (notification) => {
    if (!notification.isRead && onMarkOneRead) {
      onMarkOneRead(notification.id);
    }
    onClose(); 
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-h-[calc(100vh-10rem)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-40"
      onClick={(e) => e.stopPropagation()} 
      role="dialog" aria-modal="true" aria-labelledby="notification-panel-title"
    >
      <div className="flex justify-between items-center p-3.5 sm:p-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
        <h3 id="notification-panel-title" className="text-md sm:text-lg font-semibold text-gray-900">Notifications</h3>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Close notifications panel">
          <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {displayNotifications.length === 0 ? (
        <div className="p-6 py-10 text-center text-gray-500 flex-grow flex flex-col justify-center items-center">
          <BellAlertIcon className="h-12 w-12 text-gray-300 mb-4" />
          <p className="font-semibold text-gray-700">You're all caught up!</p>
          <p className="text-sm mt-1">No new notifications right now.</p>
          {/* DEBUG: Show if prop was empty vs mock */}
          {notifications && notifications.length === 0 && <p className="text-xs mt-2 text-gray-400">(Displaying this because no real notifications were received from App.js)</p>}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-y-auto flex-grow" role="list">
          {displayNotifications.map(notif => {
            const IconComponent = getIconComponent(notif.type); 
            return (
              <li key={notif.id} className={`transition-colors duration-150 ease-in-out ${!notif.isRead ? 'bg-indigo-50 hover:bg-indigo-100' : 'bg-white hover:bg-gray-50'}`} role="listitem">
                <Link to={notif.linkTo || "#"} onClick={() => handleNotificationClick(notif)} className="block p-3.5 sm:p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-sm">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 pt-0.5 text-gray-400">
                            {IconComponent && <IconComponent className={`h-5 w-5 ${!notif.isRead ? 'text-indigo-600' : 'text-gray-500'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.timestamp?.toDate ? new Date(notif.timestamp.toDate()).toLocaleString() : notif.time}</p>
                        </div>
                         {!notif.isRead && (<div className="flex-shrink-0 self-center"><div className="h-2.5 w-2.5 bg-indigo-500 rounded-full" aria-label="Unread notification"></div></div>)}
                    </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {displayNotifications.length > 0 && onMarkAllRead && (
        <div className="p-3 text-center border-t border-gray-200 sticky bottom-0 bg-gray-50 z-10 rounded-b-xl">
            <button onClick={() => { if(onMarkAllRead) onMarkAllRead(); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline">Mark all as read</button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;