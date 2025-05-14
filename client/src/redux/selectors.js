// src/redux/selectors.js
import { createSelector } from 'reselect';

// Basic selectors
export const selectTasksSlice = state => state.tasks || {};
export const selectVideoCallsSlice = state => state.videoCalls || {};

// Derived selectors with debugging
export const selectAllTasks = createSelector(
  [selectTasksSlice],
  (tasksSlice) => {
    const tasks = tasksSlice._ALL || [];
    console.log("Selected tasks:", tasks.length);
    return tasks;
  }
);

export const selectAllVideoCalls = createSelector(
  [selectVideoCallsSlice],
  (videoCallsSlice) => {
    // Add explicit debugging to check what's coming in
    console.log("Video calls slice:", videoCallsSlice);
    const videoCalls = videoCallsSlice._ALL || [];
    console.log("Selected video calls:", videoCalls.length, videoCalls);
    return videoCalls;
  }
);

// Helper function to adapt video call format if needed
const adaptVideoCallFormat = (call) => {
  if (!call) return null;
  
  try {
    // Make sure we have proper date objects
    const startDate = new Date(call.start_time);
    const endDate = new Date(call.end_time);
    
    // Debug the date parsing
    console.log("Parsing call dates:", {
      callId: call._id,
      startRaw: call.start_time,
      startParsed: startDate,
      isValidStart: !isNaN(startDate.getTime())
    });
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn("Invalid dates for call:", call._id, {
        start: call.start_time,
        end: call.end_time
      });
      return null;
    }
    
    return {
      id: `call-${call._id}`, // Prefix to distinguish from task IDs
      title: call.call_name || "Untitled Call",
      start: startDate,
      end: endDate,
      allDay: false, // Video calls are never all-day events
      resource: call,
      type: "videoCall" // Mark as a video call for different styling/handling
    };
  } catch (error) {
    console.warn("Error processing call:", call._id, error);
    return null;
  }
};

// Memoized selector for all calendar events
export const selectCalendarEvents = createSelector(
  [selectAllTasks, selectAllVideoCalls],
  (tasks, videoCalls) => {
    console.log("Calendar events selector received:", {
      tasks: tasks?.length || 0,
      videoCalls: videoCalls?.length || 0
    });
    
    // Process tasks into calendar events
    const taskEvents = tasks
      .filter(task => task && task.start_date && task.end_date)
      .map(task => {
        try {
          const startDate = new Date(task.start_date);
          const endDate = new Date(task.end_date);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn("Invalid dates for task:", task._id);
            return null;
          }
          
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
          console.warn("Error processing task:", task._id, error);
          return null;
        }
      })
      .filter(Boolean);
    
    // Log all available video call fields for the first call
    if (videoCalls && videoCalls.length > 0) {
      console.log("Video call object structure:", Object.keys(videoCalls[0]));
      console.log("Sample video call:", videoCalls[0]);
    }
    
    // Process video calls into calendar events
    const callEvents = videoCalls
      .filter(call => call && call.start_time && call.end_time)
      .map(call => adaptVideoCallFormat(call))
      .filter(Boolean);
    
    // More detailed logging
    console.log("Processed calendar events:", {
      taskEvents: taskEvents.length,
      callEvents: callEvents.length,
      callEventsDetails: callEvents.length > 0 ? callEvents[0] : "No call events"
    });
    
    // Combine both types of events
    return [...taskEvents, ...callEvents];
  }
);

// Selector for upcoming calls (within the next hour)
export const selectUpcomingCalls = createSelector(
  [selectAllVideoCalls],
  (videoCalls) => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    return videoCalls.filter(call => {
      if (!call || !call.start_time) return false;
      
      try {
        const callTime = new Date(call.start_time);
        return callTime >= now && callTime <= oneHourFromNow;
      } catch (e) {
        return false;
      }
    });
  }
);

// Other selectors as needed...
export const selectTaskById = (taskId) => createSelector(
  [selectAllTasks],
  (tasks) => tasks.find(task => task._id === taskId)
);

export const selectCallById = (callId) => createSelector(
  [selectAllVideoCalls],
  (calls) => calls.find(call => call._id === callId)
);

// Helper selector to check if calendar data is loaded
export const selectCalendarDataLoaded = createSelector(
  [selectAllTasks, selectAllVideoCalls],
  (tasks, calls) => {
    const tasksLoaded = Array.isArray(tasks) && tasks.length > 0;
    const callsLoaded = Array.isArray(calls) && calls.length > 0;
    return tasksLoaded || callsLoaded;
  }
);