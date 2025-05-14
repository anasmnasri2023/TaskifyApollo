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

// Get activities directly (simple fetch)
router.get('/direct/:userId', validateObjectId, async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter = 'all', limit = 10, skip = 0 } = req.query;

    let query = { user: new mongoose.Types.ObjectId(userId) };
    if (filter !== 'all') {
      if (filter === 'task') {
        query.actionType = { $in: ['task_created', 'task_updated', 'task_completed', 'task_status_updated'] };
      } else {
        query.actionType = filter;
      }
    }

    const activities = await Activity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ message: 'Server error while fetching activities' });
  }
});

// Get activity statistics
router.get('/stats/:userId', validateObjectId, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeFrame = 'week' } = req.query;

    const now = new Date();
    let startDate;
    
    switch (timeFrame) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const activities = await Activity.find({
      user: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate }
    });

    // Hourly distribution
    const hourlyDistribution = Array(24).fill(0).map((_, i) => ({
      hour: i.toString().padStart(2, '0') + ':00',
      count: 0
    }));

    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourlyDistribution[hour].count += 1;
    });

    // Type distribution
    const typeCounts = {};
    activities.forEach(activity => {
      typeCounts[activity.actionType] = (typeCounts[activity.actionType] || 0) + 1;
    });
    
    const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count
    }));

    // Category distribution
    const categoryCounts = {};
    activities.forEach(activity => {
      if (activity.taskCategory) {
        categoryCounts[activity.taskCategory] = (categoryCounts[activity.taskCategory] || 0) + 1;
      }
    });
    
    const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count
    }));

    res.status(200).json({
      hourlyDistribution,
      typeDistribution,
      categoryDistribution,
      totalActivities: activities.length,
      activeDays: new Set(activities.map(a => new Date(a.timestamp).toDateString())).size
    });
  } catch (err) {
    console.error('Error fetching activity stats:', err);
    res.status(500).json({ message: 'Server error while fetching activity stats' });
  }
});

// Get user persona based on activities
router.get('/persona/:userId', validateObjectId, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all task-related activities
    const activities = await Activity.find({
      user: new mongoose.Types.ObjectId(userId),
      actionType: { $in: ['task_created', 'task_updated', 'task_completed'] }
    }).limit(100);

    // Analyze task categories
    const categoryCount = {};
    const priorityCount = {};

    activities.forEach(activity => {
      if (activity.taskCategory) {
        categoryCount[activity.taskCategory] = (categoryCount[activity.taskCategory] || 0) + 1;
      }
      if (activity.taskPriority) {
        priorityCount[activity.taskPriority] = (priorityCount[activity.taskPriority] || 0) + 1;
      }
    });

    // Determine primary skill based on most common task category
    const sortedCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .map(([category]) => category);

    const primarySkill = sortedCategories[0] || 'development';
    const secondarySkills = sortedCategories.slice(1, 3);

    // Determine expertise level based on priority distribution
    let expertiseLevel = 'intermediate';
    const criticalAndHighCount = (priorityCount['critical'] || 0) + (priorityCount['high'] || 0);
    const totalCount = Object.values(priorityCount).reduce((a, b) => a + b, 0);
    
    if (totalCount > 0) {
      const complexityRatio = criticalAndHighCount / totalCount;
      if (complexityRatio > 0.6) expertiseLevel = 'expert';
      else if (complexityRatio < 0.2) expertiseLevel = 'entry-level';
    }

    // Generate persona
    const personaMap = {
      'development': 'Full Stack Developer',
      'infrastructure': 'DevOps Engineer',
      'security': 'Security Specialist',
      'networking': 'Network Engineer',
      'technical': 'Technical Lead',
      'architecture': 'System Architect',
      'hr process': 'HR Manager'
    };

    const persona = {
      type: personaMap[primarySkill] || 'Tech Professional',
      primarySkill,
      secondarySkills,
      expertiseLevel,
      recommendedSkills: ['cloud architecture', 'automation', 'team leadership']
        .filter(s => !sortedCategories.includes(s)),
      activityLevel: activities.length > 50 ? 'High' : activities.length > 20 ? 'Medium' : 'Low',
      description: `You're a ${personaMap[primarySkill] || 'Tech Professional'} with ${expertiseLevel} expertise in ${primarySkill}. Your activity shows strong focus on ${primarySkill} tasks with ${secondarySkills.length ? `additional skills in ${secondarySkills.join(', ')}` : 'developing broader skills'}.`
    };

    res.status(200).json(persona);
  } catch (err) {
    console.error('Error generating persona:', err);
    res.status(500).json({ message: 'Server error while generating persona' });
  }
});

module.exports = router;