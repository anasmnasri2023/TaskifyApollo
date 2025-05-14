const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const Task = require('../models/tasks');
const mongoose = require('mongoose');

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }
  next();
};

// Fetch dashboard summary
router.get('/summary/:userId', validateObjectId, async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch tasks
    const tasks = await Task.find({ assignee: new mongoose.Types.ObjectId(userId) }); // Changed from assignees to assignee
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Fetch activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const activitiesToday = await Activity.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: today },
    });

    const activitiesYesterday = await Activity.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: yesterday, $lt: today },
    });

    const activityChange = activitiesYesterday > 0
      ? Math.round(((activitiesToday - activitiesYesterday) / activitiesYesterday) * 100)
      : activitiesToday > 0 ? 100 : 0;

    const latestLoginActivity = await Activity.findOne({
      user: new mongoose.Types.ObjectId(userId),
      actionType: 'login', // Changed from type to actionType
    }).sort({ timestamp: -1 });

    res.status(200).json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      completionRate,
      activitiesToday,
      activityChange,
      latestLogin: latestLoginActivity ? latestLoginActivity.timestamp : null,
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ message: 'Server error while fetching dashboard summary' });
  }
});

module.exports = router;