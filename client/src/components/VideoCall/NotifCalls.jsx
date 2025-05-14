import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { setActiveCall, generateRoomName, markCallAsStarted } from "../../redux/actions/VideoCalls";

const NotifCalls = ({ onJoinCall }) => {
  const dispatch = useDispatch();
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  
  // Get the video calls from Redux state
  const videoCallsState = useSelector((state) => state.videoCalls || {});
  
  // Update upcoming calls whenever video calls state changes
  useEffect(() => {
    // Get the upcoming calls from Redux state
    const allCalls = videoCallsState._ALL || [];
    
    // Filter calls that are upcoming (within the next 24 hours)
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Filter calls that start in the future and within next 24 hours
    const filtered = allCalls.filter(call => {
      if (!call || !call.start_time) return false;
      
      const startTime = new Date(call.start_time);
      return startTime > now && startTime <= next24Hours;
    });
    
    // Sort by start time (earliest first)
    filtered.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    // Update state with filtered calls
    setUpcomingCalls(filtered);
  }, [videoCallsState]);
  
  // Handle joining a call - mimicking exactly how the calendar handles it
  const handleJoinCall = (call) => {
    console.log("NotifCalls: Join button clicked with call:", call);
    
    // Make sure we have a valid call
    if (!call || !call._id) {
      console.error("NotifCalls: Invalid call object:", call);
      return;
    }
    
    // Replicate the exact steps from the calendar's selectEvent handler
    dispatch(setActiveCall(call));
    const roomName = generateRoomName(call._id, call.call_name);
    dispatch(markCallAsStarted(call._id));
    
    // Pass the call and roomName to the parent handler
    if (typeof onJoinCall === 'function') {
      // The pattern expects a call object, but some implementations might expect roomName too
      onJoinCall(call, roomName);
    } else {
      console.error("NotifCalls: onJoinCall is not a function");
    }
  };
  
  // If no upcoming calls, return null or an empty message
  if (upcomingCalls.length === 0) {
    return (
      <div className="bg-white dark:bg-boxdark p-4 rounded-md shadow-sm mb-4">
        <h4 className="text-sm font-semibold mb-2">Upcoming Calls</h4>
        <p className="text-sm text-gray-500 dark:text-bodydark">No upcoming calls in the next 24 hours</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-boxdark p-4 rounded-md shadow-sm mb-4">
      <h4 className="text-sm font-semibold mb-2">Upcoming Calls</h4>
      <div className="space-y-2">
        {upcomingCalls.map((call) => {
          const startTime = moment(call.start_time).format('h:mm A');
          const timeFromNow = moment(call.start_time).fromNow();
          
          // Format participants for display
          let participantsInfo = "";
          if (call.participants && Array.isArray(call.participants) && call.participants.length > 0) {
            if (typeof call.participants[0] === 'object' && call.participants[0] !== null) {
              participantsInfo = call.participants
                .slice(0, 3)
                .map(p => p.fullName || p.email || "Unnamed")
                .join(", ");
              
              if (call.participants.length > 3) {
                participantsInfo += ` and ${call.participants.length - 3} more`;
              }
            } else {
              participantsInfo = `${call.participants.length} participant${call.participants.length !== 1 ? 's' : ''}`;
            }
          }
          
          return (
            <div key={call._id} className="border-l-4 border-indigo-500 pl-3 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-medium text-sm">{call.call_name || "Video Call"}</h5>
                  <p className="text-xs text-gray-500 dark:text-bodydark">
                    {startTime} ({timeFromNow})
                    {call.duration && ` • ${call.duration} min`}
                  </p>
                  {participantsInfo && (
                    <p className="text-xs text-gray-600 dark:text-bodydark mt-1">
                      With: {participantsInfo}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleJoinCall(call)}
                  className="bg-indigo-500 text-white text-xs px-3 py-1 rounded-full hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Join
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotifCalls;