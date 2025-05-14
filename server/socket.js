const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

let io;
const clients = [];

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }
      
      // Use PRIVATE_KEY instead of JWT_SECRET
      const PRIVATE_KEY = process.env.PRIVATE_KEY;
      
      if (!PRIVATE_KEY) {
        console.error("SERVER ERROR: PRIVATE_KEY is not defined in environment variables");
        return next(new Error('Server configuration error'));
      }
      
      // Verify JWT token with the PRIVATE_KEY
      const decoded = jwt.verify(token, PRIVATE_KEY);
      
      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Attach user ID to socket
      socket.userId = decoded.id;
      console.log(`User authenticated via socket: ${decoded.id}`);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Store user connection
    clients.push({
      userId: socket.userId,
      socketId: socket.id,
      connected: true
    });
    
    // Join a room for personal notifications
    socket.join(socket.userId);
    
    // Broadcast user online status
    io.emit('user-status-change', {
      userId: socket.userId,
      status: 'online'
    });
    
    // Handle custom events
    socket.on('connected_client', (userId) => {
      console.log(`User ${userId} connected to socket`);
      // Optional: Notify friends/contacts that user is online
    });
    
    // Chat room events
    socket.on('join-room', (roomId) => {
      console.log(`User ${socket.userId} joined room ${roomId}`);
      socket.join(roomId);
      
      // Optional: Notify room that user joined
      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        roomId
      });
    });
    
    socket.on('leave-room', (roomId) => {
      console.log(`User ${socket.userId} left room ${roomId}`);
      socket.leave(roomId);
      
      // Optional: Notify room that user left
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        roomId
      });
    });
    
    socket.on('send-message', (data) => {
      console.log(`Message sent in room ${data.chatRoomId} by user ${socket.userId}`);
      
      if (!data.chatRoomId) {
        console.error('Missing chatRoomId in send-message event');
        return;
      }
      
      // Broadcast to everyone in the room (including sender)
      io.to(data.chatRoomId).emit('new-message', data);
      
      // Also broadcast a silent refresh event for chat list updates
      io.emit('silent-refresh', {
        type: 'new-message',
        roomId: data.chatRoomId,
        message: data
      });
      
      console.log(`Message broadcast to room ${data.chatRoomId}`);
    });
    
    socket.on('typing', (data) => {
      console.log(`User typing in room ${data.chatRoomId}: ${data.isTyping}`);
      
      // Add full user data to typing event
      const typingData = {
        userId: socket.userId, 
        fullName: data.fullName || '',
        isTyping: data.isTyping,
        chatRoomId: data.chatRoomId
      };
      
      // Broadcast to others in the room
      socket.to(data.chatRoomId).emit('user-typing', typingData);
    });
    
    socket.on('mark-read', (data) => {
      console.log(`User ${socket.userId} marked messages as read in room ${data.chatRoomId}`);
      
      // Broadcast the read status to all users in the room
      io.to(data.chatRoomId).emit('messages-read', {
        chatRoomId: data.chatRoomId,
        userId: socket.userId,
        timestamp: data.timestamp || new Date().toISOString()
      });
      
      // Also broadcast a silent refresh event for chat list updates
      io.emit('silent-refresh', {
        type: 'messages-read',
        roomId: data.chatRoomId,
        userId: socket.userId
      });
      
      console.log(`Read status broadcast to room ${data.chatRoomId}`);
    });
    
    // Handle silent refresh events (for any data updates)
    socket.on('silent-refresh', (data) => {
      console.log(`Silent refresh event: ${data.type}`);
      
      // Broadcast to all connected clients
      io.emit('silent-refresh', data);
    });
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Update status in clients array
      const clientIndex = clients.findIndex(client => client.socketId === socket.id);
      if (clientIndex !== -1) {
        clients[clientIndex].connected = false;
        
        // Check if user has other active connections
        const hasOtherConnections = clients.some(client => 
          client.userId === socket.userId && client.connected && client.socketId !== socket.id
        );
        
        // If no other connections, broadcast offline status
        if (!hasOtherConnections) {
          io.emit('user-status-change', {
            userId: socket.userId,
            status: 'offline'
          });
        }
        
        // Remove from clients array
        clients.splice(clientIndex, 1);
      }
    });
  });

  return io;
};

// Get active user sockets
const getUserSockets = (userId) => {
  return clients
    .filter(client => client.userId === userId && client.connected)
    .map(client => client.socketId);
};

// Check if user is online
const isUserOnline = (userId) => {
  return clients.some(client => client.userId === userId && client.connected);
};

// Send to specific user
const sendToUser = (userId, event, data) => {
  const userSockets = getUserSockets(userId);
  userSockets.forEach(socketId => {
    io.to(socketId).emit(event, data);
  });
};

// Send to all users in a room except the sender
const sendToRoomExceptSender = (roomId, senderId, event, data) => {
  io.to(roomId).except(getUserSockets(senderId)).emit(event, data);
};

module.exports = {
  initializeSocket,
  getIO: () => io,
  clients,
  methods: {
    getUserSockets,
    isUserOnline,
    sendToUser,
    sendToRoomExceptSender
  }
};