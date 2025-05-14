// utils/activityLogger.js
const Activity = require('../models/Activity');
const { MOCK_TYPE } = require('../constants/MOCK_TYPE');

const activityLogger = {
  // Main activity logging function that saves activities to database
  async log(userId, action, details, actionType, relatedEntityId = null, relatedEntityType = null, metadata = {}) {
    try {
      const activity = new Activity({
        user: userId,
        action,
        details,
        actionType,
        relatedEntityId,
        relatedEntityType,
        timestamp: new Date(),
        metadata
      });

      await activity.save();
      console.log(`✅ Activity logged: ${actionType} - ${action} for user ${userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      throw error;
    }
  },

  // Specialized method for logging task-related activities
  async logTaskActivity(userId, actionType, taskData) {
    try {
      let action, details, taskCategory, taskPriority;
      
      // Extract task category from MOCK_TYPE based on task type
      if (taskData.type) {
        const mockType = MOCK_TYPE.find(t => t.value === taskData.type || t.label === taskData.type);
        if (mockType) {
          taskCategory = mockType.category;
        }
      }
      
      // Extract priority with fallback to 'medium'
      taskPriority = taskData.priority || 'medium';
      
      // Determine action and details based on actionType
      switch (actionType) {
        case 'task_created':
          action = 'Created Task';
          details = `Created task: ${taskData.title}`;
          break;
        case 'task_updated':
          action = 'Updated Task';
          details = `Updated task: ${taskData.title}`;
          break;
        case 'task_completed':
          action = 'Completed Task';
          details = `Completed task: ${taskData.title}`;
          break;
        case 'task_status_updated':
          action = 'Updated Task Status';
          details = `Changed task status to: ${taskData.status}`;
          break;
        case 'task_deleted':
          action = 'Deleted Task';
          details = `Deleted task: ${taskData.title}`;
          break;
        default:
          action = 'Task Action';
          details = `Performed action on task: ${taskData.title}`;
      }

      // Create and save the activity
      const activity = new Activity({
        user: userId,
        action,
        actionType,
        details,
        timestamp: new Date(),
        relatedEntityId: taskData._id,
        relatedEntityType: 'Task',
        taskCategory,
        taskPriority,
        metadata: {
          taskStatus: taskData.status,
          taskType: taskData.type,
          ...metadata
        }
      });

      await activity.save();
      console.log(`✅ Task activity logged: ${actionType} for user ${userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Error logging task activity:', error);
      throw error;
    }
  },

  // Method for logging comment activities
  async logCommentActivity(userId, commentData, taskData) {
    try {
      let taskCategory;
      
      // Extract task category if available
      if (taskData.type) {
        const mockType = MOCK_TYPE.find(t => t.value === taskData.type || t.label === taskData.type);
        if (mockType) {
          taskCategory = mockType.category;
        }
      }

      const activity = new Activity({
        user: userId,
        action: 'Added Comment',
        actionType: 'comment_added',
        details: `Added comment on task: ${taskData.title}`,
        timestamp: new Date(),
        relatedEntityId: taskData._id,
        relatedEntityType: 'Task',
        taskCategory,
        metadata: {
          commentId: commentData._id,
          commentText: commentData.text?.substring(0, 50) // Store first 50 chars of comment
        }
      });

      await activity.save();
      console.log(`✅ Comment activity logged for user ${userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Error logging comment activity:', error);
      throw error;
    }
  },

  // Method for logging team activities
  async logTeamActivity(userId, actionType, teamData) {
    try {
      let action, details;
      
      switch (actionType) {
        case 'team_created':
          action = 'Created Team';
          details = `Created team: ${teamData.name}`;
          break;
        case 'team_updated':
          action = 'Updated Team';
          details = `Updated team: ${teamData.name}`;
          break;
        case 'team_member_added':
          action = 'Added Team Member';
          details = `Added member to team: ${teamData.name}`;
          break;
        case 'team_fetch':
          action = 'Fetched Teams';
          details = `Fetched team data`;
          break;
        default:
          action = 'Team Action';
          details = `Performed action on team: ${teamData.name || 'teams'}`;
      }

      const activity = new Activity({
        user: userId,
        action,
        actionType: actionType === 'team_fetch' ? 'team_fetch' : 'team_action',
        details,
        timestamp: new Date(),
        relatedEntityId: teamData._id,
        relatedEntityType: 'Team',
        metadata: {
          teamSize: teamData.members?.length
        }
      });

      await activity.save();
      console.log(`✅ Team activity logged: ${actionType} for user ${userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Error logging team activity:', error);
      throw error;
    }
  },

  // Method for logging authentication activities
  async logAuthActivity(userId, actionType, details = '') {
    try {
      let action;
      
      switch (actionType) {
        case 'login':
          action = 'Login Successful';
          details = details || 'Login from Chrome on Windows';
          break;
        case 'logout':
          action = 'Logged Out';
          details = details || 'User logged out';
          break;
        default:
          action = 'Authentication Action';
      }

      const activity = new Activity({
        user: userId,
        action,
        actionType,
        details,
        timestamp: new Date(),
        ipAddress: '127.0.0.1', // You might want to get this from the request
        deviceInfo: {
          browser: 'Chrome',
          os: 'Windows',
          device: 'Desktop'
        }
      });

      await activity.save();
      console.log(`✅ Auth activity logged: ${actionType} for user ${userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Error logging auth activity:', error);
      throw error;
    }
  }
};

module.exports = activityLogger;