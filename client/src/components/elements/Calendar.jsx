import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { FindTaskAction, RescheduleTaskAction, GetTaskCommentsAction } from "../../redux/actions/tasks";
import { 
  getAllScheduledCalls, 
  updateScheduledCall,
  setActiveCall,
  generateRoomName,
  clearActiveCall,
  getCallsByParticipantId,
  deleteScheduledCall
} from "../../redux/actions/VideoCalls";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import swal from "sweetalert";
import VideoCallModal from "../VideoCall/VideoCallModal";
import NotifCalls from "../VideoCall/NotifCalls"; // Import the new NotifCalls component

// Create the DnD Calendar component
const DnDCalendar = withDragAndDrop(Calendar);
const localizer = momentLocalizer(moment);

// Define priority colors and labels
const priorityColors = {
  "1": { color: "#4caf50", darkColor: "#5CFF5C", label: "Low Priority" },
  "2": { color: "#ff9800", darkColor: "#FFB74D", label: "Medium Priority" },
  "3": { color: "#f44336", darkColor: "#FF5252", label: "High Priority" },
  "4": { color: "#9c27b0", darkColor: "#CE93D8", label: "Critical Priority" }
};

// Video call colors
const videoCallColors = {
  light: "#6366f1",
  dark: "#818cf8"
};

// Event component for Agenda view
const AgendaEvent = ({ event }) => {
  const [expandedComments, setExpandedComments] = useState(false);
  
  // Get dark mode state
  const isDarkMode = useSelector((state) => {
    if (state.layout && state.layout.theme !== undefined) {
      return state.layout.theme === 'dark';
    }
    // Fallback to checking HTML element class if Redux state is not available
    return document.documentElement.classList.contains('dark');
  });
  
  // Helper function to render comments with toggle functionality
  const renderComments = (comments) => {
    if (!comments || !Array.isArray(comments) || comments.length === 0) return null;

    // Sort comments by date (newest first)
    const sortedComments = [...comments].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Display all comments if expanded, otherwise just the first 3
    const commentsToShow = expandedComments ? sortedComments : sortedComments.slice(0, 3);
    
    const hasMoreComments = sortedComments.length > 3;

    return (
      <div className="mt-4">
        <h5 className={`text-sm font-medium ${isDarkMode ? 'text-bodydark' : 'text-gray-700'} mb-2`}>
          Comments:
        </h5>
        <div className="space-y-3">
          {commentsToShow.map((comment, index) => (
            <div key={comment._id || index} className={`${isDarkMode ? 'bg-boxdark-2' : 'bg-gray-50'} p-3 rounded-md`}>
              <div className="flex justify-between items-start">
                <div className="font-medium text-sm">
                  {comment.by?.fullName || "User"}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-bodydark-2' : 'text-gray-500'}`}>
                  {moment(comment.createdAt).fromNow()}
                </div>
              </div>
              <div className={`mt-1 text-sm ${isDarkMode ? 'text-bodydark' : 'text-gray-700'}`}>
                {comment.content}
              </div>
            </div>
          ))}
          
          {hasMoreComments && (
            <button 
              onClick={() => setExpandedComments(!expandedComments)}
              className={`text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer font-medium ${isDarkMode ? 'bg-boxdark-2' : 'bg-blue-50'} px-3 py-1 rounded-full`}
            >
              {expandedComments 
                ? "Show fewer comments" 
                : `+ ${sortedComments.length - 3} more comment${sortedComments.length - 3 !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    );
  };

  // For video calls, show different UI
  if (event.type === "videoCall") {
    // Format participants for display
    let participantsDisplay = null;
    if (event.resource?.participants && Array.isArray(event.resource.participants)) {
      const participants = event.resource.participants;
      if (participants.length > 0) {
        // Check if participants are populated objects or just IDs
        if (typeof participants[0] === 'object' && participants[0] !== null && participants[0].fullName) {
          // Display names if available
          const participantsList = participants.map(p => p.fullName || p.email || "Unnamed user").join(", ");
          participantsDisplay = (
            <div className="mt-2 text-sm">
              <p className={`font-medium ${isDarkMode ? 'text-bodydark' : 'text-gray-700'}`}>Participants:</p>
              <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-700'} mt-1`}>{participantsList}</p>
            </div>
          );
        }
      }
    }
    
    // Format team info
    let teamDisplay = null;
    if (event.resource?.team_id) {
      const teamInfo = event.resource.team_id;
      if (typeof teamInfo === 'object' && teamInfo !== null && teamInfo.Name) {
        teamDisplay = (
          <div className="mt-2 text-sm">
            <p className={`font-medium ${isDarkMode ? 'text-bodydark' : 'text-gray-700'}`}>Team:</p>
            <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-700'} mt-1`}>{teamInfo.Name}</p>
          </div>
        );
      }
    }
    
    return (
      <div className={`mb-6 ${isDarkMode ? 'bg-boxdark' : 'bg-white'} rounded-lg shadow-sm border-l-4 transform transition-transform hover:scale-[1.01]`} style={{ borderLeftColor: isDarkMode ? videoCallColors.dark : videoCallColors.light }}>
        <div className="p-4">
          <div className="flex justify-between">
            <h4 className={`font-semibold text-lg flex items-center ${isDarkMode ? 'text-white' : 'text-black'}`}>
              <span className="mr-2">📹</span>
              {event.title}
            </h4>
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800'}`}>
              Video Call
            </div>
          </div>
          
          <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-600'} mt-2 text-sm`}>
            {moment(event.start).format('h:mm A')} to {moment(event.end).format('h:mm A')}
            {event.resource && event.resource.duration && 
              ` (${event.resource.duration} minute${event.resource.duration !== 1 ? 's' : ''})`
            }
          </p>
          
          {event.resource && event.resource.description && (
            <div className="mt-3 text-sm">
              <p className={`font-medium ${isDarkMode ? 'text-bodydark' : 'text-gray-700'}`}>Description:</p>
              <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-700'} mt-1`}>{event.resource.description}</p>
            </div>
          )}
          
          {/* Show participants if available */}
          {participantsDisplay}
          
          {/* Show team if available */}
          {teamDisplay}

          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`px-2 py-1 ${isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800'} text-xs rounded-full`}>
              {event.resource?.status || "Scheduled"}
            </span>
            {event.resource?.team_id && (
              <span className={`px-2 py-1 ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} text-xs rounded-full`}>
                Team Call
              </span>
            )}
            {event.resource?.participants && event.resource.participants.length > 0 && (
              <span className={`px-2 py-1 ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} text-xs rounded-full`}>
                {event.resource.participants.length} participant{event.resource.participants.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Get priority information for tasks
  const priorityInfo = priorityColors[event.priority] || priorityColors["2"];
  const priorityColor = isDarkMode ? priorityInfo.darkColor : priorityInfo.color;
  
  // Basic event information
  const startTime = moment(event.start).format('h:mm A');
  const endTime = moment(event.end).format('h:mm A');
  const duration = moment.duration(moment(event.end).diff(moment(event.start))).asHours();

  // Check for comments
  const hasComments = event.resource?.comments && Array.isArray(event.resource.comments) && event.resource.comments.length > 0;
  
  return (
    <div 
      className={`mb-6 ${isDarkMode ? 'bg-boxdark' : 'bg-white'} rounded-lg shadow-sm border-l-4 transform transition-transform hover:scale-[1.01]`} 
      style={{ borderLeftColor: priorityColor }}
    >
      <div className="p-4">
        <div className="flex justify-between">
          <h4 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{event.title}</h4>
          <div className="text-xs font-medium px-2 py-1 rounded-full" style={{ 
            backgroundColor: `${priorityColor}30`,
            color: priorityColor
          }}>
            {priorityInfo.label}
          </div>
        </div>
        
        {event.allDay ? (
          <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-600'} mt-2 text-sm`}>All-day task</p>
        ) : (
          <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-600'} mt-2 text-sm`}>
            {startTime} to {endTime}
            {duration >= 1 
              ? ` (${Math.round(duration * 10) / 10} hour${duration !== 1 ? 's' : ''})`
              : ` (${Math.round(duration * 60)} minutes)`
            }
          </p>
        )}
        
        {event.resource && event.resource.description && (
          <div className="mt-3 text-sm">
            <p className={`font-medium ${isDarkMode ? 'text-bodydark' : 'text-gray-700'}`}>Description:</p>
            <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-700'} mt-1`}>{event.resource.description}</p>
          </div>
        )}

        {/* Show comments if present */}
        {hasComments && renderComments(event.resource.comments)}
        
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`px-2 py-1 ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} text-xs rounded-full`}>
            {event.resource?.status === "1" ? "To Do" :
              event.resource?.status === "2" ? "In Progress" :
              event.resource?.status === "3" ? "Testing" :
              event.resource?.status === "4" ? "Completed" : "To Do"}
          </span>
          {hasComments && (
            <span className={`px-2 py-1 ${isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'} text-xs rounded-full`}>
              {event.resource.comments.length} comment{event.resource.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom Agenda component for narrative view
const SmartAgenda = ({ events, date }) => {
  // Get dark mode state
  const isDarkMode = useSelector((state) => {
    if (state.layout && state.layout.theme !== undefined) {
      return state.layout.theme === 'dark';
    }
    // Fallback to checking HTML element class if Redux state is not available
    return document.documentElement.classList.contains('dark');
  });
  
  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};
    
    events.forEach(event => {
      const eventDate = moment(event.start).format('YYYY-MM-DD');
      if (!grouped[eventDate]) {
        grouped[eventDate] = [];
      }
      grouped[eventDate].push(event);
    });
    
    return grouped;
  }, [events]);
  
  // Sort events within each date by start time
  Object.keys(eventsByDate).forEach(date => {
    eventsByDate[date].sort((a, b) => new Date(a.start) - new Date(b.start));
  });
  
  // Format dates for display
  const formattedDates = Object.keys(eventsByDate).map(dateStr => {
    const momentDate = moment(dateStr);
    const isToday = momentDate.isSame(moment(), 'day');
    const isTomorrow = momentDate.isSame(moment().add(1, 'day'), 'day');
    const dayEvents = eventsByDate[dateStr];
    
    // Count types
    const taskCount = dayEvents.filter(e => e.type !== "videoCall").length;
    const callCount = dayEvents.filter(e => e.type === "videoCall").length;
    
    let dateHeader;
    if (isToday) {
      dateHeader = "Today";
    } else if (isTomorrow) {
      dateHeader = "Tomorrow";
    } else {
      dateHeader = momentDate.format('dddd, MMMM D, YYYY');
    }
    
    return (
      <div key={dateStr} className="mb-8">
        <h3 className="text-xl font-bold text-primary mb-3">{dateHeader}</h3>
        
        {dayEvents.length === 0 ? (
          <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-500'} italic`}>No events scheduled for this day.</p>
        ) : (
          <>
            <p className={`${isDarkMode ? 'text-bodydark' : 'text-gray-700'} mb-4`}>
              {isToday 
                ? `You have ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''} scheduled for today` 
                : `You have ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''} scheduled for ${momentDate.format('MMM D')}`
              }
              {(taskCount > 0 && callCount > 0) && ` (${taskCount} task${taskCount !== 1 ? 's' : ''}, ${callCount} call${callCount !== 1 ? 's' : ''}).`}
              {(taskCount > 0 && callCount === 0) && ` (${taskCount} task${taskCount !== 1 ? 's' : ''}).`}
              {(taskCount === 0 && callCount > 0) && ` (${callCount} call${callCount !== 1 ? 's' : ''}).`}
            </p>
            
            {dayEvents.map((event) => (
              <AgendaEvent key={event.id} event={event} />
            ))}
          </>
        )}
      </div>
    );
  });
  
  return (
    <div className="p-4">
      {formattedDates}
    </div>
  );
};

// Calendar Legend Component to explain colors
const CalendarLegend = () => {
  // Get dark mode state
  const isDarkMode = useSelector((state) => {
    if (state.layout && state.layout.theme !== undefined) {
      return state.layout.theme === 'dark';
    }
    // Fallback to checking HTML element class if Redux state is not available
    return document.documentElement.classList.contains('dark');
  });
  
  return (
    <div className="calendar-legend">
      <h4>Calendar Legend</h4>
      <div className="legend-grid">
        {/* Task priorities */}
        <div>
          <h5>Task Priorities</h5>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(priorityColors).map(([key, { color, darkColor, label }]) => (
              <div key={key} className="flex items-center text-xs">
                <span 
                  className="color-indicator" 
                  style={{ backgroundColor: isDarkMode ? darkColor : color }}
                ></span>
                {label}
              </div>
            ))}
          </div>
        </div>
        
        {/* Video Calls */}
        <div>
          <h5>Event Types</h5>
          <div className="flex items-center text-xs mb-1">
            <span 
              className="color-indicator" 
              style={{ backgroundColor: isDarkMode ? videoCallColors.dark : videoCallColors.light }}
            ></span>
            <span className="mr-1">📹</span>
            Video Call
          </div>
        </div>
      </div>
    </div>
  );
};

const EnhancedCalendar = ({ onScheduleCall }) => {
  const dispatch = useDispatch();
  
  // Get raw state directly to avoid selector issues
  const tasksState = useSelector((state) => state.tasks || {});
  const videoCallsState = useSelector((state) => state.videoCalls || {});
  
  // Get auth state to access current user ID
  const authState = useSelector((state) => state.auth || {});
  
  // Get dark mode state
  const isDarkMode = useSelector((state) => {
    if (state.layout && state.layout.theme !== undefined) {
      return state.layout.theme === 'dark';
    }
    // Fallback to checking HTML element class
    return document.documentElement.classList.contains('dark');
  });
  
  // Force theme refresh when dark mode changes
  useEffect(() => {
    const calendarElement = document.querySelector('.rbc-calendar');
    if (calendarElement) {
      if (isDarkMode) {
        calendarElement.classList.add('rbc-calendar-dark');
      } else {
        calendarElement.classList.remove('rbc-calendar-dark');
      }
    }
  }, [isDarkMode]);
  
  // Extract current user ID from auth state
  // Try multiple common patterns to find the user ID
  const currentUserId = useMemo(() => {
    // Common auth state patterns
    if (authState.user && authState.user._id) {
      return authState.user._id;
    }
    
    if (authState.data && authState.data._id) {
      return authState.data._id;
    }
    
    if (authState._id) {
      return authState._id;
    }
    
    if (authState.user && authState.user.id) {
      return authState.user.id;
    }
    
    if (authState.id) {
      return authState.id;
    }
    
    // Log auth state for debugging
    console.log("Auth state structure:", authState);
    console.log("Couldn't find user ID in auth state");
    return null;
  }, [authState]);
  
  // Get refresh state
  const refresh = useSelector((state) => state.commons?.refresh);
  
  // State to manage data fetching
  const [initialDataFetched, setInitialDataFetched] = useState(false);
  const [fetchingCalls, setFetchingCalls] = useState(false);
  
  // Local state for UI and data
  const [viewType, setViewType] = useState("month");
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [allEvents, setAllEvents] = useState([]);
  
  // Initial data fetch - ONLY RUN ONCE
  useEffect(() => {
    if (!initialDataFetched) {
      console.log("Initial data fetch for tasks and video calls");
      
      // Fetch tasks first
      dispatch(FindTaskAction(currentUserId));
      
      // Then fetch video calls with a slight delay to avoid race conditions
      setTimeout(() => {
        // Use participant-specific method if we have a user ID
        if (currentUserId) {
          console.log(`Fetching video calls for participant ID: ${currentUserId}`);
          dispatch(getCallsByParticipantId(currentUserId));
        } else {
          console.log("No user ID available, fetching all video calls");
          dispatch(getAllScheduledCalls());
        }
        setInitialDataFetched(true);
      }, 100);
    }
  }, [dispatch, initialDataFetched, currentUserId]);
  
  // Handle refresh state changes
  useEffect(() => {
    if (refresh && initialDataFetched) {
      console.log("Refreshing data due to refresh state change");
      dispatch(FindTaskAction(currentUserId));
      
      // Only refresh video calls if we're not currently fetching
      if (!fetchingCalls) {
        setFetchingCalls(true);
        
        // Use participant-specific method if we have a user ID
        if (currentUserId) {
          console.log(`Refreshing calls for participant ID: ${currentUserId}`);
          dispatch(getCallsByParticipantId(currentUserId))
            .finally(() => {
              // Reset fetching flag when done
              setFetchingCalls(false);
            });
        } else {
          console.log("No user ID available, fetching all video calls");
          dispatch(getAllScheduledCalls())
            .finally(() => {
              // Reset fetching flag when done
              setFetchingCalls(false);
            });
        }
      }
    }
  }, [dispatch, refresh, initialDataFetched, fetchingCalls, currentUserId]);
  
  // Process raw video calls into calendar events
  const processVideoCall = useCallback((call) => {
    if (!call || !call.start_time || !call.end_time) {
      console.warn("Invalid call data:", call);
      return null;
    }
    
    try {
      // Convert date strings to Date objects
      let startDate = new Date(call.start_time);
      let endDate = new Date(call.end_time);
      
      // If dates are invalid, try parsing as timestamps
      if (isNaN(startDate.getTime())) {
        if (!isNaN(parseInt(call.start_time))) {
          startDate = new Date(parseInt(call.start_time));
        } else {
          console.warn("Invalid start date:", call.start_time);
          return null;
        }
      }
      
      if (isNaN(endDate.getTime())) {
        if (!isNaN(parseInt(call.end_time))) {
          endDate = new Date(parseInt(call.end_time));
        } else {
          console.warn("Invalid end date:", call.end_time);
          return null;
        }
      }
      
      // Final check for valid dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn("Invalid date objects:", { start: startDate, end: endDate });
        return null;
      }
      
      // Format participants info
      let participantsInfo = "";
      if (call.participants && Array.isArray(call.participants)) {
        // Check if participants are populated objects or just IDs
        const participantCount = call.participants.length;
        
        if (participantCount > 0) {
          const firstParticipant = call.participants[0];
          
          // If participants are populated with user data
          if (typeof firstParticipant === 'object' && firstParticipant !== null) {
            const participantNames = call.participants
              .map(p => p.fullName || p.email || "Unnamed participant")
              .join(", ");
            
            participantsInfo = ` with ${participantNames}`;
          } else {
            // If just IDs, just show the count
            participantsInfo = ` with ${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
          }
        }
      }
      
      // Add team info if available
      let teamInfo = "";
      if (call.team_id) {
        if (typeof call.team_id === 'object' && call.team_id !== null && call.team_id.Name) {
          teamInfo = ` (${call.team_id.Name} team)`;
        } else {
          teamInfo = " (Team call)";
        }
      }
      
      // Create the calendar event object
      return {
        id: `call-${call._id || call.id}`,
        title: `${call.call_name || "Video Call"}${teamInfo}`,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: call,
        type: "videoCall",
        // Store additional info for rendering
        participantsInfo: participantsInfo,
        teamInfo: teamInfo
      };
    } catch (error) {
      console.error("Error processing video call:", error, call);
      return null;
    }
  }, []);
  
  // Process raw tasks into calendar events
  const processTask = useCallback((task) => {
    if (!task || !task.start_date || !task.end_date) return null;
    
    try {
      // Convert date strings to Date objects
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      
      // Check for valid dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return null;
      }
      
      // Create the calendar event object
      return {
        id: task._id,
        title: task.title || "Untitled Task",
        start: startDate,
        end: endDate,
        allDay: Boolean(task.is_all_day),
        resource: task,
        type: "task",
        priority: task.priority || "2"
      };
    } catch (error) {
      console.error("Error processing task:", error);
      return null;
    }
  }, []);
  
  // Create events from Redux state data
  useEffect(() => {
    // Skip if we haven't done initial fetch yet
    if (!initialDataFetched) return;
    
    const tasks = tasksState._ALL || [];
    const videoCalls = videoCallsState._ALL || [];
    const upcomingCalls = videoCallsState._UPCOMING || [];
    
    console.log("Processing Redux Store Data:", {
      tasksCount: tasks.length,
      videoCallsCount: videoCalls.length,
      upcomingCallsCount: upcomingCalls?.length || 0
    });
    
    // Process tasks into events
    const taskEvents = tasks
      .map(task => processTask(task))
      .filter(Boolean);
    
    // Process video calls into events
    let videoCallEvents = [];
    
    // First try the main video calls
    if (videoCalls && videoCalls.length > 0) {
      videoCallEvents = videoCalls
        .map(call => processVideoCall(call))
        .filter(Boolean);
    }
    
    // If no events from main calls, try upcoming calls
    if (videoCallEvents.length === 0 && upcomingCalls && upcomingCalls.length > 0) {
      videoCallEvents = upcomingCalls
        .map(call => processVideoCall(call))
        .filter(Boolean);
    }
    
    console.log(`Processed ${taskEvents.length} task events and ${videoCallEvents.length} call events`);
    
    // Combine events (ensuring no duplicates)
    const existingIds = new Set();
    const combinedEvents = [];
    
    // Add tasks first
    taskEvents.forEach(event => {
      if (!existingIds.has(event.id)) {
        existingIds.add(event.id);
        combinedEvents.push(event);
      }
    });
    
    // Then add video calls
    videoCallEvents.forEach(event => {
      if (!existingIds.has(event.id)) {
        existingIds.add(event.id);
        combinedEvents.push(event);
      }
    });
    
    // Update all events only if they have actually changed
    setAllEvents(prevEvents => {
      // Check if events have actually changed
      if (JSON.stringify(prevEvents) === JSON.stringify(combinedEvents)) {
        return prevEvents; // No change, return previous state
      }
      return combinedEvents;
    });
  }, [
    tasksState._ALL, 
    videoCallsState._ALL, 
    videoCallsState._UPCOMING,
    initialDataFetched,
    processTask, 
    processVideoCall
  ]);
  
  // Event style getter - memoized
  const eventStyleGetter = useCallback((event) => {
    if (event.type === "videoCall") {
      return {
        style: { 
          backgroundColor: isDarkMode ? videoCallColors.dark : videoCallColors.light,
          borderRadius: '8px',
          opacity: 0.9,
          color: 'white',
          border: '0px',
          display: 'block',
          cursor: 'pointer',
          padding: '2px 5px',
          fontSize: '0.85rem',
          transition: 'all 0.2s ease'
        },
        // Add a video camera icon in the title
        title: `📹 ${event.title}`
      };
    } else {
      // Task styling
      const priorityInfo = priorityColors[event.priority] || priorityColors["2"];
      const priorityColor = isDarkMode ? priorityInfo.darkColor : priorityInfo.color;
      
      return {
        style: { 
          backgroundColor: priorityColor,
          borderRadius: '8px',
          opacity: 0.85,
          color: 'white',
          border: '0px',
          display: 'block',
          cursor: 'pointer',
          padding: '2px 5px',
          fontSize: '0.85rem',
          transition: 'all 0.2s ease'
        }
      };
    }
  }, [isDarkMode]);
  
  // Handle select event
  const handleSelectEvent = useCallback((event) => {
    if (event.type === "videoCall") {
      // Handle video call event
      const call = event.resource;
      
      swal({
        title: event.title,
        text: call.description || "No description available",
        icon: "info",
        buttons: {
          cancel: "Close",
          edit: {
            text: "Edit Call",
            value: "edit",
          },
          delete: {
            text: "Delete Call",
            value: "delete",
          },
          join: {
            text: "Join Call",
            value: "join",
          },
        },
      }).then((value) => {
        if (value === "edit") {
          // Make sure onScheduleCall is a function and pass the correct data
          if (typeof onScheduleCall === 'function') {
            onScheduleCall(call);
          } else {
            console.error("onScheduleCall is not a function");
            swal("Error", "Edit functionality is not available", "error");
          }
        } else if (value === "delete") {
          // Handle delete call
          swal({
            title: "Are you sure?",
            text: "Once deleted, you will not be able to recover this scheduled call!",
            icon: "warning",
            buttons: ["Cancel", "Delete"],
            dangerMode: true,
          }).then((willDelete) => {
            if (willDelete) {
              dispatch(deleteScheduledCall(call._id)).then(() => {
                // Refresh calls after deletion
                if (currentUserId) {
                  dispatch(getCallsByParticipantId(currentUserId));
                } else {
                  dispatch(getAllScheduledCalls());
                }
              });
            }
          });
        } else if (value === "join") {
          // Set up video call
          dispatch(setActiveCall(call));
          const roomName = generateRoomName(call._id, call.call_name);
          setCurrentRoomName(roomName);
          setSelectedCall(call);
          setShowVideoCall(true);
        }
      });
    } else {
      // Handle task event
      if (event.id && (!event.resource.comments || event.resource.comments.length === 0)) {
        dispatch(GetTaskCommentsAction(event.id))
          .then(comments => {
            if (comments && comments.length > 0) {
              event.resource.comments = comments;
            }
          })
          .catch(err => {
            console.error("Failed to load comments:", err);
          });
      }
      
      // Check for comments
      let commentsInfo = "";
      if (event.resource?.comments && Array.isArray(event.resource.comments) && event.resource.comments.length > 0) {
        commentsInfo = `\n\nThis task has ${event.resource.comments.length} comment(s).`;
      }
      
      swal({
        title: event.title,
        text: (event.resource?.description || "No description available") + commentsInfo,
        icon: "info",
        buttons: {
          cancel: "Close",
          edit: {
            text: "Edit Task",
            value: "edit",
          },
        },
      }).then((value) => {
        if (value === "edit") {
          // Handle task edit - you may need to implement this
          console.log("Edit task:", event);
          // You can dispatch an action to open a task edit modal here
        }
      });
    }
  }, [dispatch, onScheduleCall, currentUserId]);
  
  // Handle event resizing
  const handleEventResize = useCallback(({ event, start, end }) => {
    const isVideoCall = event.type === "videoCall";
    
    swal({
      title: `Update ${isVideoCall ? 'Call' : 'Task'} Schedule?`,
      text: `Do you want to reschedule "${event.title}" to ${moment(start).format('lll')} - ${moment(end).format('lll')}?`,
      icon: "warning",
      buttons: true,
      dangerMode: false,
    })
    .then((willUpdate) => {
      if (!willUpdate) return;
      
      if (isVideoCall) {
        const callId = event.id.replace('call-', '');
        dispatch(updateScheduledCall(callId, {
          start_time: start.toISOString(),
          end_time: end.toISOString()
        }));
      } else {
        dispatch(RescheduleTaskAction(event.id, {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          is_all_day: event.allDay
        }));
      }
    });
  }, [dispatch]);
  
  // Handle event dragging
  const handleEventDrop = useCallback(({ event, start, end, allDay }) => {
    const isVideoCall = event.type === "videoCall";
    
    swal({
      title: `Update ${isVideoCall ? 'Call' : 'Task'} Schedule?`,
      text: `Do you want to reschedule "${event.title}" to ${moment(start).format('lll')} - ${moment(end).format('lll')}?`,
      icon: "warning",
      buttons: true,
      dangerMode: false,
    })
    .then((willUpdate) => {
      if (!willUpdate) return;
      
      if (isVideoCall) {
        const callId = event.id.replace('call-', '');
        dispatch(updateScheduledCall(callId, {
          start_time: start.toISOString(),
          end_time: end.toISOString()
        }));
      } else {
        dispatch(RescheduleTaskAction(event.id, {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          is_all_day: allDay
        }));
      }
    });
  }, [dispatch]);
  
  // Format date display in the calendar header
  const formats = useMemo(() => ({
    dateFormat: 'D',
    dayFormat: 'ddd D/M',
    monthHeaderFormat: 'MMMM YYYY',
    dayHeaderFormat: 'dddd, MMMM D, YYYY',
    dayRangeHeaderFormat: ({ start, end }) => 
      `${moment(start).format('MMM D')} - ${moment(end).format('MMM D, YYYY')}`,
    timeGutterFormat: 'h:mm A'
  }), []);
  
  // Memoize the calendar event counts
  const eventCounts = useMemo(() => {
    return {
      total: allEvents.length,
      tasks: allEvents.filter(e => e.type !== "videoCall").length,
      calls: allEvents.filter(e => e.type === "videoCall").length
    };
  }, [allEvents]);
  
  // Refresh calls manually
  const handleManualRefresh = useCallback(() => {
    if (!fetchingCalls) {
      console.log("Manual refresh of video calls");
      setFetchingCalls(true);
      
      // Use participant-specific method if we have a user ID
      if (currentUserId) {
        console.log(`Refreshing calls for participant ID: ${currentUserId}`);
        dispatch(getCallsByParticipantId(currentUserId))
          .finally(() => {
            setFetchingCalls(false);
          });
      } else {
        console.log("No user ID available, refreshing all calls");
        dispatch(getAllScheduledCalls())
          .finally(() => {
            setFetchingCalls(false);
          });
      }
    }
  }, [dispatch, fetchingCalls, currentUserId]);

  // Handle joining a call from the notification component
  const handleJoinCall = useCallback((call) => {
    dispatch(setActiveCall(call));
    const roomName = generateRoomName(call._id, call.call_name);
    setCurrentRoomName(roomName);
    setSelectedCall(call);
    setShowVideoCall(true);
  }, [dispatch]);
  
  return (
    <div className={`my-4 calendar-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="mb-4">
        <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Calendar Schedule</h3>
        
        <div className="flex justify-between items-center mt-2">
          <p className={`text-sm ${isDarkMode ? 'text-bodydark' : 'text-gray-500'}`}>
            {eventCounts.total} event{eventCounts.total !== 1 ? 's' : ''} scheduled
            {eventCounts.total > 0 && (
              <span className={`text-xs ml-1 ${isDarkMode ? 'text-bodydark-2' : 'text-gray-400'}`}>
                ({eventCounts.tasks} tasks, {eventCounts.calls} calls)
              </span>
            )}
            {currentUserId && (
              <span className="text-xs ml-1 text-primary">
                • Showing your calls
              </span>
            )}
          </p>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleManualRefresh}
              disabled={fetchingCalls}
              className={`px-3 py-1 rounded-md text-sm ${
                fetchingCalls 
                  ? `${isDarkMode ? 'bg-bodydark text-boxdark' : 'bg-gray-200 text-gray-400'} cursor-not-allowed` 
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {fetchingCalls ? 'Refreshing...' : 'Refresh Calls'}
            </button>
            
            <div className={`text-sm ${isDarkMode ? 'text-bodydark' : 'text-gray-600'} italic`}>
              <span>Tip: </span>
              <span>Drag events to reschedule them, or resize to change duration.</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add NotifCalls component here */}
      <NotifCalls onJoinCall={handleJoinCall} />
      
      {/* Calendar Legend */}
      <CalendarLegend />
      
      {/* Calendar View Selector */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {["month", "week", "day", "agenda"].map((view) => (
            <button
              key={view}
              className={`calendar-view-button ${
                viewType === view
                  ? "calendar-view-button-active"
                  : "calendar-view-button-inactive"
              }`}
              onClick={() => setViewType(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className={`calendar-wrapper ${isDarkMode ? 'dark' : ''}`}>
        {viewType === 'agenda' ? (
          // Custom agenda view with narrative style
          <SmartAgenda events={allEvents} date={new Date()} />
        ) : (
          // Regular calendar for other views
          <DnDCalendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "auto", minHeight: 600 }} // Change from fixed height to auto with min-height
            views={["month", "week", "day", "agenda"]}
            view={viewType}
            onView={setViewType}
            defaultView="month"
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            formats={formats}
            resizable
            selectable
            popup
            step={15}
            timeslots={4}
            showMultiDayTimes
            min={new Date(new Date().setHours(7, 0, 0))}
            max={new Date(new Date().setHours(21, 0, 0))}
            draggableAccessor={() => true}
            resizableAccessor={() => true}
            className="view-transition"
          />
        )}
      </div>
      
      {showVideoCall && selectedCall && currentRoomName && (
        <VideoCallModal
          roomName={currentRoomName}
          onClose={() => {
            setShowVideoCall(false);
            setSelectedCall(null);
            setCurrentRoomName("");
            dispatch(clearActiveCall());
          }}
        />
      )}
    </div>
  );
};

export default React.memo(EnhancedCalendar);