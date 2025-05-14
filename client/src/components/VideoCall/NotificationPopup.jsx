import React, { useState, useEffect } from 'react';
import moment from 'moment';

const NotificationPopup = ({ call, onJoin, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Start animation to fade in
    setTimeout(() => setVisible(true), 100);
    
    // Auto dismiss after X seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500); // Allow animation to complete before removing
    }, 10000); // Show for 10 seconds
    
    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  // Format time difference for display
  const formatTimeDiff = () => {
    const now = new Date();
    const startTime = new Date(call.start_time);
    const diffMinutes = Math.floor((startTime - now) / (1000 * 60));
    
    if (diffMinutes < 1) return "starting now";
    if (diffMinutes === 1) return "in 1 minute";
    if (diffMinutes < 60) return `in ${diffMinutes} minutes`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 1 && minutes === 0) return "in 1 hour";
    if (hours === 1) return `in 1 hour ${minutes} minutes`;
    if (minutes === 0) return `in ${hours} hours`;
    return `in ${hours} hours ${minutes} minutes`;
  };

  // Handle notification click - join the call
  const handleNotificationClick = () => {
    console.log("NotificationPopup: Entire notification clicked with call:", call);
    setVisible(false);
    // Call the join function with the call object
    if (typeof onJoin === 'function') {
      onJoin(call);
    } else {
      console.error("NotificationPopup: onJoin is not a function");
    }
  };

  return (
    <div 
      className={`w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-l-4 border-blue-500 transition-all duration-500 transform cursor-pointer hover:shadow-2xl ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      } notification-glow notification-pulse`}
      onClick={handleNotificationClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Upcoming Call
            </p>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent the notification click event
            setVisible(false);
            setTimeout(onDismiss, 500);
          }} 
          className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="mt-3">
        <h3 className="font-semibold text-sm">{call.call_name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimeDiff()} • {moment(call.start_time).format('h:mm A')}
        </p>
        
        {call.participants && call.participants.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            With: {typeof call.participants[0] === 'object' 
              ? call.participants.slice(0, 2).map(p => p.fullName || p.email).join(", ") + 
                (call.participants.length > 2 ? ` and ${call.participants.length - 2} more` : '')
              : `${call.participants.length} participants`
            }
          </p>
        )}
      </div>
      
      <div className="mt-3 flex justify-center">
        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Click to join the call
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;