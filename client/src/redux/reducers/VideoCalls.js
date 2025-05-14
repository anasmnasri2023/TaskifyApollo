// src/reducers/VideoCalls.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  error: null,
  _ALL: [],        // All video calls
  _UPCOMING: [],   // Upcoming video calls
  _ACTIVE: null,   // Currently active call
  _ONE: null       // Selected single call
};

const videoCallsSlice = createSlice({
  name: "videoCalls",
  initialState,
  reducers: {
    _SetLoading: (state, action) => {
      state.loading = action.payload;
    },
    _SetError: (state, action) => {
      state.error = action.payload;
    },
    _SetCalls: (state, action) => {
      // Ensure we're setting an array
      state._ALL = Array.isArray(action.payload) ? action.payload : [];
    },
    _SetUpcomingCalls: (state, action) => {
      state._UPCOMING = Array.isArray(action.payload) ? action.payload : [];
    },
    _SetOneCall: (state, action) => {
      state._ONE = action.payload;
    },
    _AddCall: (state, action) => {
      // Add a call to the _ALL array
      if (action.payload) {
        const callId = action.payload._id;
        
        // Check if call already exists
        const existingIndex = state._ALL.findIndex(call => call._id === callId);
        if (existingIndex >= 0) {
          // Update existing call
          state._ALL[existingIndex] = { ...state._ALL[existingIndex], ...action.payload };
        } else {
          // Add new call
          state._ALL.push(action.payload);
        }
      }
    },
    _UpdateCall: (state, action) => {
      const { id, updates } = action.payload;
      if (!id || !updates) {
        return;
      }
      
      // Update in _ALL array
      const callIndex = state._ALL.findIndex(call => call._id === id);
      if (callIndex >= 0) {
        state._ALL[callIndex] = { ...state._ALL[callIndex], ...updates };
      }
      
      // Update in _UPCOMING array
      const upcomingIndex = state._UPCOMING.findIndex(call => call._id === id);
      if (upcomingIndex >= 0) {
        state._UPCOMING[upcomingIndex] = { ...state._UPCOMING[upcomingIndex], ...updates };
      }
      
      // Update _ONE if it matches
      if (state._ONE && state._ONE._id === id) {
        state._ONE = { ...state._ONE, ...updates };
      }
      
      // Update _ACTIVE if it matches
      if (state._ACTIVE && state._ACTIVE._id === id) {
        state._ACTIVE = { ...state._ACTIVE, ...updates };
      }
    },
    _DeleteCall: (state, action) => {
      const callId = action.payload;
      
      // Remove from _ALL array
      state._ALL = state._ALL.filter(call => call._id !== callId);
      
      // Remove from _UPCOMING array
      state._UPCOMING = state._UPCOMING.filter(call => call._id !== callId);
      
      // Clear _ONE if it matches
      if (state._ONE && state._ONE._id === callId) {
        state._ONE = null;
      }
      
      // Clear _ACTIVE if it matches
      if (state._ACTIVE && state._ACTIVE._id === callId) {
        state._ACTIVE = null;
      }
    },
    _SetActiveCall: (state, action) => {
      state._ACTIVE = action.payload;
    },
    _ClearActiveCall: (state) => {
      state._ACTIVE = null;
    }
  }
});

// Export the reducer actions
export const {
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
} = videoCallsSlice.actions;

// Export the slice itself - THIS IS IMPORTANT!
export { videoCallsSlice };

// Export the reducer as default
export default videoCallsSlice.reducer;