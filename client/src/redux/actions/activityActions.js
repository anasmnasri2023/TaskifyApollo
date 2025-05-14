import axios from 'axios';
import { io } from 'socket.io-client';


// Action Types - Original
export const FETCH_USER_ACTIVITIES_SUCCESS = 'FETCH_USER_ACTIVITIES_SUCCESS';
export const FETCH_USER_ACTIVITIES_FAIL = 'FETCH_USER_ACTIVITIES_FAIL';
export const FETCH_ACTIVITIES_DIRECT_SUCCESS = 'FETCH_ACTIVITIES_DIRECT_SUCCESS';
export const FETCH_ACTIVITIES_DIRECT_FAIL = 'FETCH_ACTIVITIES_DIRECT_FAIL';
export const FETCH_ACTIVITIES_DIRECT_REQUEST = 'FETCH_ACTIVITIES_DIRECT_REQUEST';
export const FETCH_ACTIVITY_STATS_SUCCESS = 'FETCH_ACTIVITY_STATS_SUCCESS';
export const FETCH_ACTIVITY_STATS_FAIL = 'FETCH_ACTIVITY_STATS_FAIL';
export const FETCH_ACTIVITY_STATS_REQUEST = 'FETCH_ACTIVITY_STATS_REQUEST';
export const FETCH_USER_PERSONA_SUCCESS = 'FETCH_USER_PERSONA_SUCCESS';
export const FETCH_USER_PERSONA_FAIL = 'FETCH_USER_PERSONA_FAIL';
export const FETCH_USER_PERSONA_REQUEST = 'FETCH_USER_PERSONA_REQUEST';
export const FETCH_TASK_PRIORITIES_SUCCESS = 'FETCH_TASK_PRIORITIES_SUCCESS';
export const FETCH_TASK_PRIORITIES_FAIL = 'FETCH_TASK_PRIORITIES_FAIL';
export const FETCH_TASK_PRIORITIES_REQUEST = 'FETCH_TASK_PRIORITIES_REQUEST';
export const FETCH_DASHBOARD_SUMMARY_SUCCESS = 'FETCH_DASHBOARD_SUMMARY_SUCCESS';
export const FETCH_DASHBOARD_SUMMARY_FAIL = 'FETCH_DASHBOARD_SUMMARY_FAIL';
export const FETCH_DASHBOARD_SUMMARY_REQUEST = 'FETCH_DASHBOARD_SUMMARY_REQUEST';

// New Action Types for Enhanced Features
export const NEW_ACTIVITY_RECEIVED = 'NEW_ACTIVITY_RECEIVED';
export const FETCH_FILTERED_ACTIVITIES_REQUEST = 'FETCH_FILTERED_ACTIVITIES_REQUEST';
export const FETCH_FILTERED_ACTIVITIES_SUCCESS = 'FETCH_FILTERED_ACTIVITIES_SUCCESS';
export const FETCH_FILTERED_ACTIVITIES_FAIL = 'FETCH_FILTERED_ACTIVITIES_FAIL';
export const QUEUE_ACTIVITY = 'QUEUE_ACTIVITY';
export const SYNC_ACTIVITIES_START = 'SYNC_ACTIVITIES_START';
export const SYNC_ACTIVITIES_SUCCESS = 'SYNC_ACTIVITIES_SUCCESS';
export const SYNC_ACTIVITIES_FAIL = 'SYNC_ACTIVITIES_FAIL';
export const SET_ONLINE_STATUS = 'SET_ONLINE_STATUS';
export const CLEAR_ACTIVITY_CACHE = 'CLEAR_ACTIVITY_CACHE';

// Additional Action Types that were missing
export const UPDATE_ACTIVITY_FILTER = 'UPDATE_ACTIVITY_FILTER';
export const ACTIVITY_BATCH_UPDATE = 'ACTIVITY_BATCH_UPDATE';
export const SET_REFRESH_INTERVAL = 'SET_REFRESH_INTERVAL';
export const UPDATE_USER_PREFERENCES = 'UPDATE_USER_PREFERENCES';
export const ACTIVITY_ERROR_DISMISSED = 'ACTIVITY_ERROR_DISMISSED';

// Cache duration constants
const CACHE_DURATIONS = {
  activities: 2 * 60 * 1000,    // 2 minutes
  stats: 5 * 60 * 1000,         // 5 minutes  
  persona: 15 * 60 * 1000,      // 15 minutes
  priorities: 5 * 60 * 1000,    // 5 minutes
  dashboard: 5 * 60 * 1000      // 5 minutes
};

// Socket instance for real-time updates
let socket = null;

// Utility function to check if cached data is stale
const isCacheStale = (lastFetched, cacheType) => {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > CACHE_DURATIONS[cacheType];
};

// Real-time activity subscription
export const subscribeToActivityUpdates = (userId) => (dispatch) => {
  // Initialize socket connection if not already connected
  if (!socket) {
    socket = io('/activities', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }

  // Listen for new activities
  socket.on(`user-activity-${userId}`, (newActivity) => {
    dispatch({
      type: NEW_ACTIVITY_RECEIVED,
      payload: newActivity
    });
  });

  // Listen for connection status changes
  socket.on('connect', () => {
    dispatch({ type: SET_ONLINE_STATUS, payload: true });
    // Sync any pending activities when reconnected
    dispatch(syncPendingActivities());
  });

  socket.on('disconnect', () => {
    dispatch({ type: SET_ONLINE_STATUS, payload: false });
  });

  // Return cleanup function
  return () => {
    socket.off(`user-activity-${userId}`);
    socket.disconnect();
    socket = null;
  };
};

// Enhanced fetch with caching
export const fetchUserActivities = (userId, filter = 'all', limit = 50, skip = 0, forceRefresh = false) => async (dispatch, getState) => {
  const { lastFetched } = getState().activity;
  
  // Check cache unless force refresh is requested
  if (!forceRefresh && !isCacheStale(lastFetched.activities, 'activities')) {
    console.log('Using cached activities data');
    return getState().activity.activities;
  }

  dispatch({ type: FETCH_ACTIVITIES_DIRECT_REQUEST });

  try {
    const response = await axios.get(`/api/activities/direct/${userId}`, {
      params: { filter, limit, skip },
    });
    dispatch({
      type: FETCH_USER_ACTIVITIES_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_USER_ACTIVITIES_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    throw error;
  }
};

// Fetch activities directly (simple version without cache)
export const fetchActivitiesDirect = (userId) => async (dispatch) => {
  dispatch({ type: FETCH_ACTIVITIES_DIRECT_REQUEST });
  
  try {
    const response = await axios.get(`/api/activities/direct/${userId}`);
    dispatch({
      type: FETCH_ACTIVITIES_DIRECT_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_ACTIVITIES_DIRECT_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    throw error;
  }
};

// Enhanced filtered activities fetch
export const fetchFilteredActivities = (userId, filters = {}) => async (dispatch) => {
  dispatch({ type: FETCH_FILTERED_ACTIVITIES_REQUEST });
  
  try {
    const queryParams = new URLSearchParams({
      filter: filters.actionType || 'all',
      limit: filters.limit || 50,
      skip: filters.skip || 0,
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      category: filters.category || '',
      search: filters.search || '',
      priority: filters.priority || '',
      sortBy: filters.sortBy || 'timestamp',
      sortOrder: filters.sortOrder || 'desc'
    });
    
    const response = await axios.get(`/api/activities/direct/${userId}?${queryParams}`);
    dispatch({
      type: FETCH_FILTERED_ACTIVITIES_SUCCESS,
      payload: response.data
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_FILTERED_ACTIVITIES_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

// Enhanced activity stats with caching
export const fetchActivityStats = (userId, timeFrame = 'week', forceRefresh = false) => async (dispatch, getState) => {
  const { lastFetched } = getState().activity;
  
  if (!forceRefresh && !isCacheStale(lastFetched.stats, 'stats')) {
    console.log('Using cached stats data');
    return getState().activity.stats;
  }

  dispatch({ type: FETCH_ACTIVITY_STATS_REQUEST });
  
  try {
    const response = await axios.get(`/api/activities/stats/${userId}`, {
      params: { timeFrame },
    });
    dispatch({
      type: FETCH_ACTIVITY_STATS_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_ACTIVITY_STATS_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    throw error;
  }
};

// Enhanced persona fetch with fallback
export const fetchUserPersona = (userId, forceRefresh = false) => async (dispatch, getState) => {
  const { lastFetched } = getState().activity;
  
  if (!forceRefresh && !isCacheStale(lastFetched.persona, 'persona')) {
    console.log('Using cached persona data');
    return getState().activity.persona;
  }

  dispatch({ type: FETCH_USER_PERSONA_REQUEST });
  
  try {
    const response = await axios.get(`/api/activities/persona/${userId}`);
    dispatch({
      type: FETCH_USER_PERSONA_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    const errorData = {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      type: error.response?.status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR'
    };
    
    dispatch({
      type: FETCH_USER_PERSONA_FAIL,
      payload: errorData,
    });
    
    // Create default persona for new users
    if (errorData.type === 'NOT_FOUND') {
      const defaultPersona = {
        type: 'New User',
        primarySkill: 'Getting Started',
        secondarySkills: [],
        expertiseLevel: 'beginner',
        recommendedSkills: ['task management', 'team collaboration', 'project planning'],
        activityLevel: 'New',
        description: 'Welcome! Start creating tasks and activities to build your professional persona.'
      };
      
      dispatch({
        type: FETCH_USER_PERSONA_SUCCESS,
        payload: defaultPersona
      });
      
      return defaultPersona;
    }
    
    throw error;
  }
};

// Enhanced task priorities fetch
export const fetchTaskPriorities = (userId, forceRefresh = false) => async (dispatch, getState) => {
  const { lastFetched } = getState().activity;
  
  if (!forceRefresh && !isCacheStale(lastFetched.priorities, 'priorities')) {
    console.log('Using cached priorities data');
    return getState().activity.taskPriorities;
  }

  dispatch({ type: FETCH_TASK_PRIORITIES_REQUEST });
  
  try {
    const response = await axios.get(`/api/tasks/priorities/${userId}`);
    dispatch({
      type: FETCH_TASK_PRIORITIES_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_TASK_PRIORITIES_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    throw error;
  }
};

// Enhanced dashboard summary fetch
export const fetchDashboardSummary = (userId, forceRefresh = false) => async (dispatch, getState) => {
  const { lastFetched } = getState().activity;
  
  if (!forceRefresh && !isCacheStale(lastFetched.dashboard, 'dashboard')) {
    console.log('Using cached dashboard data');
    return getState().activity.dashboardSummary;
  }

  dispatch({ type: FETCH_DASHBOARD_SUMMARY_REQUEST });
  
  try {
    const response = await axios.get(`/api/dashboard/summary/${userId}`);
    dispatch({
      type: FETCH_DASHBOARD_SUMMARY_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_DASHBOARD_SUMMARY_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    throw error;
  }
};

// Queue activity for offline support
export const queueActivity = (activityData) => ({
  type: QUEUE_ACTIVITY,
  payload: activityData
});

// Sync pending activities when online
export const syncPendingActivities = () => async (dispatch, getState) => {
  const { pendingActivities, isOnline } = getState().activity;
  
  if (!isOnline || !pendingActivities.length) return;
  
  dispatch({ type: SYNC_ACTIVITIES_START });
  
  try {
    const responses = await Promise.all(
      pendingActivities.map(activity => 
        axios.post('/api/activities/create', activity)
      )
    );
    
    dispatch({
      type: SYNC_ACTIVITIES_SUCCESS,
      payload: responses.map(r => r.data)
    });
  } catch (error) {
    dispatch({
      type: SYNC_ACTIVITIES_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Clear activity cache
export const clearActivityCache = () => ({
  type: CLEAR_ACTIVITY_CACHE
});

// Update activity filter
export const updateActivityFilter = (filterUpdate) => ({
  type: UPDATE_ACTIVITY_FILTER,
  payload: filterUpdate
});

// Batch update activities
export const batchUpdateActivities = (updates) => ({
  type: ACTIVITY_BATCH_UPDATE,
  payload: updates
});

// Set refresh interval
export const setRefreshInterval = (interval) => ({
  type: SET_REFRESH_INTERVAL,
  payload: interval
});

// Update user preferences
export const updateUserPreferences = (preferences) => ({
  type: UPDATE_USER_PREFERENCES,
  payload: preferences
});

// Dismiss activity error
export const dismissActivityError = () => ({
  type: ACTIVITY_ERROR_DISMISSED
});

// Batch fetch all activity data (optimized)
export const fetchAllActivityData = (userId, forceRefresh = false) => async (dispatch) => {
  try {
    const promises = [
      dispatch(fetchUserActivities(userId, 'all', 50, 0, forceRefresh)),
      dispatch(fetchActivityStats(userId, 'week', forceRefresh)),
      dispatch(fetchUserPersona(userId, forceRefresh)),
      dispatch(fetchTaskPriorities(userId, forceRefresh)),
      dispatch(fetchDashboardSummary(userId, forceRefresh))
    ];
    
    const results = await Promise.allSettled(promises);
    
    // Handle partial failures gracefully
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to fetch data at index ${index}:`, result.reason);
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error in batch activity data fetch:', error);
    throw error;
  }
};