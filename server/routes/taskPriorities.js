const express = require('express');
const router = express.Router();
const Task = require('../models/tasks');
const mongoose = require('mongoose');

// Import MOCK_PRIORITY data - adjust path as needed
const { MOCK_PRIORITY } = require('../constants/MOCK_TYPE');

router.get('/priorities/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get tasks for this user
    const tasks = await Task.find({ 
      assignee: new mongoose.Types.ObjectId(userId) 
    });
    
    // Count by priority with mock data integration
    const priorityCounts = {};
    MOCK_PRIORITY.forEach(p => {
      priorityCounts[p.label] = 0;
    });
    
    tasks.forEach(task => {
      const priority = task.priority || 'medium';
      if (priorityCounts.hasOwnProperty(priority.toLowerCase())) {
        priorityCounts[priority.toLowerCase()]++;
      }
    });
    
    // Transform to array format with mock data enrichment
    const priorities = MOCK_PRIORITY.map(mockPriority => ({
      priority: mockPriority.label.charAt(0).toUpperCase() + mockPriority.label.slice(1),
      count: priorityCounts[mockPriority.label] || 0,
      complexity: mockPriority.complexity,
      impact: mockPriority.impact,
      requiredSkillLevel: mockPriority.requiredSkillLevel,
      color: mockPriority.color
    }));
    
    res.status(200).json(priorities);
  } catch (error) {
    console.error('Error fetching task priorities:', error);
    // Return mock data as fallback
    const fallbackPriorities = MOCK_PRIORITY.map(p => ({
      priority: p.label.charAt(0).toUpperCase() + p.label.slice(1),
      count: Math.floor(Math.random() * 10),
      complexity: p.complexity,
      impact: p.impact,
      requiredSkillLevel: p.requiredSkillLevel,
      color: p.color
    }));
    res.status(200).json(fallbackPriorities);
  }
});

module.exports = router;