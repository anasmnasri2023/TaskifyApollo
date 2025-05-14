import axios from "axios";
import swal from "sweetalert";
import chatSocketService from '../../services/chatSocketService';

import {
  _SetChatLoading,
  _ClearChatError,
  _GetChatRooms,
  _GetChatRoom,
  _CreateChatRoom,
  _UpdateChatRoom,
  _DeleteChatRoom,
  _GetMessages,
  _AddMessage,
  _MarkMessagesRead,
  _DeleteMessage,
  _ChatError,
  _SetHasMoreMessages,
  _SetCreateChatLoading,
  _ClearCurrentRoom,
  _GetAllUsers,
  _SilentUpdateChatRooms,
  _UpdateTypingStatus,
  _ClearTypingStatus,
  _ReplaceMessage,
  _RemoveMessage,
  _SetChatMembers,
  _RemoveChatMember,
  _AddChatMember,
  _ClearChatMessages
} from "../reducers/chatReducer";

// Debug helper
const logAction = (action, data) => {
  console.log(`[CHAT] ${action}`, data || '');
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

// Track mark-read operations globally
const markReadTracker = new Map();
const MARK_READ_COOLDOWN = 3000; // 3 seconds

// Get all chat rooms - shows loading
export const GetChatRooms = () => async (dispatch) => {
  logAction('GetChatRooms');
  dispatch(_SetChatLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.get('/api/rooms');
    logAction('GetChatRooms Success', res.data);

    if (res.data.success) {
      dispatch(_GetChatRooms(res.data.chatRooms || []));
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch chat rooms');
    }
  } catch (err) {
    logAction('GetChatRooms Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch chat rooms';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_SetChatLoading(false));
  }
};

// Silently update chat rooms - no loading state
export const SilentUpdateChatRooms = (chatRooms) => (dispatch) => {
  logAction('SilentUpdateChatRooms', chatRooms.length);
  dispatch(_SilentUpdateChatRooms(chatRooms));
};

// Get a specific chat room
export const GetChatRoom = (roomId) => async (dispatch) => {
  logAction('GetChatRoom', { roomId });
  dispatch(_SetChatLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.get(`/api/rooms/${roomId}`);
    logAction('GetChatRoom Success', res.data);
    
    if (res.data.success) {
      dispatch(_GetChatRoom(res.data.chatRoom || res.data));
      
      // Join the socket room
      chatSocketService.joinChatRoom(roomId);
      
      // Clear typing status when entering room
      dispatch(_ClearTypingStatus(roomId));
      
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch chat room');
    }
  } catch (err) {
    logAction('GetChatRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch chat room';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_SetChatLoading(false));
  }
};

// Load chat messages with pagination
export const GetMessages = (roomId, page = 1, limit = 20) => async (dispatch) => {
  logAction('GetMessages', { roomId, page, limit });
  dispatch(_SetChatLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.get(`/api/messages/${roomId}?page=${page}&limit=${limit}`);
    logAction('GetMessages Success', res.data);

    if (res.data.success) {
      const messages = res.data.messages || [];

      dispatch(_GetMessages({
        roomId,
        messages,
        pagination: {
          currentPage: page,
          totalPages: res.data.totalPages,
          totalMessages: res.data.totalMessages
        }
      }));
      
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to fetch messages');
    }
  } catch (err) {
    logAction('GetMessages Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch messages';
    dispatch(_ChatError(errorMsg));
    console.error('Error fetching messages:', err);
    return null;
  } finally {
    dispatch(_SetChatLoading(false));
  }
};
export const SendMessage = (chatRoomId, content, attachments = []) => async (dispatch, getState) => {
  logAction('SendMessage', { chatRoomId, content });
  
  // Get the current user and chat room
  const { auth, chat } = getState();
  const user = auth.user;
  const room = chat.chatRooms.find(r => r._id === chatRoomId);
  
  // Create a temporary message object with a temporary ID
  const tempMessage = {
    _id: 'temp_' + Date.now(),
    content,
    attachments,
    chatRoom: chatRoomId,
    sender: {
      _id: user.id,
      fullName: user.fullName,
      email: user.email
    },
    createdAt: new Date().toISOString(),
    readBy: [{ user: user.id }]
  };
  
  // Add this message to Redux immediately (optimistic update)
  dispatch(_AddMessage(tempMessage));
  
  // Also update the chat rooms list to show this message as the last message
  if (room) {
    const updatedRoom = {
      ...room,
      lastMessage: tempMessage,
      updatedAt: new Date().toISOString()
    };
    dispatch(_UpdateChatRoom(updatedRoom));
  }

  try {
    checkAuthHeaders();
    const res = await axios.post('/api/messages', {
      chatRoomId,
      content,
      attachments
    });
    
    logAction('SendMessage Success', res.data);

    if (res.data.success) {
      // Once we get a response, replace the temp message with the real one
      const realMessage = res.data.message;
      
      // Replace the temporary message with the real one
      dispatch(_ReplaceMessage({
        tempId: tempMessage._id,
        realMessage,
        chatRoomId
      }));
      
      // Update the chat room's last message
      if (room) {
        const updatedRoom = {
          ...room,
          lastMessage: realMessage,
          updatedAt: new Date().toISOString()
        };
        dispatch(_UpdateChatRoom(updatedRoom));
      }
      
      // Emit via socket for real-time updates
      chatSocketService.sendSocketMessage({
        ...realMessage,
        chatRoomId
      });
      
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to send message');
    }
  } catch (err) {
    logAction('SendMessage Error', err);
    
    // Remove the temporary message since the request failed
    dispatch(_RemoveMessage({
      messageId: tempMessage._id,
      chatRoomId
    }));
    
    const errorMsg = err.response?.data?.message || 'Failed to send message';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  }
};

// Mark messages as read with proper cooldown
export const MarkMessagesRead = (roomId) => async (dispatch, getState) => {
  logAction('MarkMessagesRead', { roomId });
  
  // Check if we've recently marked this room as read
  const lastMarkTime = markReadTracker.get(roomId) || 0;
  const now = Date.now();
  
  if (now - lastMarkTime < MARK_READ_COOLDOWN) {
    console.log(`Mark read cooldown for room ${roomId}, skipping...`);
    return;
  }
  
  // Update tracker
  markReadTracker.set(roomId, now);
  
  const { auth } = getState();
  const userId = auth.user?.id;

  try {
    checkAuthHeaders();
    
    // API call to mark messages as read
    await axios.put(`/api/messages/${roomId}/read`);
    
    // Update local state
    dispatch(_MarkMessagesRead({ 
      roomId, 
      userId,
      timestamp: new Date().toISOString() 
    }));
    
    // Emit via socket with debounce
    if (!window.markReadSocketTimeout) {
      window.markReadSocketTimeout = setTimeout(() => {
        chatSocketService.markMessagesReadSocket(roomId);
        window.markReadSocketTimeout = null;
      }, 1000);
    }
    
  } catch (err) {
    logAction('MarkMessagesRead Error', err);
    console.error('Error marking messages as read:', err);
    
    // Remove from tracker on error to allow retry
    markReadTracker.delete(roomId);
  }
};

// Silent mark messages read - for socket events
export const SilentMarkMessagesRead = (data) => (dispatch) => {
  logAction('SilentMarkMessagesRead', data);
  
  // Don't emit socket events from silent updates to prevent loops
  dispatch(_MarkMessagesRead(data));
};

// Get all users for creating a new chat
export const GetAllUsers = () => async (dispatch) => {
  logAction('GetAllUsers');

  try {
    checkAuthHeaders();
    const res = await axios.get('/api/users');
    logAction('GetAllUsers Success', res.data);

    // Check if the response has data property directly
    if (res.data && (res.data.data || res.data.users)) {
      // Handle different API response formats
      const users = res.data.data || res.data.users || [];
      dispatch(_GetAllUsers(users));
      return res.data;
    } else if (Array.isArray(res.data)) {
      // If the response is directly an array of users
      dispatch(_GetAllUsers(res.data));
      return { data: res.data };
    } else {
      throw new Error('Invalid response format');
    }
  } catch (err) {
    logAction('GetAllUsers Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch users';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  }
};

// Create a new chat room
export const CreateNewChatRoom = (roomData) => async (dispatch) => {
  logAction('CreateChatRoom', roomData);
  dispatch(_SetCreateChatLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.post('/api/rooms', roomData);
    logAction('CreateChatRoom Success', res.data);

    if (res.data.success) {
      const newRoom = res.data.chatRoom;
      dispatch(_CreateChatRoom(newRoom));
      
      // Notify other users about the new chat room
      chatSocketService.notifyNewChatRoom(newRoom);
      
      swal("Success", "Chat room created successfully", "success");
      
      return newRoom;
    } else {
      throw new Error(res.data.message || 'Failed to create chat room');
    }
  } catch (err) {
    logAction('CreateChatRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to create chat room';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    throw err;
  } finally {
    dispatch(_SetCreateChatLoading(false));
  }
};

// Update chat room
export const UpdateChatRoom = (roomId, roomData) => async (dispatch) => {
  logAction('UpdateChatRoom', { roomId, roomData });
  dispatch(_SetChatLoading(true));

  try {
    checkAuthHeaders();
    const res = await axios.put(`/api/rooms/${roomId}`, roomData);
    logAction('UpdateChatRoom Success', res.data);

    if (res.data.success) {
      const updatedRoom = res.data.chatRoom;
      dispatch(_UpdateChatRoom(updatedRoom));
      
      // Notify other users about the updated chat room
      chatSocketService.notifyNewChatRoom(updatedRoom);
      
      swal("Success", "Chat room updated successfully", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to update chat room');
    }
  } catch (err) {
    logAction('UpdateChatRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to update chat room';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  } finally {
    dispatch(_SetChatLoading(false));
  }
};

// Delete chat room
export const DeleteChatRoom = (roomId) => async (dispatch) => {
  logAction('DeleteChatRoom', { roomId });
  
  if (window.confirm("Are you sure you want to delete this chat room?")) {
    dispatch(_SetChatLoading(true));

    try {
      checkAuthHeaders();
      const res = await axios.delete(`/api/rooms/${roomId}`);
      logAction('DeleteChatRoom Success', res.data);

      if (res.data.success) {
        dispatch(_DeleteChatRoom(roomId));
        
        // Notify other users about the deleted chat room
        chatSocketService.socketClient.emit('silent-refresh', {
          type: 'delete-chat-room',
          roomId
        });
        
        swal("Success", "Chat room deleted successfully", "success");
        return res.data;
      } else {
        throw new Error(res.data.message || 'Failed to delete chat room');
      }
    } catch (err) {
      logAction('DeleteChatRoom Error', err);
      
      const errorMsg = err.response?.data?.message || 'Failed to delete chat room';
      dispatch(_ChatError(errorMsg));
      swal("Error", errorMsg, "error");
      return null;
    } finally {
      dispatch(_SetChatLoading(false));
    }
  }
};

// Delete a message
export const DeleteMessage = (messageId, roomId) => async (dispatch) => {
  logAction('DeleteMessage', { messageId, roomId });
  
  if (window.confirm("Are you sure you want to delete this message?")) {
    dispatch(_SetChatLoading(true));

    try {
      checkAuthHeaders();
      const res = await axios.delete(`/api/messages/${messageId}`);
      logAction('DeleteMessage Success', res.data);

      if (res.data.success) {
        dispatch(_DeleteMessage({ roomId, messageId }));
        
        // Notify others about the deleted message
        chatSocketService.socketClient.emit('silent-refresh', {
          type: 'delete-message',
          roomId,
          messageId
        });
        
        swal("Success", "Message deleted successfully", "success");
        return res.data;
      } else {
        throw new Error(res.data.message || 'Failed to delete message');
      }
    } catch (err) {
      logAction('DeleteMessage Error', err);
      
      const errorMsg = err.response?.data?.message || 'Failed to delete message';
      dispatch(_ChatError(errorMsg));
      swal("Error", errorMsg, "error");
      return null;
    } finally {
      dispatch(_SetChatLoading(false));
    }
  }
};

// Clear current room data
export const ClearCurrentRoom = () => (dispatch) => {
  logAction('ClearCurrentRoom');
  dispatch(_ClearCurrentRoom());
  dispatch(_ClearTypingStatus());
};

// Clear chat errors
export const ClearChatError = () => (dispatch) => {
  dispatch(_ClearChatError());
};

// Socket action for adding a new message
export const AddMessage = (message) => (dispatch) => {
  logAction('AddMessage (Socket)', { id: message._id });
  dispatch(_AddMessage(message));
};

// Update typing status from socket event
export const UpdateTypingStatus = (data) => (dispatch) => {
  logAction('UpdateTypingStatus (Socket)', data);
  dispatch(_UpdateTypingStatus(data));
};

// Get chat members
export const GetChatMembers = (roomId) => async (dispatch) => {
  logAction('GetChatMembers', { roomId });

  try {
    checkAuthHeaders();
    const res = await axios.get(`/api/rooms/${roomId}/members`);
    logAction('GetChatMembers Success', res.data);

    if (res.data.success) {
      dispatch(_SetChatMembers(res.data.members || []));
      return res.data.members;
    } else {
      throw new Error(res.data.message || 'Failed to fetch members');
    }
  } catch (err) {
    logAction('GetChatMembers Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to fetch chat members';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  }
};

// Show chat members in a SweetAlert dialog
export const ShowChatMembers = (roomId) => async (dispatch, getState) => {
  logAction('ShowChatMembers', { roomId });
  
  const { auth, chat } = getState();
  const currentUser = auth.user;
  const currentRoom = chat.currentRoom;
  
  // If we already have the room data with participants
  if (currentRoom && currentRoom._id === roomId && currentRoom.participants) {
    const creatorId = currentRoom.createdBy._id || currentRoom.createdBy;
    const userId = currentUser.id;
    
    const isCreator = creatorId === userId;
    
    // Format participants data for display
    const membersList = currentRoom.participants.map(member => {
      const memberId = member._id;
      const isOwner = creatorId === memberId;
      const isCurrentUser = userId === memberId;
      
      return `
        <div class="flex items-center justify-between mb-2 p-2 ${isCurrentUser ? 'bg-gray-100' : ''}">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
              ${member.fullName?.charAt(0) || member.email?.charAt(0) || 'U'}
            </div>
            <div>
              <p>${member.fullName || member.email} ${isOwner ? '<span class="text-primary">(Creator)</span>' : ''} ${isCurrentUser ? '(You)' : ''}</p>
            </div>
          </div>
          ${(isCreator && !isCurrentUser) ? 
            `<button data-member-id="${memberId}" class="remove-member-btn text-danger px-2 py-1 rounded border border-danger">
              Remove
            </button>` : ''}
        </div>
      `;
    }).join('');
    
    // Create a custom HTML element for SweetAlert
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="max-h-96 overflow-y-auto">
        ${membersList}
      </div>
      ${isCreator && !currentRoom.isDirectMessage ? 
        `<button id="add-member-btn" class="mt-4 px-4 py-2 bg-primary text-white rounded">
          Add Member
        </button>` : ''}
    `;
    
    // Show SweetAlert with members list
    swal({
      title: "Chat Members",
      content: wrapper,
      buttons: {
        close: {
          text: "Close",
          value: null,
          visible: true,
          className: "bg-gray-500",
          closeModal: true,
        }
      }
    });
    
    // Wait for the SweetAlert to be fully rendered
    setTimeout(() => {
      // Add event listeners to remove buttons
      document.querySelectorAll('.remove-member-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const memberId = this.getAttribute('data-member-id');
          swal.close();
          dispatch(RemoveChatMember(roomId, memberId));
        });
      });
      
      // Add event listener to add member button
      const addBtn = document.getElementById('add-member-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function() {
          swal.close();
          dispatch(ShowAddMemberDialog(roomId));
        });
      }
    }, 100);
    
  } else {
    // Fetch room data first if we don't have it
    try {
      const roomData = await dispatch(GetChatRoom(roomId));
      if (roomData) {
        dispatch(ShowChatMembers(roomId));
      }
    } catch (err) {
      swal("Error", "Failed to fetch chat information", "error");
    }
  }
};

// Remove a member from a chat room
export const RemoveChatMember = (roomId, memberId) => async (dispatch) => {
  logAction('RemoveChatMember', { roomId, memberId });
  
  try {
    // Confirm before removing
    const confirmResult = await swal({
      title: "Remove Member",
      text: "Are you sure you want to remove this member from the chat?",
      icon: "warning",
      buttons: ["Cancel", "Remove"],
      dangerMode: true,
    });
    
    if (!confirmResult) return null;
    
    checkAuthHeaders();
    const res = await axios.delete(`/api/rooms/${roomId}/members/${memberId}`);
    logAction('RemoveChatMember Success', res.data);
    
    // Handle both backend response formats
    const success = res.data.success !== undefined ? res.data.success : true;
    
    if (success) {
      // Update room data in Redux
      dispatch(_RemoveChatMember(memberId));
      
      // Explicitly fetch fresh room data
      dispatch(GetChatRoom(roomId));
      
      // Notify via socket
      chatSocketService.socketClient.emit('chat-member-update', {
        type: 'remove-member',
        roomId,
        memberId
      });
      
      swal("Success", "Member removed from chat", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to remove member');
    }
  } catch (err) {
    logAction('RemoveChatMember Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to remove member from chat';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  }
};

// Show add member dialog with multi-select functionality
export const ShowAddMemberDialog = (roomId) => async (dispatch, getState) => {
  logAction('ShowAddMemberDialog', { roomId });
  
  // Fetch all users first
  await dispatch(GetAllUsers());
  
  const { chat } = getState();
  const currentRoom = chat.currentRoom;
  const allUsers = chat.allUsers || [];
  
  // Check if we have users
  if (!allUsers.length) {
    swal("Error", "Failed to fetch users", "error");
    return;
  }
  
  // Filter out users already in the chat
  const existingMemberIds = currentRoom.participants.map(p => p._id);
  const availableUsers = allUsers.filter(user => !existingMemberIds.includes(user._id));
  
  if (availableUsers.length === 0) {
    swal("No Users Available", "All users are already in this chat", "info");
    return;
  }
  
  // Create user selection options
  const userOptions = availableUsers.map(user => {
    return `
      <div class="user-option flex items-center p-2 mb-1 hover:bg-gray-100 cursor-pointer" data-user-id="${user._id}" data-user-name="${user.fullName || user.email}">
        <div class="flex-shrink-0">
          <input type="checkbox" class="user-checkbox mr-2 h-5 w-5 rounded border-gray-300">
        </div>
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
          ${user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
        </div>
        <p class="user-name">${user.fullName || user.email}</p>
      </div>
    `;
  }).join('');
  
  // Create custom element for SweetAlert
  const wrapper = document.createElement('div');
  wrapper.className = "member-selection-container";
  wrapper.innerHTML = `
    <div class="mb-3">
      <input type="text" id="search-users-input" class="w-full p-2 mb-2 border rounded" placeholder="Search users...">
    </div>
    <div class="selected-users mb-3" style="display: none;">
      <p class="font-medium mb-1">Selected users:</p>
      <div id="selected-users-list" class="flex flex-wrap gap-1"></div>
    </div>
    <div class="max-h-60 overflow-y-auto border rounded p-1">
      <div id="users-list">
        ${userOptions}
      </div>
    </div>
  `;
  
  // Show SweetAlert with user selection
  swal({
    title: "Add Chat Members",
    content: wrapper,
    buttons: {
      cancel: {
        text: "Cancel",
        value: null,
        visible: true,
        className: "bg-gray-500",
        closeModal: true,
      },
      confirm: {
        text: "Add Selected",
        value: true,
        visible: true,
        className: "bg-primary",
      }
    }
  }).then(async (confirmed) => {
    if (confirmed) {
      // Get all selected user IDs
      const selectedUsers = [];
      document.querySelectorAll('.user-checkbox:checked').forEach(checkbox => {
        const userItem = checkbox.closest('.user-option');
        if (userItem) {
          selectedUsers.push({
            id: userItem.getAttribute('data-user-id'),
            name: userItem.getAttribute('data-user-name')
          });
        }
      });
      
      if (selectedUsers.length === 0) {
        swal("No Users Selected", "Please select at least one user to add", "info");
        return;
      }
      
      // Show loading indicator
      swal({
        text: "Adding members...",
        buttons: false,
        closeOnClickOutside: false,
        closeOnEsc: false
      });
      
      // Add each user one by one
      for (const user of selectedUsers) {
        try {
          await dispatch(AddChatMember(roomId, user.id));
        } catch (error) {
          console.error(`Failed to add user ${user.name}:`, error);
        }
      }
      
      // Show success message
      swal("Success", `Added ${selectedUsers.length} member(s) to the chat`, "success");
    }
  });
  
  // Wait for the SweetAlert to be fully rendered
  setTimeout(() => {
    // Setup search functionality
    const searchInput = document.getElementById('search-users-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();
        document.querySelectorAll('.user-option').forEach(el => {
          const userName = el.querySelector('.user-name').textContent.toLowerCase();
          el.style.display = userName.includes(searchText) ? 'flex' : 'none';
        });
      });
    }
    
    // Make the entire row clickable to toggle checkbox
    document.querySelectorAll('.user-option').forEach(item => {
      item.addEventListener('click', function(e) {
        // Don't toggle if clicking directly on the checkbox
        if (e.target.type !== 'checkbox') {
          const checkbox = this.querySelector('.user-checkbox');
          checkbox.checked = !checkbox.checked;
        }
        
        // Update selected users display
        updateSelectedUsersDisplay();
      });
    });
    
    // Function to update the selected users display
    function updateSelectedUsersDisplay() {
      const selectedUsersContainer = document.querySelector('.selected-users');
      const selectedUsersList = document.getElementById('selected-users-list');
      const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
      
      // Clear the list
      selectedUsersList.innerHTML = '';
      
      if (selectedCheckboxes.length > 0) {
        selectedUsersContainer.style.display = 'block';
        
        // Add each selected user as a pill/tag
        selectedCheckboxes.forEach(checkbox => {
          const userItem = checkbox.closest('.user-option');
          const userName = userItem.getAttribute('data-user-name');
          
          const userTag = document.createElement('span');
          userTag.className = 'bg-primary text-white px-2 py-1 rounded-full text-sm inline-flex items-center';
          userTag.innerHTML = `
            ${userName}
            <button class="ml-1 focus:outline-none" data-user-id="${userItem.getAttribute('data-user-id')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          `;
          
          // Add click handler to remove user
          userTag.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Find and uncheck the corresponding checkbox
            const userId = e.currentTarget.getAttribute('data-user-id');
            const userOption = document.querySelector(`.user-option[data-user-id="${userId}"]`);
            if (userOption) {
              const checkbox = userOption.querySelector('.user-checkbox');
              checkbox.checked = false;
            }
            
            // Update the display
            updateSelectedUsersDisplay();
          });
          
          selectedUsersList.appendChild(userTag);
        });
      } else {
        selectedUsersContainer.style.display = 'none';
      }
    }
  }, 100);
};

// Add a single member to a chat room
export const AddChatMember = (roomId, userId) => async (dispatch) => {
  logAction('AddChatMember', { roomId, userId });
  
  try {
    checkAuthHeaders();
    const res = await axios.post(`/api/rooms/${roomId}/members`, { userId });
    logAction('AddChatMember Success', res.data);
    
    // Handle both backend response formats
    const success = res.data.success !== undefined ? res.data.success : true;
    
    if (success) {
      // Explicitly fetch fresh room data
      dispatch(GetChatRoom(roomId));
      
      // Notify via socket
      chatSocketService.socketClient.emit('chat-member-update', {
        type: 'add-member',
        roomId,
        userId
      });
      
      return res.data.chatRoom || res.data;
    } else {
      throw new Error(res.data.message || 'Failed to add member');
    }
  } catch (err) {
    logAction('AddChatMember Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to add member to chat';
    dispatch(_ChatError(errorMsg));
    throw err; // Rethrow to handle in the caller
  }
};

// Clear chat messages
export const ClearChat = (roomId) => async (dispatch) => {
  logAction('ClearChat', { roomId });
  
  // Confirm before clearing
  const confirmResult = await swal({
    title: "Clear Chat",
    text: "Are you sure you want to clear all messages? This cannot be undone.",
    icon: "warning",
    buttons: ["Cancel", "Clear"],
    dangerMode: true,
  });
  
  if (!confirmResult) return null;
  
  try {
    checkAuthHeaders();
    const res = await axios.delete(`/api/messages/${roomId}/all`);
    logAction('ClearChat Success', res.data);
    
    if (res.data.success) {
      // Clear messages in Redux
      dispatch(_ClearChatMessages(roomId));
      
      // Notify via socket
      chatSocketService.socketClient.emit('silent-refresh', {
        type: 'clear-chat',
        roomId
      });
      
      swal("Success", "Chat messages cleared", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to clear chat messages');
    }
  } catch (err) {
    logAction('ClearChat Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to clear chat messages';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  }
};

// Show chat info in a SweetAlert dialog
export const ShowChatInfo = (roomId) => async (dispatch, getState) => {
  logAction('ShowChatInfo', { roomId });
  
  const { auth, chat } = getState();
  const currentUser = auth.user;
  const currentRoom = chat.currentRoom;
  
  // If we already have the room data
  if (currentRoom && currentRoom._id === roomId) {
    const isCreator = currentRoom.createdBy._id === currentUser.id;
    const isDirectMessage = currentRoom.isDirectMessage;
    
    // Format creation date
    const createdAt = new Date(currentRoom.createdAt).toLocaleDateString();
    
    // Get participant count
    const participantCount = currentRoom.participants?.length || 0;
    
    // Show SweetAlert with chat info
    swal({
      title: isDirectMessage ? "Direct Message" : "Group Chat Info",
      content: {
        element: "div",
        attributes: {
          innerHTML: `
            <div class="text-left">
              <p><strong>Name:</strong> ${isDirectMessage ? "Direct Message" : currentRoom.name}</p>
              <p><strong>Created:</strong> ${createdAt}</p>
              <p><strong>Members:</strong> ${participantCount}</p>
              ${isCreator && !isDirectMessage ? 
                `<button id="edit-chat-btn" class="mt-4 mr-2 px-4 py-2 bg-primary text-white rounded">
                  Edit Name
                </button>
                <button id="delete-chat-btn" class="mt-4 px-4 py-2 bg-danger text-white rounded">
                  Delete Chat
                </button>` : ''}
              ${!isCreator && !isDirectMessage ? 
                `<button id="leave-chat-btn" class="mt-4 px-4 py-2 bg-danger text-white rounded">
                  Leave Chat
                </button>` : ''}
              ${isDirectMessage ? 
                `<button id="clear-chat-btn" class="mt-4 px-4 py-2 bg-danger text-white rounded">
                  Clear Chat
                </button>` : ''}
            </div>
          `
        }
      },
      buttons: {
        close: {
          text: "Close",
          value: null,
          visible: true,
          className: "bg-gray-500",
          closeModal: true,
        }
      }
    });
    
    // Setup event listeners for chat actions
    document.getElementById('edit-chat-btn')?.addEventListener('click', () => {
      swal.close();
      dispatch(ShowEditChatDialog(roomId));
    });
    
    document.getElementById('delete-chat-btn')?.addEventListener('click', () => {
      swal.close();
      dispatch(DeleteChatRoom(roomId));
    });
    
    document.getElementById('leave-chat-btn')?.addEventListener('click', () => {
      swal.close();
      dispatch(LeaveChatRoom(roomId));
    });
    
    document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
      swal.close();
      dispatch(ClearChat(roomId));
    });
  } else {
    // Fetch room data first if we don't have it
    try {
      const roomData = await dispatch(GetChatRoom(roomId));
      if (roomData) {
        dispatch(ShowChatInfo(roomId));
      }
    } catch (err) {
      swal("Error", "Failed to fetch chat information", "error");
    }
  }
};

// Show edit chat dialog
export const ShowEditChatDialog = (roomId) => async (dispatch, getState) => {
  logAction('ShowEditChatDialog', { roomId });
  
  const { chat } = getState();
  const currentRoom = chat.currentRoom;
  
  if (!currentRoom || currentRoom._id !== roomId) {
    await dispatch(GetChatRoom(roomId));
  }
  
  // Show SweetAlert with edit form
  const result = await swal({
    title: "Edit Chat",
    content: {
      element: "input",
      attributes: {
        placeholder: "Enter new chat name",
        type: "text",
        value: currentRoom.name,
        className: "w-full p-2 border rounded"
      }
    },
    buttons: {
      cancel: {
        text: "Cancel",
        value: null,
        visible: true,
        className: "bg-gray-500",
        closeModal: true,
      },
      confirm: {
        text: "Update",
        value: true,
        visible: true,
        className: "bg-primary",
      }
    }
  });
  
  if (result) {
    const newName = document.querySelector('.swal-content input').value.trim();
    
    if (newName && newName !== currentRoom.name) {
      dispatch(UpdateChatRoom(roomId, { name: newName }));
    }
  }
};

// Leave a chat room
export const LeaveChatRoom = (roomId) => async (dispatch, getState) => {
  logAction('LeaveChatRoom', { roomId });
  
  const { auth } = getState();
  const userId = auth.user.id;
  
  // Confirm before leaving
  const confirmResult = await swal({
    title: "Leave Chat",
    text: "Are you sure you want to leave this chat?",
    icon: "warning",
    buttons: ["Cancel", "Leave"],
    dangerMode: true,
  });
  
  if (!confirmResult) return null;
  
  try {
    checkAuthHeaders();
    const res = await axios.delete(`/api/rooms/${roomId}/members/${userId}`);
    logAction('LeaveChatRoom Success', res.data);
    
    if (res.data.success) {
      // Remove room from list
      dispatch(_DeleteChatRoom(roomId));
      
      // Navigate back to chat list
      window.location.href = '/chat';
      
      swal("Success", "You have left the chat", "success");
      return res.data;
    } else {
      throw new Error(res.data.message || 'Failed to leave chat');
    }
  } catch (err) {
    logAction('LeaveChatRoom Error', err);
    
    const errorMsg = err.response?.data?.message || 'Failed to leave chat';
    dispatch(_ChatError(errorMsg));
    swal("Error", errorMsg, "error");
    return null;
  }
};

// Get team messages
export const GetTeamMessages = (teamChatRoomId, page = 1, limit = 50) => async (dispatch) => {
  try {
    const response = await axios.get(`/api/messages/${teamChatRoomId}?page=${page}&limit=${limit}`);
    
    if (response.data.success) {
      dispatch(_GetMessages({
        roomId: teamChatRoomId,
        messages: response.data.messages,
        pagination: {
          currentPage: page,
          totalPages: response.data.totalPages,
          totalMessages: response.data.totalMessages
        }
      }));
      
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching team chat messages:', error);
    // Handle error
  }
};

// Team-specific chat actions
export const GetTeamChatDetails = (teamId) => async (dispatch) => {
  try {
    checkAuthHeaders();
    const response = await axios.get(`/api/teams/${teamId}/chat-details`);
    
    if (response.data.success) {
      // Dispatch actions to update team and chat details
      dispatch(_GetChatRoom(response.data.team.chatRoom));
      
      // If latest messages are returned, populate them
      if (response.data.latestMessages) {
        dispatch(_GetMessages({
          roomId: response.data.team.chatRoom._id,
          messages: response.data.latestMessages,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalMessages: response.data.latestMessages.length
          }
        }));
      }
      
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch team chat details');
    }
  } catch (error) {
    console.error('Error fetching team chat details:', error);
    dispatch(_ChatError(error.response?.data?.message || 'Failed to fetch team chat details'));
    return null;
  }
};

// Send team message
export const SendTeamMessage = (teamChatRoomId, content, attachments = []) => async (dispatch, getState) => {
  try {
    checkAuthHeaders();
    const response = await axios.post('/api/messages/team', {
      chatRoomId: teamChatRoomId,
      content,
      attachments
    });
    
    if (response.data.success) {
      // Dispatch the new message 
      dispatch(_AddMessage(response.data.message));
      
      // Optional: Emit via socket if needed
      chatSocketService.sendSocketMessage({
        ...response.data.message,
        chatRoomId: teamChatRoomId
      });
      
      return response.data.message;
    } else {
      throw new Error(response.data.message || 'Failed to send team message');
    }
  } catch (error) {
    console.error('Error sending team message:', error);
    dispatch(_ChatError(error.response?.data?.message || 'Failed to send team message'));
    swal("Error", "Failed to send message", "error");
    return null;
  }
};