// controllers/predictionController.js
const tasksModel = require("../models/tasks");
const usersModel = require("../models/users");

// Get prediction for a single task
const GetTaskPrediction = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // Get task data
    const task = await tasksModel.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Simple prediction based on task type and priority
    const typeFactor = {
      '1': 2, // Bug - 2 days
      '2': 4, // Feature - 4 days
      '3': 3  // Other types...
    }[task.type] || 3;
    
    const priorityFactor = {
      '1': 0.7, // High priority - faster
      '2': 1.0, // Medium priority - normal 
      '3': 1.2  // Low priority - slower
    }[task.priority] || 1.0;
    
    const predictedDays = Math.round(typeFactor * priorityFactor * 10) / 10;
    
    // Calculate predicted date
    const startDate = task.start_date ? new Date(task.start_date) : new Date();
    const predictedDate = new Date(startDate);
    predictedDate.setDate(predictedDate.getDate() + predictedDays);
    
    res.status(200).json({
      success: true,
      data: {
        taskId: task._id,
        title: task.title,
        predictedCompletionDate: predictedDate.toISOString(),
        predictedDurationDays: predictedDays,
        confidenceScore: 7
      }
    });
  } catch (error) {
    console.error('Get Task Prediction Error:', error);
    res.status(500).json({ 
      error: 'Failed to get task prediction', 
      details: error.message 
    });
  }
};

// Get predictions for all active tasks
const GetAllTaskPredictions = async (req, res) => {
  try {
    const activeTasks = await tasksModel.find({
      status: { $ne: '4' } // Not completed
    }).select('_id title description assigns priority type start_date end_date');
    
    const predictions = [];
    
    for (const task of activeTasks) {
      // Simple prediction logic (same as above)
      const typeFactor = {
        '1': 2, // Bug - 2 days
        '2': 4, // Feature - 4 days
        '3': 3  // Other types...
      }[task.type] || 3;
      
      const priorityFactor = {
        '1': 0.7, // High priority - faster
        '2': 1.0, // Medium priority - normal 
        '3': 1.2  // Low priority - slower
      }[task.priority] || 1.0;
      
      const predictedDays = Math.round(typeFactor * priorityFactor * 10) / 10;
      
      // Calculate predicted date
      const startDate = task.start_date ? new Date(task.start_date) : new Date();
      const predictedDate = new Date(startDate);
      predictedDate.setDate(predictedDate.getDate() + predictedDays);
      
      predictions.push({
        taskId: task._id,
        title: task.title,
        predictedCompletionDate: predictedDate.toISOString(),
        predictedDurationDays: predictedDays,
        confidenceScore: 7
      });
    }
    
    res.status(200).json({
      success: true,
      count: predictions.length,
      data: predictions
    });
  } catch (error) {
    console.error('Get All Predictions Error:', error);
    res.status(500).json({ 
      error: 'Failed to get task predictions', 
      details: error.message 
    });
  }
};

// Get productivity scores for all users
const GetUserProductivityScores = async (req, res) => {
  try {
    const users = await usersModel.find();
    const productivityData = [];
    
    for (const user of users) {
      // Get completed tasks for this user
      const completedTasks = await tasksModel.find({
        assigns: user._id,
        status: '4' // Completed status
      }).count();
      
      // For now, just return a simple productivity score
      productivityData.push({
        userId: user._id,
        fullName: user.fullName,
        productivityScore: Math.min(Math.max(Math.round(Math.random() * 10), 1), 10), // Random score 1-10 for demo
        strengths: ["Task completion", "Teamwork"],
        areasForImprovement: ["Time management"]
      });
    }
    
    res.status(200).json({
      success: true,
      count: productivityData.length,
      data: productivityData
    });
  } catch (error) {
    console.error('Get User Productivity Error:', error);
    res.status(500).json({ 
      error: 'Failed to get productivity scores', 
      details: error.message 
    });
  }
};

module.exports = {
  GetTaskPrediction,
  GetAllTaskPredictions,
  GetUserProductivityScores
};