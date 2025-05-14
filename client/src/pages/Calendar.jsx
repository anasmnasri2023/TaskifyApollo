import React, { useState, useEffect } from "react";
import DefaultLayout from "../layout/DefaultLayout";
import Breadcrumb from "../components/Breadcrumb";
import EnhancedCalendar from "../components/elements/Calendar";
import ScheduleCallModal from "../components/VideoCall/ScheduleCallForm";
import VideoCallModal from "../components/VideoCall/VideoCallModal";
import NotificationManager from "../components/VideoCall/NotificationManager";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { UseAuth } from "../hooks/useAuth";
import { ROLES } from "../data/roles";
import { useDispatch, useSelector } from "react-redux";
import { 
  getCallsByParticipantId, 
  getAllScheduledCalls,
  checkUpcomingCalls, 
  setActiveCall, 
  generateRoomName, 
  markCallAsStarted 
} from "../redux/actions/VideoCalls";
import moment from "moment";

const Calendar = () => {
  const dispatch = useDispatch();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCallData, setSelectedCallData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  
  // Using the same pattern as the EnhancedCalendar for video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState("");

  // Get current user ID from auth state
  const authState = useSelector((state) => state.auth || {});
  const currentUserId = authState.user?._id || 
                        authState.user?.id || 
                        authState.data?._id || 
                        authState._id || 
                        authState.id || 
                        null;

  // Get video calls from Redux state
  const videoCalls = useSelector((state) => state.videoCalls?._ALL || []);

  // Check for upcoming calls and update local state
  useEffect(() => {
    const checkForUpcomingCalls = () => {
      const currentTime = new Date();
      const upcoming = videoCalls.filter(call => {
        const callStartTime = new Date(call.start_time);
        const timeDiff = (callStartTime - currentTime) / (1000 * 60); // Difference in minutes
        return timeDiff > 0 && timeDiff <= 60; // Calls starting in the next 60 minutes
      }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      setUpcomingCalls(upcoming);
    };

    // Check immediately
    checkForUpcomingCalls();

    // Check every 30 seconds
    const interval = setInterval(checkForUpcomingCalls, 30000);

    return () => clearInterval(interval);
  }, [videoCalls]);

  // Set up interval to check for upcoming calls
  useEffect(() => {
    // Check immediately when component mounts
    dispatch(checkUpcomingCalls());

    // Then check every minute
    const intervalId = setInterval(() => {
      dispatch(checkUpcomingCalls());
    }, 60000); // Check every 60 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch]);

  // Function to handle scheduling a new call from the calendar
  const handleScheduleCall = (callData = null) => {
    if (callData) {
      // If call data is passed, we're editing an existing call
      setSelectedCallData(callData);
      setEditMode(true);
    } else {
      // Otherwise, we're creating a new call
      setSelectedCallData(null);
      setEditMode(false);
    }
    setShowScheduleModal(true);
  };

  // Function to refresh calls after creating or updating a call
  const handleCallUpdated = () => {
    // Use participant-specific method if we have a user ID
    if (currentUserId) {
      dispatch(getCallsByParticipantId(currentUserId));
    } else {
      // Fallback to getAllScheduledCalls if no user ID (although this shouldn't happen)
      console.warn("No user ID found, fetching all calls");
      dispatch(getAllScheduledCalls());
    }
  };

  // Function to join a call - using the EXACT SAME PATTERN as the EnhancedCalendar component
  const handleJoinCall = (call) => {
    console.log("Calendar.handleJoinCall called with call:", call);
    
    // Make sure we have a valid call
    if (!call || !call._id) {
      console.error("Invalid call object received in handleJoinCall:", call);
      return;
    }
    
    // Using the exact pattern from EnhancedCalendar handleSelectEvent
    dispatch(setActiveCall(call));
    const roomName = generateRoomName(call._id, call.call_name);
    dispatch(markCallAsStarted(call._id));
    
    // Update state to show the modal
    setCurrentRoomName(roomName);
    setSelectedCall(call);
    setShowVideoCall(true);
    
    console.log("Video call initiated with roomName:", roomName);
  };

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Calendar" />

      {/* Notification Manager for Popup Notifications */}
      <NotificationManager 
        upcomingCalls={upcomingCalls} 
        onJoinCall={handleJoinCall} 
      />

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-white">Schedule</h2>
        
        <button
          onClick={() => handleScheduleCall()}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded flex items-center"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
          Schedule Video Call
        </button>
      </div>

      {/* Calendar Tabs */}
      <div className="mb-4 border-b border-stroke dark:border-strokedark">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          <li className="mr-2">
            <a 
              href="#" 
              className="inline-block p-4 text-primary border-b-2 border-primary rounded-t-lg dark:text-primary dark:border-primary"
              aria-current="page"
            >
              Calendar
            </a>
          </li>
        </ul>
      </div>

      {/* Enhanced Calendar Component */}
      <EnhancedCalendar 
        onScheduleCall={handleScheduleCall} 
        onJoinCall={handleJoinCall}
      />
      
      {/* Schedule Call Modal */}
      {showScheduleModal && (
        <ScheduleCallModal
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedCallData(null);
            setEditMode(false);
            handleCallUpdated();
          }}
          initialData={selectedCallData}
          mode={editMode ? 'edit' : 'create'}
        />
      )}

      {/* Video Call Modal */}
      {showVideoCall && selectedCall && currentRoomName && (
        <VideoCallModal
          roomName={currentRoomName}
          onClose={() => {
            console.log("Closing VideoCallModal");
            setShowVideoCall(false);
            setSelectedCall(null);
            setCurrentRoomName("");
            dispatch(clearActiveCall());
          }}
        />
      )}
    </DefaultLayout>
  );
};

export default Calendar;