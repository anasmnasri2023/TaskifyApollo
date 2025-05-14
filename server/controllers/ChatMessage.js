// controllers/ChatMessage.js
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');

// Send a message to a chat room
const sendMessage = async (req, res) => {
  try {
    const { chatRoomId, content, attachments } = req.body;
    
    // Check if chat room exists
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    // Create new message
    const newMessage = new ChatMessage({
      chatRoom: chatRoomId,
      sender: req.user.id,
      content,
      attachments: attachments || [],
      readBy: [{ user: req.user.id }] // Mark as read by sender
    });
    
    await newMessage.save();
    
    // Update chat room's updatedAt timestamp
    chatRoom.updatedAt = Date.now();
    await chatRoom.save();
    
    // Populate sender details
    const message = await ChatMessage.findById(newMessage._id)
      .populate('sender', 'fullName email')
      .populate('readBy.user', 'fullName email');
    
    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Could not send message',
      error: error.message
    });
  }
};

// Get all messages in a chat room
const getMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Check if chat room exists
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    // Get messages with pagination (newest first)
    const messages = await ChatMessage.find({ chatRoom: chatRoomId })
      .populate('sender', 'fullName email')
      .populate('readBy.user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Get total count
    const totalMessages = await ChatMessage.countDocuments({ chatRoom: chatRoomId });
    
    res.status(200).json({
      success: true,
      count: messages.length,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: parseInt(page),
      messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve messages',
      error: error.message
    });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    
    // Check if chat room exists
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    // Find all unread messages by this user
    const unreadMessages = await ChatMessage.find({
      chatRoom: chatRoomId,
      'readBy.user': { $ne: req.user.id }
    });
    
    // Update each message to mark as read
    const updatePromises = unreadMessages.map(message => {
      message.readBy.push({ user: req.user.id });
      return message.save();
    });
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: `Marked ${unreadMessages.length} messages as read`
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Could not mark messages as read',
      error: error.message
    });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Find the message
    const message = await ChatMessage.findById(messageId);
    
    // Check if message exists
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }
    
    // Delete the message
    await ChatMessage.findByIdAndDelete(messageId);
    
    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Could not delete message',
      error: error.message
    });
  }
};

// In controllers/ChatMessage.js
const getTeamMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Check if chat room exists and is a team chat room
    const chatRoom = await ChatRoom.findById(chatRoomId)
      .populate('participants', 'fullName email picture')
      .populate('createdBy', 'fullName email');
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // Check if user is a participant in the chat room
    const isParticipant = chatRoom.participants.some(
      p => p._id.toString() === req.user.id
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat room'
      });
    }
    
    // Fetch messages with pagination (newest first)
    const messages = await ChatMessage.find({ chatRoom: chatRoomId })
      .populate('sender', 'fullName email picture')
      .populate('readBy.user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Get total count
    const totalMessages = await ChatMessage.countDocuments({ chatRoom: chatRoomId });
    
    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: parseInt(page),
      chatRoom: {
        _id: chatRoom._id,
        name: chatRoom.name,
        description: chatRoom.description,
        participants: chatRoom.participants,
        createdBy: chatRoom.createdBy
      }
    });
  } catch (error) {
    console.error('Error getting team chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve team chat messages',
      error: error.message
    });
  }
};

// Extend existing exports


module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  getTeamMessages
};