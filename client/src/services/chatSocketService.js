import { io } from 'socket.io-client';
import { store } from '../redux/store';
import { 
  AddMessage, 
  SilentUpdateChatRooms, 
  SilentMarkMessagesRead,
  UpdateTypingStatus
} from '../redux/actions/chatActions';

// Global flag to track initialization
let globalInitialized = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Cooldown tracking
let lastFetchTime = 0;
let isFetchingRooms = false;
const FETCH_COOLDOWN = 5000; // 5 seconds cooldown
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 5000; // 5 seconds

// Debounce trackers
let typingTimeout;
const TYPING_DEBOUNCE = 1000;
let markReadTimeout;
const MARK_READ_DEBOUNCE = 2000;

// Create socket client instance
export const socketClient = io("/", {
  autoConnect: false,
  withCredentials: true,
  reconnection: false, // We'll handle reconnection manually
  timeout: 10000
});

// Check if token is valid (not expired)
const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Decode JWT without verification to check expiration
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    
    // Check if token is expired
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime >= expirationTime) {
        console.log('Token is expired');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

// Handle logout and cleanup
const handleLogout = () => {
  console.log('Handling logout due to invalid token');
  
  // Disconnect socket immediately
  if (socketClient.connected) {
    socketClient.disconnect();
  }
  
  // Clear all listeners
  socketClient.removeAllListeners();
  
  // Reset flags
  globalInitialized = false;
  reconnectAttempts = 0;
  
  // Clear local storage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Redirect to login after a short delay
  setTimeout(() => {
    window.location.href = '/login';
  }, 100);
};

// Set auth token for socket
export const setSocketAuth = () => {
  const token = localStorage.getItem('token');
  
  // Check if token exists and is valid
  if (token && isTokenValid()) {
    console.log('Setting valid socket auth token');
    socketClient.auth = { token };
    return true;
  }
  
  console.warn('No valid token found for socket authentication');
  
  // If token exists but is expired, handle logout
  if (token && !isTokenValid()) {
    handleLogout();
  }
  
  return false;
};

// Silently fetch chat rooms without triggering loading state
const silentFetchChatRooms = () => {
  const now = Date.now();
  
  // Check cooldown period
  if (now - lastFetchTime < FETCH_COOLDOWN) {
    console.log('Fetch cooldown in effect, skipping...');
    return;
  }
  
  // Prevent multiple simultaneous fetches
  if (isFetchingRooms) {
    console.log('Already fetching rooms, skipping...');
    return;
  }
  
  const token = localStorage.getItem('token');
  
  // Check if token is valid before fetching
  if (!token || !isTokenValid()) {
    console.log('Invalid token, skipping fetch');
    return;
  }
  
  isFetchingRooms = true;
  lastFetchTime = now;
  
  fetch('/api/rooms', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      // Check if response indicates authentication error
      if (response.status === 401) {
        throw new Error('Authentication failed');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.chatRooms) {
        store.dispatch(SilentUpdateChatRooms(data.chatRooms));
      }
    })
    .catch(err => {
      console.error('Silent fetch chat rooms failed:', err);
      
      // If authentication failed, handle logout
      if (err.message === 'Authentication failed') {
        handleLogout();
      }
    })
    .finally(() => {
      isFetchingRooms = false;
    });
};

// Initialize chat socket
export const initializeChatSocket = () => {
  // Prevent multiple initializations
  if (globalInitialized) {
    console.log('Socket already initialized globally, returning existing instance');
    return socketClient;
  }
  
  console.log('Initializing chat socket...');
  
  // Check if token is valid before initializing
  if (!isTokenValid()) {
    console.error('Cannot initialize socket with invalid token');
    handleLogout();
    return null;
  }
  
  // Set auth token
  const hasToken = setSocketAuth();
  if (!hasToken) {
    console.error('Cannot initialize socket without valid authentication token');
    return null;
  }
  
  // Clean up any existing listeners first
  socketClient.removeAllListeners();
  
  // Connect if not already connected
  if (!socketClient.connected) {
    socketClient.connect();
  }

  // Set up connection events
  socketClient.on('connect', () => {
    console.log('Socket connected successfully with ID:', socketClient.id);
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    
    // Emit connected event to server with user ID
    const user = store.getState().auth.user;
    if (user && user.id) {
      socketClient.emit('connected_client', user.id);
    }
    
    // Fetch updated chat rooms only on first connection
    if (!globalInitialized) {
      silentFetchChatRooms();
    }
  });
  
  socketClient.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    
    // Check if error is due to authentication
    if (error.message.includes('jwt expired') || 
        error.message.includes('jwt malformed') || 
        error.message.includes('Authentication failed')) {
      handleLogout();
      return;
    }
    
    // For other errors, attempt limited reconnection
    reconnectAttempts++;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      setTimeout(() => {
        if (isTokenValid()) {
          setSocketAuth();
          socketClient.connect();
        } else {
          handleLogout();
        }
      }, 2000 * reconnectAttempts); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
      handleLogout();
    }
  });

  // Handle new messages
  socketClient.on('new-message', (message) => {
    console.log('New message received via socket:', message);
    
    if (!message || !message.chatRoom) {
      console.error('Invalid message received:', message);
      return;
    }
    
    // Dispatch to Redux store
    store.dispatch(AddMessage(message));
  });

  // Handle team messages
  socketClient.on('team-message', (message) => {
    console.log('New team message received via socket:', message);
    
    if (!message || !message.chatRoom) {
      console.error('Invalid team message received:', message);
      return;
    }
    
    // Dispatch to Redux store
    store.dispatch(AddMessage(message));
  });

  // Handle typing indicators
  socketClient.on('user-typing', (data) => {
    console.log('User typing:', data);
    store.dispatch(UpdateTypingStatus(data));
  });

  // Handle team typing indicators
  socketClient.on('team-typing', (data) => {
    console.log('Team user typing:', data);
    store.dispatch(UpdateTypingStatus(data));
  });

  // Handle read status updates
  socketClient.on('messages-read', (data) => {
    console.log('Messages read event received:', data);
    store.dispatch(SilentMarkMessagesRead({
      roomId: data.chatRoomId,
      userId: data.userId,
      timestamp: data.timestamp
    }));
  });
  
  // Handle silent refresh with better cooldown management
  socketClient.on('silent-refresh', (data) => {
    console.log('Silent refresh event:', data);
    
    const now = Date.now();
    
    // Check cooldown period
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
      console.log('Refresh cooldown in effect, skipping...');
      return;
    }
    
    lastRefreshTime = now;
    
    // Only fetch rooms for room-level changes
    switch(data.type) {
      case 'new-chat-room':
      case 'delete-chat-room':
      case 'update-chat-room':
        // Add a flag to prevent recursive refreshes
        if (!window.isRefreshing) {
          window.isRefreshing = true;
          silentFetchChatRooms();
          
          // Reset flag after fetch completes
          setTimeout(() => {
            window.isRefreshing = false;
          }, 3000);
        }
        break;
      case 'mark-read':
      case 'messages-read':
      case 'clear-chat':
      case 'delete-message':
        // Explicitly ignore these events to prevent loops
        console.log('Ignoring refresh type to prevent loops:', data.type);
        break;
      default:
        console.log('Ignoring unknown refresh type:', data.type);
    }
  });
  
  socketClient.on('disconnect', (reason) => {
    console.log('Socket disconnected. Reason:', reason);
    
    // Handle authentication disconnections
    if (reason === 'io server disconnect' || reason === 'transport error') {
      if (!isTokenValid()) {
        handleLogout();
        return;
      }
      
      // For valid tokens, attempt limited reconnection
      reconnectAttempts++;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        setTimeout(() => {
          if (isTokenValid()) {
            setSocketAuth();
            socketClient.connect();
          } else {
            handleLogout();
          }
        }, 2000 * reconnectAttempts);
      } else {
        console.error('Max reconnection attempts reached');
        handleLogout();
      }
    }
  });

  // Mark as initialized globally
  globalInitialized = true;
  
  return socketClient;
};

// Ensure token is valid before any socket operation
const ensureValidToken = () => {
  if (!isTokenValid()) {
    handleLogout();
    return false;
  }
  return true;
};

// Join a chat room
export const joinChatRoom = (roomId) => {
  if (!ensureValidToken()) return;
  
  console.log(`Attempting to join chat room: ${roomId}`);
  
  if (!socketClient.connected) {
    console.log('Socket not connected, connecting now...');
    if (setSocketAuth()) {
      socketClient.connect();
      
      // Wait for connection before joining
      socketClient.once('connect', () => {
        socketClient.emit('join-room', roomId);
      });
    }
  } else {
    socketClient.emit('join-room', roomId);
  }
};

// Leave a chat room
export const leaveChatRoom = (roomId) => {
  if (socketClient.connected) {
    console.log(`Leaving chat room: ${roomId}`);
    socketClient.emit('leave-room', roomId);
  }
};

// Join a team chat room
export const joinTeamChatRoom = (teamId, roomId) => {
  if (!ensureValidToken()) return;
  
  console.log(`Attempting to join team chat room: ${roomId} for team: ${teamId}`);
  
  if (!socketClient.connected) {
    console.log('Socket not connected, connecting now...');
    if (setSocketAuth()) {
      socketClient.connect();
      
      // Wait for connection before joining
      socketClient.once('connect', () => {
        socketClient.emit('join-team-room', { teamId, roomId });
      });
    }
  } else {
    socketClient.emit('join-team-room', { teamId, roomId });
  }
};

// Leave a team chat room
export const leaveTeamChatRoom = (teamId, roomId) => {
  if (socketClient.connected) {
    console.log(`Leaving team chat room: ${roomId} for team: ${teamId}`);
    socketClient.emit('leave-team-room', { teamId, roomId });
  }
};

// Set typing status with user's full name
export const setTypingStatus = (chatRoomId, isTyping) => {
  if (!ensureValidToken()) return;
  
  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Debounce typing status
  typingTimeout = setTimeout(() => {
    if (!socketClient.connected) {
      if (setSocketAuth()) {
        socketClient.connect();
        socketClient.once('connect', () => {
          emitTypingStatus(chatRoomId, isTyping);
        });
      }
    } else {
      emitTypingStatus(chatRoomId, isTyping);
    }
  }, TYPING_DEBOUNCE);
};

// Helper to emit typing status with user info
const emitTypingStatus = (chatRoomId, isTyping) => {
  const user = store.getState().auth.user;
  const fullName = user ? (user.fullName || user.email) : '';
  
  console.log(`Setting typing status for room ${chatRoomId}: ${isTyping}`);
  socketClient.emit('typing', { 
    chatRoomId, 
    isTyping,
    fullName,
    userId: user ? user.id : ''
  });
};

// Set team typing status
export const setTeamTypingStatus = (teamId, chatRoomId, isTyping) => {
  if (!ensureValidToken()) return;
  
  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Debounce typing status
  typingTimeout = setTimeout(() => {
    if (!socketClient.connected) {
      if (setSocketAuth()) {
        socketClient.connect();
        socketClient.once('connect', () => {
          emitTeamTypingStatus(teamId, chatRoomId, isTyping);
        });
      }
    } else {
      emitTeamTypingStatus(teamId, chatRoomId, isTyping);
    }
  }, TYPING_DEBOUNCE);
};

// Helper to emit team typing status with user info
const emitTeamTypingStatus = (teamId, chatRoomId, isTyping) => {
  const user = store.getState().auth.user;
  const fullName = user ? (user.fullName || user.email) : '';
  
  console.log(`Setting team typing status for team ${teamId}, room ${chatRoomId}: ${isTyping}`);
  socketClient.emit('team-typing', { 
    teamId,
    chatRoomId, 
    isTyping,
    fullName,
    userId: user ? user.id : ''
  });
};

// Send a message through socket
export const sendSocketMessage = (messageData) => {
  if (!ensureValidToken()) return;
  
  console.log('Sending message via socket:', messageData);
  
  if (!socketClient.connected) {
    console.log('Socket not connected, connecting now...');
    if (setSocketAuth()) {
      socketClient.connect();
      socketClient.once('connect', () => {
        socketClient.emit('send-message', messageData);
      });
    }
  } else {
    socketClient.emit('send-message', messageData);
  }
};

// Send a team message through socket
export const sendTeamSocketMessage = (messageData) => {
  if (!ensureValidToken()) return;
  
  console.log('Sending team message via socket:', messageData);
  
  if (!socketClient.connected) {
    console.log('Socket not connected, connecting now...');
    if (setSocketAuth()) {
      socketClient.connect();
      socketClient.once('connect', () => {
        socketClient.emit('send-team-message', messageData);
      });
    }
  } else {
    socketClient.emit('send-team-message', messageData);
  }
};

// Mark messages as read via socket with debouncing
export const markMessagesReadSocket = (chatRoomId) => {
  if (!ensureValidToken()) return;
  
  // Clear previous timeout
  if (markReadTimeout) {
    clearTimeout(markReadTimeout);
  }
  
  // Debounce mark read
  markReadTimeout = setTimeout(() => {
    console.log(`Marking messages as read in room: ${chatRoomId}`);
    
    if (!socketClient.connected) {
      console.log('Socket not connected, connecting now...');
      if (setSocketAuth()) {
        socketClient.connect();
        socketClient.once('connect', () => {
          socketClient.emit('mark-read', { 
            chatRoomId,
            timestamp: new Date().toISOString()
          });
        });
      }
    } else {
      socketClient.emit('mark-read', { 
        chatRoomId,
        timestamp: new Date().toISOString()
      });
    }
  }, MARK_READ_DEBOUNCE);
};

// Update socket auth token
export const updateSocketAuth = (token) => {
  console.log('Updating socket authentication token');
  socketClient.auth = { token };
  
  // Reconnect with new token if already connected
  if (socketClient.connected) {
    socketClient.disconnect();
    if (isTokenValid()) {
      socketClient.connect();
    }
  }
};

// Notify about new chat room creation
export const notifyNewChatRoom = (roomData) => {
  if (!ensureValidToken()) return;
  
  if (!socketClient.connected) {
    if (setSocketAuth()) {
      socketClient.connect();
      socketClient.once('connect', () => {
        socketClient.emit('silent-refresh', {
          type: 'new-chat-room',
          room: roomData
        });
      });
    }
  } else {
    socketClient.emit('silent-refresh', {
      type: 'new-chat-room',
      room: roomData
    });
  }
};

// Default export with all methods
const chatSocketService = {
  socketClient,
  initializeChatSocket,
  joinChatRoom,
  leaveChatRoom,
  joinTeamChatRoom,
  leaveTeamChatRoom,
  sendSocketMessage,
  sendTeamSocketMessage,
  setTypingStatus,
  setTeamTypingStatus,
  markMessagesReadSocket,
  updateSocketAuth,
  notifyNewChatRoom
};

export default chatSocketService;