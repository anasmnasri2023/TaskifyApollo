import { createSlice } from '@reduxjs/toolkit';



const initialState = {
  loading: false,
  createChatLoading: false,
  error: null,
  currentRoom: null,
  chatRooms: [],
  messages: {}, // Object mapping roomId -> array of messages
  chatMembers: [], // Array of members for the current chat
  hasMoreMessages: false,
  allUsers: [],
  typingUsers: {},
  currentPage: 1,
  totalPages: 0,
  totalMessages: 0
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    _SetChatLoading: (state, action) => {
      state.loading = action.payload;
    },
    _SetCreateChatLoading: (state, action) => {
      state.createChatLoading = action.payload;
    },
    _ChatError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    _ClearChatError: (state) => {
      state.error = null;
    },
    
    // Chat rooms actions
    _GetChatRooms: (state, action) => {
      state.chatRooms = action.payload;
    },
    _SilentUpdateChatRooms: (state, action) => {
      state.chatRooms = action.payload;
      // No loading state changes
    },
    _GetChatRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    _CreateChatRoom: (state, action) => {
      state.chatRooms = [action.payload, ...state.chatRooms];
      state.currentRoom = action.payload;
    },
    _SetHasMoreMessages: (state, action) => {
      state.hasMoreMessages = action.payload;
    },
    _UpdateChatRoom: (state, action) => {
      const updatedRoom = action.payload;
      state.chatRooms = state.chatRooms.map(room => 
        room._id === updatedRoom._id ? updatedRoom : room
      );
      if (state.currentRoom && state.currentRoom._id === updatedRoom._id) {
        state.currentRoom = updatedRoom;
      }
    },
    _DeleteChatRoom: (state, action) => {
      const roomId = action.payload;
      state.chatRooms = state.chatRooms.filter(room => room._id !== roomId);
      if (state.currentRoom && state.currentRoom._id === roomId) {
        state.currentRoom = null;
      }
      
      // Clean up any messages for this room
      if (state.messages[roomId]) {
        delete state.messages[roomId];
      }
    },
    
    _ClearCurrentRoom: (state) => {
      state.currentRoom = null;
      // Don't clear all messages, as they're now keyed by room ID
      // We can clear other pagination-related state though
      state.currentPage = 1;
      state.totalPages = 0;
      state.totalMessages = 0;
      state.hasMoreMessages = false;
    },
    
    // Messages actions
    _GetMessages: (state, action) => {
      const { roomId, messages, pagination } = action.payload;
      
      // Initialize the messages array for this room if it doesn't exist
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      
      // Check if messages are actually different
      const existingMessages = state.messages[roomId];
      const areMessagesSame = existingMessages.length === messages.length &&
        existingMessages.every((msg, index) => msg._id === messages[index]._id);
      
      if (areMessagesSame) {
        // Don't update if messages are the same
        return;
      }
      
      // For pagination with newest first ordering
      if (pagination.currentPage === 1) {
        // First page - just use the messages as they come
        state.messages[roomId] = messages;
      } else {
        // For subsequent pages (older messages), append them to the existing messages
        state.messages[roomId] = [...state.messages[roomId], ...messages];
      }
      
      state.currentPage = pagination.currentPage;
      state.totalPages = pagination.totalPages;
      state.totalMessages = pagination.totalMessages;
      state.messagesLoading = false;
    },
   // Replace the _AddMessage reducer in chatReducer.js with this code:

_AddMessage: (state, action) => {
  const message = action.payload;
  const roomId = message.chatRoom || message.chatRoomId;
  
  if (!roomId) {
    console.error('Message has no room ID:', message);
    return;
  }
  
  // Make sure we have an array for this room
  if (!state.messages[roomId]) {
    state.messages[roomId] = [];
  }
  
  // Check if message already exists to avoid duplicates
  const messageExists = state.messages[roomId].some(msg => msg._id === message._id);
  
  if (!messageExists) {
    // Add the message to the array (it will be sorted in the UI)
    state.messages[roomId].push(message);
  }
  
  // Also update the last message in chatRooms
  if (state.chatRooms.length > 0) {
    const roomIndex = state.chatRooms.findIndex(room => room._id === roomId);
    if (roomIndex !== -1) {
      state.chatRooms[roomIndex].lastMessage = message;
      
      // Move this room to the top of the list (most recent)
      if (roomIndex > 0) {
        const room = state.chatRooms[roomIndex];
        state.chatRooms.splice(roomIndex, 1);
        state.chatRooms.unshift(room);
      }
    }
  }
},
    _ReplaceMessage: (state, action) => {
      const { tempId, realMessage, chatRoomId } = action.payload;
      
      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = [];
        return;
      }
      
      // Replace the temporary message with the real one
      state.messages[chatRoomId] = state.messages[chatRoomId].map(msg => 
        msg._id === tempId ? realMessage : msg
      );
      
      // Also update the last message in chat rooms list if needed
      if (state.chatRooms && state.chatRooms.length > 0) {
        const roomIndex = state.chatRooms.findIndex(room => room._id === chatRoomId);
        if (roomIndex !== -1 && state.chatRooms[roomIndex].lastMessage?._id === tempId) {
          state.chatRooms[roomIndex].lastMessage = realMessage;
        }
      }
    },
    _RemoveMessage: (state, action) => {
      const { messageId, chatRoomId } = action.payload;
      
      if (state.messages[chatRoomId]) {
        state.messages[chatRoomId] = state.messages[chatRoomId].filter(msg => 
          msg._id !== messageId
        );
      }
      
      // Also update the last message in chat rooms list if needed
      if (state.chatRooms && state.chatRooms.length > 0) {
        const roomIndex = state.chatRooms.findIndex(room => room._id === chatRoomId);
        if (roomIndex !== -1 && state.chatRooms[roomIndex].lastMessage?._id === messageId) {
          // Find the new last message
          const newLastMessage = state.messages[chatRoomId]?.length > 0 
            ? state.messages[chatRoomId][state.messages[chatRoomId].length - 1] 
            : null;
          
          state.chatRooms[roomIndex].lastMessage = newLastMessage;
        }
      }
    },
    _MarkMessagesRead: (state, action) => {
      const { roomId, userId, timestamp } = action.payload;
      
      // Update messages in the current room
      if (state.messages[roomId]) {
        state.messages[roomId].forEach(message => {
          // Skip if message is already read by this user
          if (!message.readBy.some(read => {
            return (typeof read === 'object' && read.user === userId) || 
                   (typeof read === 'string' && read === userId);
          })) {
            message.readBy.push({
              user: userId,
              readAt: timestamp || new Date().toISOString()
            });
          }
        });
      }
      
      // Also update unread count in chat rooms list
      if (state.chatRooms && state.chatRooms.length > 0) {
        const roomIndex = state.chatRooms.findIndex(room => room._id === roomId);
        if (roomIndex !== -1) {
          if (typeof state.chatRooms[roomIndex].unreadCount === 'object') {
            state.chatRooms[roomIndex].unreadCount[userId] = 0;
          } else {
            state.chatRooms[roomIndex].unreadCount = 0;
          }
        }
      }
    },
    _DeleteMessage: (state, action) => {
      const { roomId, messageId } = action.payload;
      
      if (state.messages[roomId]) {
        state.messages[roomId] = state.messages[roomId].filter(msg => msg._id !== messageId);
      }
      
      // Update lastMessage in chatRooms if needed
      if (state.chatRooms.length > 0) {
        const roomIndex = state.chatRooms.findIndex(room => room._id === roomId);
        if (roomIndex !== -1 && state.chatRooms[roomIndex].lastMessage?._id === messageId) {
          // Set lastMessage to the new last message or null
          if (state.messages[roomId] && state.messages[roomId].length > 0) {
            state.chatRooms[roomIndex].lastMessage = state.messages[roomId][state.messages[roomId].length - 1];
          } else {
            state.chatRooms[roomIndex].lastMessage = null;
          }
        }
      }
    },
    
    // Users actions
    _GetAllUsers: (state, action) => {
      state.allUsers = action.payload;
    },
    
    // Typing indicators
    _UpdateTypingStatus: (state, action) => {
      const { userId, fullName, isTyping, chatRoomId } = action.payload;
      
      // Initialize if not exists
      if (!state.typingUsers[chatRoomId]) {
        state.typingUsers[chatRoomId] = {};
      }
      
      // Update typing status
      if (isTyping) {
        state.typingUsers[chatRoomId][userId] = fullName || 'Someone';
      } else {
        // Remove user from typing list
        if (state.typingUsers[chatRoomId][userId]) {
          delete state.typingUsers[chatRoomId][userId];
        }
      }
    },
    _ClearTypingStatus: (state, action) => {
      const roomId = action.payload;
      if (roomId) {
        state.typingUsers[roomId] = {};
      } else {
        state.typingUsers = {};
      }
    },
    SetChatMembers: (state, action) => {
      state.chatMembers = action.payload;
    },
    
    _RemoveChatMember: (state, action) => {
      const memberId = action.payload;
      
      // Update chatMembers array
      state.chatMembers = state.chatMembers.filter(
        member => member._id !== memberId
      );
      
      // Also update the currentRoom's participants
      if (state.currentRoom && state.currentRoom.participants) {
        state.currentRoom.participants = state.currentRoom.participants.filter(
          member => member._id !== memberId
        );
      }
    },
    
    _AddChatMember: (state, action) => {
      const newMember = action.payload;
      
      // Add to chatMembers if not already there
      if (!state.chatMembers.some(member => member._id === newMember._id)) {
        state.chatMembers.push(newMember);
      }
      
      // Also add to currentRoom's participants if not already there
      if (state.currentRoom && state.currentRoom.participants) {
        if (!state.currentRoom.participants.some(member => member._id === newMember._id)) {
          state.currentRoom.participants.push(newMember);
        }
      }
    },
    
    _ClearChatMessages: (state, action) => {
      const roomId = action.payload;
      
      // Clear messages for this room
      if (state.messages && state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      
      // Also update the lastMessage in the chat rooms list
      if (state.chatRooms && state.chatRooms.length > 0) {
        const roomIndex = state.chatRooms.findIndex(room => room._id === roomId);
        if (roomIndex !== -1) {
          state.chatRooms[roomIndex].lastMessage = null;
        }
      }
      
      // Clear lastMessage in current room if applicable
      if (state.currentRoom && state.currentRoom._id === roomId) {
        state.currentRoom.lastMessage = null;
      }
    }
  }
});

// Export the actions
export const {
  _SetChatLoading,
  _SetCreateChatLoading,
  _ChatError,
  _ClearChatError,
  _GetChatRooms,
  _SilentUpdateChatRooms,
  _GetChatRoom,
  _CreateChatRoom,
  _UpdateChatRoom,
  _DeleteChatRoom,
  _GetMessages,
  _SetHasMoreMessages,
  _AddMessage,
  _MarkMessagesRead,
  _DeleteMessage,
  _ClearCurrentRoom,
  _GetAllUsers,
  _UpdateTypingStatus,
  _ClearTypingStatus,
  _ReplaceMessage,
  _RemoveMessage,
  _SetChatMembers,
  _RemoveChatMember,
  _AddChatMember,
  _ClearChatMessages
} = chatSlice.actions;

// Export the reducer as default
export default chatSlice.reducer;