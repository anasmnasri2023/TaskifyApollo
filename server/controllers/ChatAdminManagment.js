// controllers/adminChatController.js
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/ChatMessage');
const User = require('../models/users');

// Get all chat rooms with filters
// In your adminChatController.js
// In your getAllChatRooms controller
const getAllChatRooms = async (req, res) => {
    try {
      console.log('getAllChatRooms called with query:', req.query);
      
      const { 
        isActive, 
        isDirectMessage, 
        createdAfter, 
        createdBefore, 
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = req.query;
      
      let filter = {};
      
      // Apply filters - check for both undefined and empty string
      if (isActive !== undefined && isActive !== '' && isActive !== null) {
        filter.isActive = isActive === 'true';
      }
      
      if (isDirectMessage !== undefined && isDirectMessage !== '' && isDirectMessage !== null) {
        filter.isDirectMessage = isDirectMessage === 'true';
      }
      
      if (createdAfter || createdBefore) {
        filter.createdAt = {};
        if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
        if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
      }
      
      console.log('Filter being applied:', filter);
      
      // Get rooms with pagination
      const skip = (page - 1) * limit;
      const rooms = await ChatRoom.find(filter)
        .populate('participants', 'fullName email')
        .populate('createdBy', 'fullName email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      console.log('Rooms found:', rooms.length);
      
      const total = await ChatRoom.countDocuments(filter);
      console.log('Total rooms in database:', total);
      
      // Get additional stats for each room
      const roomsWithStats = await Promise.all(rooms.map(async (room) => {
        const messageCount = await Message.countDocuments({ chatRoom: room._id });
        const lastMessage = await Message.findOne({ chatRoom: room._id })
          .sort({ createdAt: -1 })
          .lean();
        
        return {
          ...room.toObject(),
          stats: {
            messageCount,
            lastMessage
          }
        };
      }));
      
      res.status(200).json({
        success: true,
        rooms: roomsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getAllChatRooms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chat rooms',
        error: error.message
      });
    }
  };
// Deactivate a chat room
const deactivateChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await ChatRoom.findByIdAndUpdate(
      roomId,
      { isActive: false },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Room deactivated successfully',
      room
    });
  } catch (error) {
    console.error('Error in deactivateChatRoom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate room',
      error: error.message
    });
  }
};

// Archive a chat room
const archiveChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await ChatRoom.findByIdAndUpdate(
      roomId,
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Room archived successfully',
      room
    });
  } catch (error) {
    console.error('Error in archiveChatRoom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive room',
      error: error.message
    });
  }
};

// Force add user to room
const forceAddUserToRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is already in the room
    if (room.participants.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already in this room'
      });
    }
    
    room.participants.push(userId);
    await room.save();
    
    // Send notification via socket
    if (req.io) {
      req.io.to(roomId).emit('force-user-added', {
        roomId,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      });
    }
    
    const updatedRoom = await room.populate('participants', 'fullName email');
    
    res.status(200).json({
      success: true,
      message: 'User added to room successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error('Error in forceAddUserToRoom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add user to room',
      error: error.message
    });
  }
};

// Delete messages admin
const deleteMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { messageIds = [], deleteAll = false } = req.body;
    
    let deletedCount = 0;
    
    if (deleteAll) {
      // Delete all messages in the room
      const result = await Message.deleteMany({ chatRoom: roomId });
      deletedCount = result.deletedCount;
    } else if (messageIds.length > 0) {
      // Delete specific messages
      const result = await Message.deleteMany({ 
        _id: { $in: messageIds },
        chatRoom: roomId 
      });
      deletedCount = result.deletedCount;
    }
    
    // Send update via socket
    if (req.io) {
      req.io.to(roomId).emit('messages-deleted', {
        roomId,
        messageIds: deleteAll ? [] : messageIds,
        deleteAll
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${deletedCount} message(s) deleted successfully`,
      deletedCount
    });
  } catch (error) {
    console.error('Error in deleteMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete messages',
      error: error.message
    });
  }
};

// Export chat data
const exportChatData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { format = 'json', startDate, endDate } = req.query;
    
    const room = await ChatRoom.findById(roomId)
      .populate('participants', 'fullName email')
      .populate('createdBy', 'fullName email');
      
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    let messageQuery = { chatRoom: roomId };
    
    if (startDate || endDate) {
      messageQuery.createdAt = {};
      if (startDate) messageQuery.createdAt.$gte = new Date(startDate);
      if (endDate) messageQuery.createdAt.$lte = new Date(endDate);
    }
    
    const messages = await Message.find(messageQuery)
      .populate('sender', 'fullName email')
      .sort({ createdAt: 1 });
    
    let exportData;
    
    switch (format) {
      case 'json':
        exportData = {
          room: {
            _id: room._id,
            name: room.name,
            createdAt: room.createdAt,
            createdBy: room.createdBy,
            participants: room.participants,
            isDirectMessage: room.isDirectMessage
          },
          messages: messages.map(msg => ({
            _id: msg._id,
            content: msg.content,
            sender: msg.sender,
            createdAt: msg.createdAt,
            attachments: msg.attachments || []
          }))
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="chat_${roomId}_${Date.now()}.json"`);
        res.send(JSON.stringify(exportData, null, 2));
        break;
        
      case 'csv':
        const csvRows = [
          ['Timestamp', 'Sender Name', 'Sender Email', 'Message Content']
        ];
        
        messages.forEach(msg => {
          csvRows.push([
            msg.createdAt.toISOString(),
            msg.sender?.fullName || '',
            msg.sender?.email || '',
            msg.content || ''
          ]);
        });
        
        const csvContent = csvRows.map(row => 
          row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="chat_${roomId}_${Date.now()}.csv"`);
        res.send(csvContent);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }
  } catch (error) {
    console.error('Error in exportChatData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export chat data',
      error: error.message
    });
  }
};

module.exports = {
  getAllChatRooms,
  deactivateChatRoom,
  archiveChatRoom,
  forceAddUserToRoom,
  deleteMessages,
  exportChatData
};