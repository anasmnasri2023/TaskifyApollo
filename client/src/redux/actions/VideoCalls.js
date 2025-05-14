// src/actions/VideoCallsActions.js
import axios from "axios";
import swal from "sweetalert";
import { setRefresh } from "../reducers/commons";
import { setErrors } from "../reducers/errors";
import {
  _SetLoading,
  _SetError,
  _AddCall,
  _UpdateCall,
  _DeleteCall,
  _SetCalls,
  _SetUpcomingCalls,
  _SetOneCall,
  _SetActiveCall,
  _ClearActiveCall
} from "../reducers/VideoCalls";

/**
 * Helper function to extract MongoDB ObjectId
 * Handles various MongoDB ObjectId formats
 */
const extractId = (idField) => {
  if (!idField) return null;
  
  // Handle MongoDB ObjectId format: { $oid: "..." }
  if (typeof idField === 'object' && idField.$oid) {
    return idField.$oid;
  }
  
  // Handle normal string ID
  if (typeof idField === 'string') {
    return idField;
  }
  
  // Handle object with _id
  if (typeof idField === 'object' && idField._id) {
    return typeof idField._id === 'object' && idField._id.$oid ? idField._id.$oid : idField._id;
  }
  
  // Return original if we can't determine format
  return idField;
};

/**
 * Helper function to extract MongoDB Date
 * Handles various MongoDB date formats
 */
const extractDate = (dateField) => {
  if (!dateField) return null;
  
  try {
    // Handle MongoDB date format: { $date: { $numberLong: "..." } }
    if (typeof dateField === 'object' && dateField.$date) {
      // Handle different $date formats
      if (dateField.$date.$numberLong) {
        return new Date(parseInt(dateField.$date.$numberLong)).toISOString();
      } else if (typeof dateField.$date === 'number') {
        return new Date(dateField.$date).toISOString();
      } else if (typeof dateField.$date === 'string') {
        return dateField.$date;
      }
    }
    
    // Handle Date objects
    if (dateField instanceof Date) {
      return dateField.toISOString();
    }
    
    // Handle ISO string dates
    if (typeof dateField === 'string' && dateField.includes('T')) {
      const parsed = new Date(dateField);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    
    // Handle timestamp (number or string that can be parsed as number)
    if (typeof dateField === 'number' || (typeof dateField === 'string' && !isNaN(parseInt(dateField)))) {
      const parsed = new Date(parseInt(dateField));
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    
    // Try generic Date conversion as fallback
    const fallbackDate = new Date(dateField);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString();
    }
    
    return null;
  } catch (e) {
    console.error('Failed to parse date:', dateField, e);
    return null;
  }
};

/**
 * Transform raw video call data to a consistent format
 * Handles various API response formats and MongoDB-specific fields
 */
const normalizeVideoCall = (rawCall) => {
  if (!rawCall) return null;
  
  // Extract the ID
  const id = extractId(rawCall._id || rawCall.id);
  if (!id) return null;
  
  // Extract title/name
  const callName = rawCall.call_name || rawCall.title || rawCall.name || rawCall.subject || "Untitled Call";
  
  // Extract dates
  const startTime = extractDate(rawCall.start_time) || 
                    extractDate(rawCall.startTime) || 
                    extractDate(rawCall.start) || 
                    extractDate(rawCall.start_date) || 
                    extractDate(rawCall.startDate);
                    
  const endTime = extractDate(rawCall.end_time) || 
                  extractDate(rawCall.endTime) || 
                  extractDate(rawCall.end) || 
                  extractDate(rawCall.end_date) || 
                  extractDate(rawCall.endDate);
  
  // Skip calls with invalid dates
  if (!startTime || !endTime) return null;
  
  // Process participants
  let participants = [];
  if (rawCall.participants && Array.isArray(rawCall.participants)) {
    participants = rawCall.participants.map(p => extractId(p));
  }
  
  // Format team_id if it exists
  const teamId = rawCall.team_id ? extractId(rawCall.team_id) : null;
  
  // Create a normalized call object
  return {
    _id: id,
    call_name: callName,
    description: rawCall.description || "",
    start_time: startTime,
    end_time: endTime,
    duration: rawCall.duration || 30,
    is_recurring: Boolean(rawCall.is_recurring),
    status: rawCall.status || "scheduled",
    team_id: teamId,
    participants: participants,
    created_by: rawCall.created_by ? extractId(rawCall.created_by) : null
  };
};

/**
 * Create a new scheduled video call
 */
export const createScheduledCall = (callData) => async (dispatch) => {
  dispatch(_SetLoading(true));
  
  try {
    // Format data for API
    const formattedData = {
      call_name: callData.call_name || 'Untitled Call',
      description: callData.description || '',
      start_time: extractDate(callData.start_time),
      end_time: extractDate(callData.end_time),
      duration: parseInt(callData.duration) || 30,
      is_recurring: Boolean(callData.is_recurring),
      ...(callData.recurrence_pattern ? { recurrence_pattern: callData.recurrence_pattern } : {}),
      ...(callData.recurrence_end_date ? { recurrence_end_date: extractDate(callData.recurrence_end_date) } : {}),
      ...(callData.team_id ? { team_id: callData.team_id.toString() } : {}),
      ...(callData.participants && Array.isArray(callData.participants) && callData.participants.length > 0 
        ? { participants: callData.participants.map(p => typeof p === 'object' ? extractId(p) : p) } 
        : {})
    };
    
    // Validate required fields
    if (!formattedData.start_time || !formattedData.end_time) {
      throw new Error('Start and end times are required');
    }
    
    if (!formattedData.team_id && (!formattedData.participants || formattedData.participants.length === 0)) {
      throw new Error('Either team or participants must be specified');
    }
    
    // Make API request
    const response = await axios.post('/api/video-calls', formattedData);
    
    // Process response
    const newCall = response.data && response.data.data ? response.data.data : response.data;
    
    // Add to Redux store
    if (newCall) {
      const normalizedCall = normalizeVideoCall(newCall);
      if (normalizedCall) {
        dispatch(_AddCall(normalizedCall));
      }
    }
    
    // Update UI
    dispatch(setRefresh(true));
    setTimeout(() => dispatch(setRefresh(false)), 500);
    
    dispatch(_SetLoading(false));
    return response.data;
  } catch (error) {
    console.error("Error creating scheduled call:", error);
    swal("Error", `Failed to create call: ${error.message || "Unknown error"}`, "error");
    dispatch(_SetLoading(false));
    throw error;
  }
};

/**
 * Update an existing scheduled video call
 */
export const updateScheduledCall = (callId, callData) => async (dispatch) => {
  dispatch(_SetLoading(true));
  dispatch(setRefresh(true));
  
  try {
    const response = await axios.put(`/api/video-calls/${callId}`, callData);
    
    // Process response
    let updatedCall = response.data && response.data.data ? response.data.data : response.data;
    
    // Normalize data
    if (updatedCall) {
      updatedCall = normalizeVideoCall(updatedCall);
    }
    
    if (updatedCall) {
      dispatch(_UpdateCall({ id: callId, updates: updatedCall }));
    }
    
    dispatch(_SetLoading(false));
    dispatch(setRefresh(false));
    dispatch(setErrors({}));
    return updatedCall;
  } catch (error) {
    console.error("Error updating scheduled call:", error);
    dispatch(_SetError(error.response?.data || { message: "Failed to update call" }));
    dispatch(_SetLoading(false));
    dispatch(setRefresh(false));
    dispatch(setErrors(error.response?.data || { message: "Failed to update call" }));
    throw error;
  }
};

/**
 * Delete a scheduled video call
 */
export const deleteScheduledCall = (callId) => async (dispatch) => {
  dispatch(_SetLoading(true));
  
  try {
    await axios.delete(`/api/video-calls/${callId}`);
    dispatch(_DeleteCall(callId));
    dispatch(_SetLoading(false));
    swal("Success", "Call deleted successfully", "success");
    return true;
  } catch (error) {
    console.error("Error deleting scheduled call:", error);
    dispatch(_SetError(error.response?.data || { message: "Failed to delete call" }));
    dispatch(_SetLoading(false));
    swal("Error", "Failed to delete call", "error");
    return false;
  }
};

/**
 * Get all scheduled video calls
 */
export const getAllScheduledCalls = () => async (dispatch) => {
  dispatch(_SetLoading(true));
  
  try {
    console.log("Fetching all scheduled calls...");
    
    // Make API request with no-cache headers to prevent stale data
    const response = await axios.get("/api/video-calls", {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log("Video calls API response:", response.status, typeof response.data);
    
    // Extract calls from response
    let callsData = [];
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // Standard API response: { data: [...calls] }
      callsData = response.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      // Direct array response: [...calls]
      callsData = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Look for array properties in the response object
      for (const [key, value] of Object.entries(response.data)) {
        if (Array.isArray(value) && value.length > 0) {
          callsData = value;
          console.log(`Found array data in response.${key}`);
          break;
        }
      }
    }
    
    console.log(`Found ${callsData.length} raw calls from API`);
    
    // Normalize all calls to a consistent format
    const normalizedCalls = callsData
      .map(call => normalizeVideoCall(call))
      .filter(Boolean); // Remove any null results
    
    console.log(`Successfully processed ${normalizedCalls.length} calls`);
    console.log("Normalized calls sample:", normalizedCalls[0]); // Log first call for debugging
    
    // Update Redux store using the proper action creator
    dispatch(_SetCalls(normalizedCalls));
    
    dispatch(_SetLoading(false));
    return normalizedCalls;
  } catch (error) {
    console.error("Error fetching scheduled calls:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    dispatch(_SetError({
      message: "Failed to fetch calls",
      details: error.message,
      status: error.response?.status
    }));
    
    dispatch(_SetLoading(false));
    return [];
  }
};

/**
 * Get all scheduled video calls for a specific participant
 */
export const getCallsByParticipantId = (userId) => async (dispatch) => {
  dispatch(_SetLoading(true));
  
  try {
    console.log(`Fetching video calls for participant ID: ${userId}`);
    
    // Make API request with no-cache headers to prevent stale data
    const response = await axios.get(`/api/video-calls/participant/${userId}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`Video calls for participant ${userId} API response:`, response.status);
    
    // Extract calls from response
    let participantCalls = [];
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      participantCalls = response.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      participantCalls = response.data;
    } else if (response.data && typeof response.data === 'object') {
      for (const [key, value] of Object.entries(response.data)) {
        if (Array.isArray(value) && value.length > 0) {
          participantCalls = value;
          console.log(`Found array data in response.${key}`);
          break;
        }
      }
    }
    
    console.log(`Found ${participantCalls.length} calls for participant ${userId}`);
    
    // Normalize all calls to a consistent format
    const normalizedCalls = participantCalls
      .map(call => normalizeVideoCall(call))
      .filter(Boolean); // Remove any null results
    
    console.log(`Successfully processed ${normalizedCalls.length} calls for participant ${userId}`);
    if (normalizedCalls.length > 0) {
      console.log("First call sample:", normalizedCalls[0]);
    }
    
    // Update Redux store
    dispatch(_SetCalls(normalizedCalls));
    
    // Also dispatch with string type for backward compatibility
    dispatch({
      type: 'SET_VIDEO_CALLS',
      payload: normalizedCalls
    });
    
    dispatch(_SetLoading(false));
    return normalizedCalls;
  } catch (error) {
    console.error(`Error fetching calls for participant ${userId}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    dispatch(_SetError({
      message: `Failed to fetch calls for participant ${userId}`,
      details: error.message,
      status: error.response?.status
    }));
    
    dispatch(_SetLoading(false));
    return [];
  }
};

/**
 * Get upcoming scheduled video calls
 */
export const getUpcomingCalls = () => async (dispatch) => {
  dispatch(_SetLoading(true));
  
  try {
    console.log("Fetching upcoming video calls...");
    const response = await axios.get("/api/video-calls/upcoming");
    
    // Extract calls from response
    let upcomingCallsData = [];
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      upcomingCallsData = response.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      upcomingCallsData = response.data;
    } else if (response.data && typeof response.data === 'object') {
      for (const [key, value] of Object.entries(response.data)) {
        if (Array.isArray(value) && value.length > 0) {
          upcomingCallsData = value;
          break;
        }
      }
    }
    
    // Normalize calls
    const normalizedUpcomingCalls = upcomingCallsData
      .map(call => normalizeVideoCall(call))
      .filter(Boolean);
    
    console.log(`Found ${normalizedUpcomingCalls.length} upcoming calls`);
    
    // Update Redux store
    dispatch(_SetUpcomingCalls(normalizedUpcomingCalls));
    
    // Also add to main calls collection
    if (normalizedUpcomingCalls.length > 0) {
      dispatch(_SetCalls(normalizedUpcomingCalls));
      
      // Also dispatch with string type
      dispatch({
        type: 'SET_VIDEO_CALLS',
        payload: normalizedUpcomingCalls
      });
    }
    
    dispatch(_SetLoading(false));
    return normalizedUpcomingCalls;
  } catch (error) {
    console.error("Error fetching upcoming calls:", error);
    dispatch(_SetError(error.response?.data || { message: "Failed to fetch upcoming calls" }));
    dispatch(_SetLoading(false));
    return [];
  }
};

/**
 * Get a specific scheduled video call by ID
 */
export const getScheduledCallById = (callId) => async (dispatch) => {
  dispatch(_SetLoading(true));
  
  try {
    const response = await axios.get(`/api/video-calls/${callId}`);
    
    // Extract call from response
    let callData = response.data && response.data.data ? response.data.data : response.data;
    
    // Normalize call
    const normalizedCall = normalizeVideoCall(callData);
    
    if (!normalizedCall) {
      throw new Error("Failed to process call data");
    }
    
    // Update Redux store
    dispatch(_SetOneCall(normalizedCall));
    dispatch(_AddCall(normalizedCall));
    
    dispatch(_SetLoading(false));
    return normalizedCall;
  } catch (error) {
    console.error("Error fetching call details:", error);
    dispatch(_SetError(error.response?.data || { message: "Failed to fetch call details" }));
    dispatch(_SetLoading(false));
    return null;
  }
};

/**
 * Set active call (when joining a call)
 */
export const setActiveCall = (call) => (dispatch) => {
  dispatch(_SetActiveCall(call));
};

/**
 * Clear active call (when leaving a call)
 */
export const clearActiveCall = () => (dispatch) => {
  dispatch(_ClearActiveCall());
};

/**
 * Mark a call as started
 */
export const markCallAsStarted = (callId) => async (dispatch) => {
  try {
    const response = await axios.put(`/api/video-calls/${callId}/start`, {});
    dispatch(_UpdateCall({ id: callId, updates: { status: 'active' } }));
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error marking call as started:", error);
    return null;
  }
};

/**
 * Mark a call as ended
 */
export const markCallAsEnded = (callId) => async (dispatch) => {
  try {
    const response = await axios.put(`/api/video-calls/${callId}/end`, {});
    dispatch(_UpdateCall({ id: callId, updates: { status: 'completed' } }));
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error marking call as ended:", error);
    return null;
  }
};

/**
 * Generate a unique room name for a call
 */
export const generateRoomName = (callId, callName) => {
  // Create a predictable but unique name based on call ID and name
  const sanitizedName = callName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const uniqueIdentifier = callId.substring(0, 8);
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  return `scheduled-${sanitizedName}-${uniqueIdentifier}-${timestamp}`;
};

/**
 * Check for upcoming calls and notify user
 */
export const checkUpcomingCalls = () => async (dispatch, getState) => {
  const currentTime = new Date();
  const videoCalls = getState().videoCalls || {};
  
  // Look at ALL calls instead of just _UPCOMING
  const allCalls = videoCalls._ALL || [];
  
  console.log(`Checking upcoming calls: found ${allCalls.length} total calls in state`);
  
  if (!allCalls || allCalls.length === 0) return;
  
  // Filter for upcoming calls (within next 30 minutes)
  const upcomingCalls = allCalls.filter(call => {
    const callStartTime = new Date(call.start_time);
    const timeDiff = (callStartTime - currentTime) / (1000 * 60); // Difference in minutes
    return timeDiff > 0 && timeDiff <= 30; // Calls starting in the next 30 minutes
  });
  
  console.log(`Found ${upcomingCalls.length} upcoming calls`);
  
  if (upcomingCalls.length === 0) return;
  
  // Sort by start time
  const sortedCalls = [...upcomingCalls].sort((a, b) => 
    new Date(a.start_time) - new Date(b.start_time)
  );
  
  // Find the next upcoming call
  const nextCall = sortedCalls[0];
  if (!nextCall) return;
  
  const callStartTime = new Date(nextCall.start_time);
  const timeDiff = (callStartTime - currentTime) / (1000 * 60); // Difference in minutes
  
  console.log(`Next call "${nextCall.call_name}" starts in ${Math.ceil(timeDiff)} minutes`);
  
  // Notify user 5 minutes before call starts
  if (timeDiff <= 5 && timeDiff > 0) {
    const formattedTime = callStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    swal({
      title: "Upcoming Call",
      text: `"${nextCall.call_name}" starts in ${Math.ceil(timeDiff)} minutes (${formattedTime}).`,
      icon: "info",
      buttons: {
        cancel: "Dismiss",
        join: {
          text: "Join Now",
          value: "join",
        },
      },
    }).then((value) => {
      if (value === "join") {
        // Pre-join the call 
        dispatch(setActiveCall(nextCall));
        // Generate room name
        const roomName = generateRoomName(nextCall._id, nextCall.call_name);
        // Redirect to call or open modal
        window.startVideoCall && window.startVideoCall(roomName, nextCall);
      }
    });
  }
  
  // Automatically start call when the time arrives
  if (timeDiff <= 0 && timeDiff > -1) { // Just started (within the last minute)
    const roomName = generateRoomName(nextCall._id, nextCall.call_name);
    
    swal({
      title: "Call Starting",
      text: `Your scheduled call "${nextCall.call_name}" is starting now.`,
      icon: "success",
      buttons: {
        cancel: "Later",
        join: {
          text: "Join Now",
          value: "join",
        },
      },
      timer: 10000, // Auto-close after 10 seconds if no action
    }).then((value) => {
      if (value === "join") {
        // Join the call
        dispatch(setActiveCall(nextCall));
        // Mark call as started
        dispatch(markCallAsStarted(nextCall._id));
        // Start the video call
        window.startVideoCall && window.startVideoCall(roomName, nextCall);
      }
    });
  }
};