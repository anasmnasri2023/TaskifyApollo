import React, { useState, useEffect } from 'react';
import NotificationPopup from './NotificationPopup';

const NotificationManager = ({ upcomingCalls, onJoinCall }) => {
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [notificationQueue, setNotificationQueue] = useState([]);
  
  // Process queue - show no more than 3 notifications at once
  useEffect(() => {
    if (notificationQueue.length > 0 && activeNotifications.length < 3) {
      const nextCall = notificationQueue[0];
      setActiveNotifications(prev => [...prev, nextCall]);
      setNotificationQueue(prev => prev.slice(1));
    }
  }, [notificationQueue, activeNotifications]);
  
  // Handle new upcoming calls
  useEffect(() => {
    // Find calls that aren't already being shown or queued
    const newCalls = upcomingCalls.filter(
      call => !activeNotifications.some(n => n._id === call._id) && 
             !notificationQueue.some(n => n._id === call._id)
    );
    
    if (newCalls.length > 0) {
      // Sort by start time (closest first)
      const sortedNewCalls = [...newCalls].sort(
        (a, b) => new Date(a.start_time) - new Date(b.start_time)
      );
      
      setNotificationQueue(prev => [...prev, ...sortedNewCalls]);
    }
  }, [upcomingCalls, activeNotifications, notificationQueue]);
  
  // Handle joining a call
  const handleJoinCall = (call) => {
    console.log("NotificationManager: handleJoinCall called with call:", call);
    
    // Remove the notification from active list
    setActiveNotifications(prev => prev.filter(item => item._id !== call._id));
    
    // Pass the call object to the parent handler
    if (typeof onJoinCall === 'function') {
      onJoinCall(call);
    } else {
      console.error("NotificationManager: onJoinCall is not a function");
    }
  };
  
  // Handle dismissing a notification
  const handleDismiss = (callId) => {
    setActiveNotifications(prev => prev.filter(call => call._id !== callId));
  };
  
  return (
    <div className="fixed right-4 bottom-4 space-y-4 z-50 flex flex-col-reverse items-end">
      {activeNotifications.map((call, index) => (
        <div key={call._id} style={{ marginBottom: index > 0 ? '1rem' : '0' }}>
          <NotificationPopup 
            call={call} 
            onJoin={handleJoinCall} 
            onDismiss={() => handleDismiss(call._id)} 
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationManager;