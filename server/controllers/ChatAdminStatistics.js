// controllers/adminStatsController.js
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/ChatMessage');
const User = require('../models/users');

// Overview Statistics
const getOverviewStats = async (req, res) => {
  try {
    // Total rooms count
    const totalRooms = await ChatRoom.countDocuments();
    
    // Active users (users who sent messages in last 24h)
    const activeUsers = await Message.distinct('sender', {
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Messages per day (last 30 days)
    const messageStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Top active rooms (by message count in last 7 days)
    const topRooms = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$chatRoom",
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { messageCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "chatrooms",
          localField: "_id",
          foreignField: "_id",
          as: "roomDetails"
        }
      },
      { $unwind: "$roomDetails" }
    ]);
    
    // Average response time calculation
    const responseTimeData = await Message.aggregate([
      { $sort: { chatRoom: 1, createdAt: 1 } },
      {
        $group: {
          _id: "$chatRoom",
          messages: { $push: { sender: "$sender", createdAt: "$createdAt" } }
        }
      },
      {
        $project: {
          responseTimes: {
            $reduce: {
              input: { $range: [1, { $size: "$messages" }] },
              initialValue: [],
              in: {
                $concatArrays: [
                  "$$value",
                  {
                    $cond: {
                      if: {
                        $ne: [
                          { $arrayElemAt: ["$messages.sender", "$$this"] },
                          { $arrayElemAt: ["$messages.sender", { $subtract: ["$$this", 1] }] }
                        ]
                      },
                      then: [{
                        $subtract: [
                          { $arrayElemAt: ["$messages.createdAt", "$$this"] },
                          { $arrayElemAt: ["$messages.createdAt", { $subtract: ["$$this", 1] }] }
                        ]
                      }],
                      else: []
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]);
    
    const avgResponseTime = responseTimeData.reduce((acc, room) => {
      if (room.responseTimes.length > 0) {
        const roomAvg = room.responseTimes.reduce((sum, time) => sum + time, 0) / room.responseTimes.length;
        acc.times.push(roomAvg);
      }
      return acc;
    }, { times: [] });
    
    const overallAvgResponseTime = avgResponseTime.times.length > 0 
      ? avgResponseTime.times.reduce((sum, time) => sum + time, 0) / avgResponseTime.times.length 
      : 0;
    
    // Room type distribution
    const roomTypeDistribution = await ChatRoom.aggregate([
      {
        $group: {
          _id: "$isDirectMessage",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Peak activity hours
    const peakActivityHours = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        totalRooms,
        activeUsers: activeUsers.length,
        messageStats,
        topRooms,
        avgResponseTime: overallAvgResponseTime,
        roomTypeDistribution,
        peakActivityHours
      }
    });
  } catch (error) {
    console.error('Error in getOverviewStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview statistics',
      error: error.message
    });
  }
};

// Room-specific statistics
const getRoomStats = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await ChatRoom.findById(roomId)
      .populate('participants', 'fullName email')
      .populate('createdBy', 'fullName email');
      
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Message statistics for this room
    const messageStats = await Message.aggregate([
      { $match: { chatRoom: room._id } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          uniqueParticipants: { $addToSet: "$sender" },
          firstMessage: { $min: "$createdAt" },
          lastMessage: { $max: "$createdAt" },
          avgMessageLength: { $avg: { $strLenCP: "$content" } }
        }
      }
    ]);
    
    // Message distribution by user
    const messageDistribution = await Message.aggregate([
      { $match: { chatRoom: room._id } },
      {
        $group: {
          _id: "$sender",
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      { $sort: { messageCount: -1 } }
    ]);
    
    // Activity pattern (messages per hour)
    const activityPattern = await Message.aggregate([
      { $match: { chatRoom: room._id } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      roomStats: {
        room,
        statistics: messageStats[0],
        messageDistribution,
        activityPattern
      }
    });
  } catch (error) {
    console.error('Error in getRoomStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room statistics',
      error: error.message
    });
  }
};

// User chat statistics
const getUserChatStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // User's chat statistics
    const userStats = await Message.aggregate([
      { $match: { sender: user._id } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          chatRooms: { $addToSet: "$chatRoom" },
          avgMessageLength: { $avg: { $strLenCP: "$content" } },
          firstMessage: { $min: "$createdAt" },
          lastMessage: { $max: "$createdAt" }
        }
      }
    ]);
    
    // Messages per room for this user
    const messagesPerRoom = await Message.aggregate([
      { $match: { sender: user._id } },
      {
        $group: {
          _id: "$chatRoom",
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "chatrooms",
          localField: "_id",
          foreignField: "_id",
          as: "roomDetails"
        }
      },
      { $unwind: "$roomDetails" },
      { $sort: { messageCount: -1 } }
    ]);
    
    // User's activity pattern
    const activityPattern = await Message.aggregate([
      { $match: { sender: user._id } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      userStats: {
        user: { _id: user._id, fullName: user.fullName, email: user.email },
        statistics: userStats[0],
        messagesPerRoom,
        activityPattern
      }
    });
  } catch (error) {
    console.error('Error in getUserChatStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

// Generate custom report
const generateCustomReport = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      roomIds = [], 
      userIds = [], 
      reportType = 'activity' 
    } = req.body;
    
    let matchQuery = {};
    
    // Date range filter
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }
    
    // Room filter
    if (roomIds.length > 0) {
      matchQuery.chatRoom = { $in: roomIds };
    }
    
    // User filter
    if (userIds.length > 0) {
      matchQuery.sender = { $in: userIds };
    }
    
    let reportData = {};
    
    switch (reportType) {
      case 'activity':
        reportData = await Message.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              messageCount: { $sum: 1 },
              uniqueSenders: { $addToSet: "$sender" },
              uniqueRooms: { $addToSet: "$chatRoom" }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        break;
        
      case 'engagement':
        reportData = await Message.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: "$chatRoom",
              messageCount: { $sum: 1 },
              uniqueParticipants: { $addToSet: "$sender" },
              averageLength: { $avg: { $strLenCP: "$content" } }
            }
          },
          {
            $lookup: {
              from: "chatrooms",
              localField: "_id",
              foreignField: "_id",
              as: "roomDetails"
            }
          },
          { $unwind: "$roomDetails" },
          { $sort: { messageCount: -1 } }
        ]);
        break;
        
      case 'users':
        reportData = await Message.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: "$sender",
              messageCount: { $sum: 1 },
              uniqueRooms: { $addToSet: "$chatRoom" },
              averageLength: { $avg: { $strLenCP: "$content" } }
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "userDetails"
            }
          },
          { $unwind: "$userDetails" },
          { $sort: { messageCount: -1 } }
        ]);
        break;
    }
    
    res.status(200).json({
      success: true,
      report: {
        type: reportType,
        filters: {
          startDate,
          endDate,
          roomIds,
          userIds
        },
        data: reportData,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error in generateCustomReport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error.message
    });
  }
};

module.exports = {
  getOverviewStats,
  getRoomStats,
  getUserChatStats,
  generateCustomReport
};