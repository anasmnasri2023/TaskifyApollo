// redux/reducers/adminChatReducer.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  error: null,
  overviewStats: null,
  roomStats: {},
  userStats: {},
  customReport: null,
  allChatRooms: [],
  roomsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  }
};

export const adminChatSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    _AdminSetLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    _AdminChatError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    _ClearAdminError: (state) => {
      state.error = null;
    },
    
    _GetOverviewStatsSuccess: (state, action) => {
      state.loading = false;
      state.overviewStats = action.payload;
    },
    
    _GetRoomStatsSuccess: (state, action) => {
      state.loading = false;
      state.roomStats[action.payload.room._id] = action.payload;
    },
    
    _GetUserStatsSuccess: (state, action) => {
      state.loading = false;
      state.userStats[action.payload.user._id] = action.payload;
    },
    
    _GenerateReportSuccess: (state, action) => {
      state.loading = false;
      state.customReport = action.payload;
    },
    
    _GetAllChatRoomsSuccess: (state, action) => {
      state.loading = false;
      state.allChatRooms = action.payload.rooms;
      state.roomsPagination = action.payload.pagination;
    },
    
    _DeactivateRoomSuccess: (state, action) => {
      state.loading = false;
      const { roomId, room } = action.payload;
      const index = state.allChatRooms.findIndex(r => r._id === roomId);
      if (index !== -1) {
        state.allChatRooms[index] = room;
      }
    },
    
    _ArchiveRoomSuccess: (state, action) => {
      state.loading = false;
      const { roomId, room } = action.payload;
      const index = state.allChatRooms.findIndex(r => r._id === roomId);
      if (index !== -1) {
        state.allChatRooms[index] = room;
      }
    },
    
    _ForceAddUserSuccess: (state, action) => {
      state.loading = false;
      const { roomId, room } = action.payload;
      const index = state.allChatRooms.findIndex(r => r._id === roomId);
      if (index !== -1) {
        state.allChatRooms[index] = room;
      }
    },
    
    _DeleteMessagesSuccess: (state, action) => {
      state.loading = false;
      const { roomId } = action.payload;
      if (state.roomStats[roomId]) {
        state.roomStats[roomId].statistics.totalMessages -= action.payload.deletedCount;
      }
    },
    
    _ClearCustomReport: (state) => {
      state.customReport = null;
    }
  }
});

export const {
  _AdminSetLoading,
  _AdminChatError,
  _ClearAdminError,
  _GetOverviewStatsSuccess,
  _GetRoomStatsSuccess,
  _GetUserStatsSuccess,
  _GenerateReportSuccess,
  _GetAllChatRoomsSuccess,
  _DeactivateRoomSuccess,
  _ArchiveRoomSuccess,
  _ForceAddUserSuccess,
  _DeleteMessagesSuccess,
  _ClearCustomReport
} = adminChatSlice.actions;

export default adminChatSlice.reducer;