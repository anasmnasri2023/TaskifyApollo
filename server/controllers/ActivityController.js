// controllers/activityController.js
const Activity = require('../models/Activity');
const LoginActivity = require('../models/LoginActivity'); // Your existing login activity model
const Task = require('../models/tasks');
const aiPersonaService = require('../services/aiPersonaService');

/**
 * Activity Controller
 * 
 * Provides API endpoints for the activity dashboard including:
 * - Activity history
 * - Activity statistics
 * - Technical persona generation
 * - Dashboard metrics
 */
const ActivityController = {
  /**
   * Get user activities (combines regular activities and login events)
   * 
   * @route GET /api/activities/:userId?
   */
  getUserActivities: async (req, res) => {
    try {
      const userId = req.params.userId || req.user._id;
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;
      const filter = req.query.filter || 'all'; // all, task, login, etc.
      
      // Build query based on filter
      let activityQuery = { user: userId };
      if (filter !== 'all' && filter !== 'login') {
        if (filter === 'task') {
          activityQuery.actionType = { 
            $in: ['task_created', 'task_updated', 'task_completed', 'task_deleted'] 
          };
        } else {
          activityQuery.actionType = filter;
        }
      }
      
      // Get regular activities
      const activities = await Activity.find(activityQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
      
      // Format for frontend
      const formattedActivities = activities.map(a => ({
        id: a._id,
        type: a.actionType,
        action: a.action,
        details: a.details,
        timestamp: a.timestamp,
        entityType: a.relatedEntityType,
        entityId: a.relatedEntityId,
        category: a.taskCategory
      }));
      
      // If we want login activities too and there's no specific non-login filter
      let loginActivities = [];
      if (filter === 'all' || filter === 'login') {
        loginActivities = await LoginActivity.find({ user: userId })
          .sort({ timestamp: -1 })
          .limit(filter === 'login' ? limit : Math.min(10, limit / 2));
        
        // Format login activities
        loginActivities = loginActivities.map(l => ({
          id: l._id,
          type: "login",
          action: l.successful ? "Login Successful" : "Login Failed",
          details: `Device: ${l.deviceInfo?.browser || 'Unknown'} on ${l.deviceInfo?.os || 'Unknown'}`,
          timestamp: l.timestamp,
          suspicious: l.isSuspicious
        }));
      }
      
      // Combine and sort
      let combinedActivities = [...formattedActivities, ...loginActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // If using pagination, we may need to slice
      if (skip > 0 || combinedActivities.length > limit) {
        combinedActivities = combinedActivities.slice(0, limit);
      }
      
      // Get total count for pagination
      const totalCount = await Activity.countDocuments(activityQuery) + 
        (filter === 'all' || filter === 'login' ? await LoginActivity.countDocuments({ user: userId }) : 0);
      
      res.status(200).json({
        success: true,
        data: combinedActivities,
        pagination: {
          total: totalCount,
          count: combinedActivities.length,
          limit,
          skip
        }
      });
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve activity data",
        error: error.message
      });
    }
  },
  
  /**
   * Get activity statistics for dashboard visualizations
   * 
   * @route GET /api/activities/stats/:userId?
   */
  getActivityStats: async (req, res) => {
    try {
      const userId = req.params.userId || req.user._id;
      const timeFrame = req.query.timeFrame || 'week'; // day, week, month, year
      
      // Calculate start date based on timeFrame
      const startDate = new Date();
      if (timeFrame === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeFrame === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFrame === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFrame === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      // Get activities within timeframe
      const activities = await Activity.find({
        user: userId,
        timestamp: { $gte: startDate }
      });
      
      // Get logins within timeframe
      const logins = await LoginActivity.find({
        user: userId,
        timestamp: { $gte: startDate }
      });
      
      // Calculate hourly distribution
      const hourlyDistribution = Array(24).fill(0);
      const hourlyLabels = Array(24).fill(0).map((_, i) => 
        `${i.toString().padStart(2, '0')}:00`
      );
      
      [...activities, ...logins].forEach(activity => {
        const hour = new Date(activity.timestamp).getHours();
        hourlyDistribution[hour]++;
      });
      
      // Format hourly data for charts
      const hourlyData = hourlyDistribution.map((count, index) => ({
        hour: hourlyLabels[index],
        count
      }));
      
      // Calculate activity type distribution
      const typeDistribution = {};
      activities.forEach(activity => {
        if (!typeDistribution[activity.actionType]) {
          typeDistribution[activity.actionType] = 0;
        }
        typeDistribution[activity.actionType]++;
      });
      
      // Add login distribution
      typeDistribution.login = logins.length;
      
      // Format type distribution for charts
      const typeData = Object.entries(typeDistribution).map(([type, count]) => ({
        type: formatActionType(type),
        count
      })).sort((a, b) => b.count - a.count);
      
      // Calculate task category distribution
      const categoryDistribution = {};
      activities
        .filter(a => a.taskCategory)
        .forEach(activity => {
          if (!categoryDistribution[activity.taskCategory]) {
            categoryDistribution[activity.taskCategory] = 0;
          }
          categoryDistribution[activity.taskCategory]++;
        });
      
      // Format category distribution for charts
      const categoryData = Object.entries(categoryDistribution).map(([category, count]) => ({
        category,
        count
      })).sort((a, b) => b.count - a.count);
      
      // Calculate weekday distribution
      const weekdayDistribution = Array(7).fill(0);
      const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      [...activities, ...logins].forEach(activity => {
        const day = new Date(activity.timestamp).getDay();
        weekdayDistribution[day]++;
      });
      
      // Format weekday data for charts
      const weekdayData = weekdayDistribution.map((count, index) => ({
        day: weekdayLabels[index],
        count
      }));
      
      // Calculate basic metrics
      const totalActivities = activities.length + logins.length;
      const taskActivities = activities.filter(a => 
        a.actionType.includes('task_')
      ).length;
      const completedTasks = activities.filter(a => 
        a.actionType === 'task_completed'
      ).length;
      
      // Return all stats
      res.status(200).json({
        success: true,
        data: {
          timeFrame,
          hourlyDistribution: hourlyData,
          typeDistribution: typeData,
          categoryDistribution: categoryData,
          weekdayDistribution: weekdayData,
          totalActivities,
          taskActivities,
          completedTasks,
          loginCount: logins.length
        }
      });
    } catch (error) {
      console.error("Error calculating activity statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to calculate activity statistics",
        error: error.message
      });
    }
  },
  
  /**
   * Get user's technical persona (AI-powered analysis)
   * 
   * @route GET /api/activities/persona/:userId?
   */
  getUserPersona: async (req, res) => {
    try {
      const userId = req.params.userId || req.user._id;
      
      // Use the AI service to generate the persona
      const persona = await aiPersonaService.generatePersona(userId);
      
      res.status(200).json({
        success: true,
        data: persona
      });
    } catch (error) {
      console.error("Error generating user persona:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate technical persona",
        error: error.message
      });
    }
  },
  
  /**
   * Get task priority recommendations (for TaskPriorityWizard component)
   * 
   * @route GET /api/activities/task-priorities/:userId?
   */
  getTaskPriorities: async (req, res) => {
    try {
      const userId = req.params.userId || req.user._id;
      
      // Get user's in-progress tasks
      const tasks = await Task.find({
        assignee: userId,
        status: "2" // In progress
      });
      
      if (tasks.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            priorities: [],
            message: "No in-progress tasks found to prioritize."
          }
        });
      }
      
      // For each task, calculate a priority score
      const taskScores = tasks.map(task => {
        // Start with base score
        let score = 0;
        
        // Factor 1: Due date proximity (if exists)
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const now = new Date();
          const daysUntilDue = Math.max(0, Math.floor((dueDate - now) / (1000 * 60 * 60 * 24)));
          
          if (daysUntilDue <= 1) score += 50;
          else if (daysUntilDue <= 3) score += 30;
          else if (daysUntilDue <= 7) score += 15;
        }
        
        // Factor 2: Task priority (from task data)
        if (task.priority === "4") score += 40; // Critical
        else if (task.priority === "3") score += 30; // High
        else if (task.priority === "2") score += 15; // Medium
        
        // Factor 3: Dependencies (if implemented in your system)
        // This would need to be implemented based on your task model
        
        return {
          task,
          score
        };
      });
      
      // Sort tasks by score
      const sortedTasks = taskScores.sort((a, b) => b.score - a.score);
      
      // Format for frontend
      const priorities = sortedTasks.map(({ task, score }) => ({
        id: task._id,
        title: task.title,
        score,
        priority: task.priority,
        dueDate: task.dueDate,
        category: task.type, // This might need adjustment based on your model
        reason: score >= 40 ? "Urgent attention needed" :
                score >= 25 ? "Important to focus on soon" :
                "Regular priority"
      }));
      
      res.status(200).json({
        success: true,
        data: {
          priorities,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Error generating task priorities:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate task priorities",
        error: error.message
      });
    }
  },
  
  /**
   * Get dashboard summary (main metrics for the Activity Dashboard)
   * 
   * @route GET /api/activities/dashboard/:userId?
   */
  getDashboardSummary: async (req, res) => {
    try {
      const userId = req.params.userId || req.user._id;
      
      // Get today's date with time set to start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Get activities from today
      const todayActivities = await Activity.find({
        user: userId,
        timestamp: { $gte: today }
      });
      
      // Get activities from yesterday
      const yesterdayActivities = await Activity.find({
        user: userId,
        timestamp: { $gte: yesterday, $lt: today }
      });
      
      // Get total tasks (in progress and completed)
      const totalTasks = await Task.countDocuments({
        assignee: userId,
        status: { $in: ["2", "3"] } // In progress or completed
      });
      
      // Get completed tasks
      const completedTasks = await Task.countDocuments({
        assignee: userId,
        status: "3" // Completed
      });
      
      // Get in-progress tasks
      const inProgressTasks = await Task.countDocuments({
        assignee: userId,
        status: "2" // In progress
      });
      
      // Calculate completion rate
      const completionRate = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;
      
      // Get latest login
      const latestLogin = await LoginActivity.findOne({
        user: userId,
        successful: true
      }).sort({ timestamp: -1 });
      
      // Collect metrics
      const metrics = {
        activitiesToday: todayActivities.length,
        activityChange: yesterdayActivities.length > 0 
          ? Math.round(((todayActivities.length - yesterdayActivities.length) / yesterdayActivities.length) * 100) 
          : 100,
        totalTasks,
        completedTasks,
        inProgressTasks,
        completionRate,
        latestLogin: latestLogin?.timestamp || null
      };
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard summary",
        error: error.message
      });
    }
  }
};

/**
 * Format action type for display
 * 
 * @param {string} actionType - Raw action type
 * @returns {string} - Formatted action type
 */
function formatActionType(actionType) {
  switch (actionType) {
    case 'task_created': return 'Task Created';
    case 'task_updated': return 'Task Updated';
    case 'task_completed': return 'Task Completed';
    case 'task_deleted': return 'Task Deleted';
    case 'comment_added': return 'Comment Added';
    case 'profile_updated': return 'Profile Updated';
    case 'team_action': return 'Team Activity';
    case 'login': return 'Login';
    case 'logout': return 'Logout';
    default: return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  // Add to getUserActivities in activityController.js
exports.getUserActivities = async (req, res) => {
    console.log("⭐ getUserActivities called with params:", req.params);
    console.log("⭐ Authenticated user:", req.user?._id);
    
    try {
      const userId = req.params.userId || req.user?._id;
      console.log("⭐ Looking up activities for userId:", userId);
      
      // Get regular activities
      const activities = await Activity.find({ user: userId }).sort({ timestamp: -1 });
      console.log("⭐ Activities found:", activities.length);
      
      // Rest of the function...
    } catch (error) {
      console.error("❌ Error in getUserActivities:", error);
      // Error handling...
    }
  };
}

module.exports = ActivityController;