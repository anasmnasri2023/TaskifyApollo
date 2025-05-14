const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/users'); // Make sure this path is correct for your project

// Create a new chat room
const createChatRoom = async (req, res) => {
  try {
    const { name, description, project, participants, isPrivate, isDirectMessage } = req.body;
    
    // For direct messages, check if there's already a chat between these users
    if (isDirectMessage && participants.length === 1) {
      const otherUserId = participants[0];
      
      // Check for existing direct message room
      const existingRoom = await ChatRoom.findOne({
        isDirectMessage: true,
        participants: { 
          $all: [req.user.id, otherUserId],
          $size: 2 
        }
      });
      
      if (existingRoom) {
        // Return existing chat room
        const chatRoom = await ChatRoom.findById(existingRoom._id)
          .populate('createdBy', 'fullName email')
          .populate('participants', 'fullName email');
        
        return res.status(200).json({
          success: true,
          chatRoom,
          message: 'Existing chat found'
        });
      }
    }
    
    // For direct messages, use a special naming convention
    let roomName = name;
    if (isDirectMessage && participants.length === 1) {
      const otherUser = await User.findById(participants[0])
        .select('fullName email');
      
      roomName = otherUser?.fullName || otherUser?.email || name;
    }
    
    // Create new chat room
    const newChatRoom = new ChatRoom({
      name: roomName,
      description,
      project,
      participants: [...participants, req.user.id], // Add current user to participants
      createdBy: req.user.id,
      isPrivate: isPrivate || false,
      isDirectMessage: isDirectMessage || false
    });
    
    await newChatRoom.save();
    
    // Populate creator details
    const chatRoom = await ChatRoom.findById(newChatRoom._id)
      .populate('createdBy', 'fullName email')
      .populate('participants', 'fullName email');
    
    res.status(201).json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Could not create chat room',
      error: error.message
    });
  }
};

// Get all chat rooms where user is a participant
const getChatRooms = async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      participants: { $in: [req.user.id] }
    })
      .populate('createdBy', 'fullName email')
      .populate('participants', 'fullName email')
      .populate('project', 'name')
      .sort({ updatedAt: -1 });
    
    // Get the last message for each chat room
    const roomsWithLastMessage = await Promise.all(
      chatRooms.map(async (room) => {
        const lastMessage = await ChatMessage.findOne({ chatRoom: room._id })
          .populate('sender', 'fullName email')
          .sort({ createdAt: -1 })
          .limit(1);
        
        // Get unread message count for current user
        const unreadCount = await ChatMessage.countDocuments({
          chatRoom: room._id,
          'readBy.user': { $ne: req.user.id },
          sender: { $ne: req.user.id } // Don't count user's own messages
        });
        
        return {
          ...room.toObject(),
          lastMessage: lastMessage || null,
          unreadCount: { [req.user.id]: unreadCount }
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: roomsWithLastMessage.length,
      chatRooms: roomsWithLastMessage
    });
  } catch (error) {
    console.error('Error getting chat rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve chat rooms',
      error: error.message
    });
  }
};

// Get chat room by ID
const getChatRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find chat room and populate related fields
    const chatRoom = await ChatRoom.findById(roomId)
      .populate('createdBy', 'fullName email')
      .populate('participants', 'fullName email')
      .populate('project', 'name');
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    res.status(200).json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error('Error getting chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve chat room',
      error: error.message
    });
  }
};

// Update chat room
const updateChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, participants, isPrivate } = req.body;
    
    // Find chat room
    const chatRoom = await ChatRoom.findById(roomId);
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is the creator or has admin rights
    if (chatRoom.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this chat room'
      });
    }
    
    // Update fields
    chatRoom.name = name || chatRoom.name;
    chatRoom.description = description || chatRoom.description;
    chatRoom.isPrivate = isPrivate !== undefined ? isPrivate : chatRoom.isPrivate;
    
    // Update participants if provided
    if (participants && Array.isArray(participants)) {
      // Make sure creator is still a participant
      if (!participants.includes(req.user.id)) {
        participants.push(req.user.id);
      }
      
      chatRoom.participants = participants;
    }
    
    chatRoom.updatedAt = Date.now();
    
    await chatRoom.save();
    
    // Return updated chat room with populated fields
    const updatedRoom = await ChatRoom.findById(roomId)
      .populate('createdBy', 'fullName email')
      .populate('participants', 'fullName email')
      .populate('project', 'name');
    
    res.status(200).json({
      success: true,
      chatRoom: updatedRoom
    });
  } catch (error) {
    console.error('Error updating chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Could not update chat room',
      error: error.message
    });
  }
};

// Delete chat room
const deleteChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find chat room
    const chatRoom = await ChatRoom.findById(roomId);
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is the creator or has admin rights
    if (chatRoom.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this chat room'
      });
    }
    
    // Delete all messages in the chat room
    await ChatMessage.deleteMany({ chatRoom: roomId });
    
    // Delete the chat room
    await ChatRoom.findByIdAndDelete(roomId);
    
    res.status(200).json({
      success: true,
      message: 'Chat room and all messages deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Could not delete chat room',
      error: error.message
    });
  }
};

// Get chat members
const getChatMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find the chat room
    const chatRoom = await ChatRoom.findById(roomId)
      .populate('participants', 'fullName email');
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    res.status(200).json({
      success: true,
      members: chatRoom.participants,
      createdBy: chatRoom.createdBy
    });
  } catch (error) {
    console.error('Error getting chat members:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve chat members',
      error: error.message
    });
  }
};

// Add member to chat room
const addChatMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Find the chat room
    const chatRoom = await ChatRoom.findById(roomId);
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is the creator
    if (chatRoom.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the chat creator can add members'
      });
    }
    
    // Check if direct message chat
    if (chatRoom.isDirectMessage) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add members to direct message chats'
      });
    }
    
    // Check if user exists
    const userToAdd = await User.findById(userId);
    
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is already a participant
    if (chatRoom.participants.some(p => p.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this chat'
      });
    }
    
    // Add user to participants
    chatRoom.participants.push(userId);
    await chatRoom.save();
    
    // Return updated chat room with populated fields
    const updatedRoom = await ChatRoom.findById(roomId)
      .populate('createdBy', 'fullName email')
      .populate('participants', 'fullName email')
      .populate('project', 'name');
    
    // Emit socket event if socket.io is integrated
    if (req.io) {
      req.io.to(roomId).emit('chat-member-update', {
        roomId,
        action: 'add',
        userId
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      chatRoom: updatedRoom
    });
  } catch (error) {
    console.error('Error adding chat member:', error);
    res.status(500).json({
      success: false,
      message: 'Could not add member to chat',
      error: error.message
    });
  }
};

// Remove member from chat room
const removeChatMember = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;
    
    // Find the chat room
    const chatRoom = await ChatRoom.findById(roomId);
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if direct message chat
    if (chatRoom.isDirectMessage) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove members from direct message chats'
      });
    }
    
    // Check permissions: creator can remove anyone, users can remove themselves
    const isCreator = chatRoom.createdBy.toString() === req.user.id;
    const isRemovingSelf = memberId === req.user.id;
    
    if (!isCreator && !isRemovingSelf) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove yourself or members if you are the creator'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.some(p => p.toString() === memberId)) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this chat'
      });
    }
    
    // Remove user from participants
    chatRoom.participants = chatRoom.participants.filter(
      p => p.toString() !== memberId
    );
    
    // If creator is leaving, assign a new creator
    if (isRemovingSelf && isCreator && chatRoom.participants.length > 0) {
      chatRoom.createdBy = chatRoom.participants[0];
    }
    
    // If no participants left, delete the chat room
    if (chatRoom.participants.length === 0) {
      await ChatMessage.deleteMany({ chatRoom: roomId });
      await ChatRoom.findByIdAndDelete(roomId);
      
      // Emit socket event if socket.io is integrated
      if (req.io) {
        req.io.emit('silent-refresh', {
          type: 'delete-chat-room',
          roomId
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Chat room deleted as there are no more participants'
      });
    }
    
    await chatRoom.save();
    
    // Emit socket event if socket.io is integrated
    if (req.io) {
      req.io.to(roomId).emit('chat-member-update', {
        roomId,
        action: 'remove',
        userId: memberId
      });
    }
    
    // Return successful response
    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing chat member:', error);
    res.status(500).json({
      success: false,
      message: 'Could not remove member from chat',
      error: error.message
    });
  }
};

// Clear all messages in a chat room
const clearChatMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    
    // Find the chat room
    const chatRoom = await ChatRoom.findById(chatRoomId);
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    // For group chats, only creator can clear messages
    if (!chatRoom.isDirectMessage && chatRoom.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the chat creator can clear all messages'
      });
    }
    
    // Delete all messages in this chat room
    await ChatMessage.deleteMany({ chatRoom: chatRoomId });
    
    // Update lastMessage field
    chatRoom.lastMessage = null;
    await chatRoom.save();
    
    // Emit socket event if socket.io is integrated
    if (req.io) {
      req.io.to(chatRoomId).emit('chat-cleared', {
        roomId: chatRoomId
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'All messages cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Could not clear chat messages',
      error: error.message
    });
  }
};

module.exports = {
  createChatRoom,
  getChatRooms,
  getChatRoomById,
  updateChatRoom,
  deleteChatRoom,
  getChatMembers,
  addChatMember,
  removeChatMember,
  clearChatMessages
};