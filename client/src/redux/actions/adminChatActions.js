// redux/actions/adminChatActions.js
import axios from "axios";
import swal from "sweetalert";

import {
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
} from "../reducers/adminChatReducer";

// Debug helper
const logAction = (action, data) => {
  console.log(`[ADMIN_CHAT] ${action}`, data || '');
};

// Auth check helper
const checkAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const currentHeader = axios.defaults.headers.common["Authorization"];
  
  if (token && (!currentHeader || currentHeader !== `Bearer ${token}`)) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return true;
  }
  return false;
};



// Get overview statistics
export const GetOverviewStats = () => async (dispatch) => {
  logAction('GetOverviewStats');
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.get('/api/admin/stats/overview');
    logAction('GetOverviewStats Success', res.data);

    if (res.data.success) {
      dispatch(_GetOverviewStatsSuccess(res.data.stats));
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch overview statistics');
    }
  } catch (err) {
    logAction('GetOverviewStats Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch overview statistics';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Get room statistics
export const GetRoomStats = (roomId) => async (dispatch) => {
  logAction('GetRoomStats', { roomId });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.get(`/api/admin/stats/room/${roomId}`);
    logAction('GetRoomStats Success', res.data);

    if (res.data.success) {
      dispatch(_GetRoomStatsSuccess(res.data.roomStats));
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch room statistics');
    }
  } catch (err) {
    logAction('GetRoomStats Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch room statistics';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Get user chat statistics
export const GetUserChatStats = (userId) => async (dispatch) => {
  logAction('GetUserChatStats', { userId });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.get(`/api/admin/stats/user/${userId}`);
    logAction('GetUserChatStats Success', res.data);

    if (res.data.success) {
      dispatch(_GetUserStatsSuccess(res.data.userStats));
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch user statistics');
    }
  } catch (err) {
    logAction('GetUserChatStats Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch user statistics';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Generate custom report
export const GenerateCustomReport = (reportConfig) => async (dispatch) => {
  logAction('GenerateCustomReport', reportConfig);
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.post('/api/admin/reports/generate', reportConfig);
    logAction('GenerateCustomReport Success', res.data);

    if (res.data.success) {
      dispatch(_GenerateReportSuccess(res.data.report));
      swal("Success", "Report generated successfully", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to generate report');
    }
  } catch (err) {
    logAction('GenerateCustomReport Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to generate report';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Get all chat rooms
export const GetAllChatRooms = (filters = {}) => async (dispatch) => {
    
  logAction('GetAllChatRooms', filters);
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const queryString = new URLSearchParams(filters).toString();
    const res = await axios.get(`/api/admin/rooms?${queryString}`);
    logAction('GetAllChatRooms Success', res.data);

    

    if (res.data.success) {
      dispatch(_GetAllChatRoomsSuccess(res.data));
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch chat rooms');
    }
  } catch (err) {
    logAction('GetAllChatRooms Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch chat rooms';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Deactivate chat room
export const DeactivateChatRoom = (roomId) => async (dispatch) => {
  logAction('DeactivateChatRoom', { roomId });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.patch(`/api/admin/rooms/${roomId}/deactivate`);
    logAction('DeactivateChatRoom Success', res.data);

    if (res.data.success) {
      dispatch(_DeactivateRoomSuccess({ roomId, room: res.data.room }));
      swal("Success", "Room deactivated successfully", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to deactivate room');
    }
  } catch (err) {
    logAction('DeactivateChatRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to deactivate room';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Archive chat room
export const ArchiveChatRoom = (roomId) => async (dispatch) => {
  logAction('ArchiveChatRoom', { roomId });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.patch(`/api/admin/rooms/${roomId}/archive`);
    logAction('ArchiveChatRoom Success', res.data);

    if (res.data.success) {
      dispatch(_ArchiveRoomSuccess({ roomId, room: res.data.room }));
      swal("Success", "Room archived successfully", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to archive room');
    }
  } catch (err) {
    logAction('ArchiveChatRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to archive room';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Force add user to room
export const ForceAddUserToRoom = (roomId, userId) => async (dispatch) => {
  logAction('ForceAddUserToRoom', { roomId, userId });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.post(`/api/admin/rooms/${roomId}/force-add-user`, { userId });
    logAction('ForceAddUserToRoom Success', res.data);

    if (res.data.success) {
      dispatch(_ForceAddUserSuccess({ roomId, room: res.data.room }));
      swal("Success", "User added to room successfully", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to add user to room');
    }
  } catch (err) {
    logAction('ForceAddUserToRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to add user to room';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Delete messages
export const DeleteMessages = (roomId, messageIds = [], deleteAll = false) => async (dispatch) => {
  logAction('DeleteMessages', { roomId, messageIds, deleteAll });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.delete(`/api/admin/rooms/${roomId}/messages`, {
      data: { messageIds, deleteAll }
    });
    logAction('DeleteMessages Success', res.data);

    if (res.data.success) {
      dispatch(_DeleteMessagesSuccess({ 
        roomId, 
        messageIds, 
        deleteAll, 
        deletedCount: res.data.deletedCount 
      }));
      swal("Success", res.data.message, "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to delete messages');
    }
  } catch (err) {
    logAction('DeleteMessages Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to delete messages';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Export chat data
export const ExportChatData = (roomId, format = 'json', startDate, endDate) => async (dispatch) => {
  logAction('ExportChatData', { roomId, format, startDate, endDate });
  dispatch(_AdminSetLoading(true));

  try {
    checkAuthHeaders();
    const params = { format };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const queryString = new URLSearchParams(params).toString();
    const res = await axios.get(`/api/admin/rooms/${roomId}/export?${queryString}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chat_${roomId}_${Date.now()}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    swal("Success", "Chat data exported successfully", "success");
    return true;
  } catch (err) {
    logAction('ExportChatData Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to export chat data';
    dispatch(_AdminChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_AdminSetLoading(false));
  }
};

// Clear admin error
export const ClearAdminError = () => (dispatch) => {
  dispatch(_ClearAdminError());
};

// Clear custom report
export const ClearCustomReport = () => (dispatch) => {
  dispatch(_ClearCustomReport());
};