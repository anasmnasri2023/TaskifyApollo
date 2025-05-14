const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const mongoose = require('mongoose');

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }
  next();
};

// Fetch activity statistics
router.get('/:userId', validateObjectId, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeFrame = 'week' } = req.query;

    const now = new Date();
    let startDate;
    switch (timeFrame) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const activities = await Activity.find({
      user: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate },
    });

    // Hourly distribution
    const hourlyDistribution = Array(24).fill(0).map((_, i) => ({
      hour: i.toString().padStart(2, '0') + ':00',
      count: 0,
    }));
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourlyDistribution[hour].count += 1;
    });

    // Type distribution
    const typeCounts = {};
    activities.forEach(activity => {
      typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1;
    });
    const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));

    // Weekday distribution
    const weekdayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    activities.forEach(activity => {
      const day = new Date(activity.timestamp).toLocaleString('en-US', { weekday: 'short' });
      weekdayCounts[day] += 1;
    });
    const weekdayDistribution = Object.entries(weekdayCounts).map(([day, count]) => ({
      day,
      count,
    }));

    // Category distribution (mocked since activities don’t have categories yet)
    const categoryDistribution = [
      { category: 'Development', count: activities.filter(a => a.type.includes('task')).length },
      { category: 'Collaboration', count: activities.filter(a => a.type === 'comment_added').length },
      { category: 'Management', count: activities.filter(a => a.type.includes('team') || a.type.includes('project')).length },
    ].filter(cat => cat.count > 0);

    res.status(200).json({
      hourlyDistribution,
      typeDistribution,
      weekdayDistribution,
      categoryDistribution,
    });
  } catch (err) {
    console.error('Error fetching activity stats:', err);
    res.status(500).json({ message: 'Server error while fetching activity stats' });
  }
});

module.exports = router;