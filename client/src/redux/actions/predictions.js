// actions/predictions.js
import { setRefresh } from "../reducers/commons";
import { setErrors } from "../reducers/errors";

// Helper function to calculate prediction based on task type and priority
const calculatePrediction = (task) => {
  // Base duration by task type (days)
  const typeFactor = {
    '1': 2, // Bug - 2 days
    '2': 4, // Feature - 4 days
    '3': 3, // Improvement - 3 days
    '4': 1, // Documentation - 1 day
    '5': 5, // Research - 5 days
    '6': 3, // Testing - 3 days
    '7': 2, // Maintenance - 2 days
    '8': 4, // Deployment - 4 days
    '9': 7  // Project - 7 days
  }[task.type] || 3;
  
  // Priority adjustment (higher priority = faster completion)
  const priorityFactor = {
    '1': 0.7, // High priority - faster
    '2': 1.0, // Medium priority - normal 
    '3': 1.2, // Low priority - slower
    '4': 1.5  // Lowest - even slower
  }[task.priority] || 1.0;
  
  // Calculate predicted days with one decimal place
  const predictedDays = Math.round(typeFactor * priorityFactor * 10) / 10;
  
  // Calculate predicted completion date
  const startDate = task.start_date ? new Date(task.start_date) : new Date();
  const predictedDate = new Date(startDate);
  predictedDate.setDate(predictedDate.getDate() + predictedDays);
  
  return {
    taskId: task._id,
    title: task.title,
    predictedCompletionDate: predictedDate.toISOString(),
    predictedDurationDays: predictedDays,
    confidenceScore: 7 // Medium-high confidence
  };
};

// Helper function to calculate user productivity
const calculateProductivity = (user, tasks) => {
  // Filter tasks assigned to this user
  const userTasks = tasks.filter(task => 
    task.assigns && task.assigns.some(assignId => assignId === user._id)
  );
  
  // Count completed tasks
  const completedTasks = userTasks.filter(task => task.status === '4');
  
  // If no tasks, return basic score
  if (userTasks.length === 0) {
    return {
      userId: user._id,
      fullName: user.fullName,
      productivityScore: 5,
      strengths: ["No tasks yet"],
      areasForImprovement: ["Add tasks to measure productivity"]
    };
  }
  
  // Calculate completion ratio (completed vs. assigned)
  const completionRatio = completedTasks.length / userTasks.length;
  
  // Calculate on-time ratio if possible
  let onTimeCount = 0;
  completedTasks.forEach(task => {
    if (task.end_date) {
      const endDate = new Date(task.end_date);
      const updatedDate = new Date(task.updatedAt);
      if (updatedDate <= endDate) {
        onTimeCount++;
      }
    }
  });
  
  const onTimeRatio = completedTasks.length > 0 ? onTimeCount / completedTasks.length : 0;
  
  // Calculate productivity score (1-10 scale)
  // 60% weight to completion ratio, 40% to on-time ratio
  const productivityScore = Math.round((completionRatio * 6 + onTimeRatio * 4) * 10) / 10;
  
  // Determine strengths based on task types
  const strengths = [];
  const typeCounts = {};
  
  completedTasks.forEach(task => {
    if (!typeCounts[task.type]) {
      typeCounts[task.type] = 0;
    }
    typeCounts[task.type]++;
  });
  
  // Find the task types with most completions
  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  
  sortedTypes.forEach(([type, count]) => {
    if (count > 0) {
      let typeDescription = "Unknown";
      switch(type) {
        case '1': typeDescription = "Bug fixing"; break;
        case '2': typeDescription = "Feature development"; break;
        case '3': typeDescription = "Improvement tasks"; break;
        case '4': typeDescription = "Documentation"; break;
        case '5': typeDescription = "Research tasks"; break;
        default: typeDescription = `Task type ${type}`; break;
      }
      strengths.push(`${typeDescription} (${count} completed)`);
    }
  });
  
  // Add skills-based strengths
  if (user.skills && user.skills.length) {
    user.skills.slice(0, 2).forEach(skill => {
      strengths.push(`Skilled in ${skill}`);
    });
  }
  
  // If we still need strengths, add general ones
  if (strengths.length < 2) {
    if (completionRatio > 0.6) {
      strengths.push("High task completion rate");
    }
    if (onTimeRatio > 0.7) {
      strengths.push("Good at meeting deadlines");
    }
  }
  
  // Areas for improvement
  const improvements = [];
  if (completionRatio < 0.6) {
    improvements.push("Task completion rate");
  }
  if (onTimeRatio < 0.7 && completedTasks.length > 0) {
    improvements.push("Meeting deadlines");
  }
  if (improvements.length < 2) {
    improvements.push("Take on more complex tasks");
  }
  
  return {
    userId: user._id,
    fullName: user.fullName,
    productivityScore: Math.min(Math.max(productivityScore, 1), 10), // Ensure between 1-10
    strengths: strengths.slice(0, 3),
    areasForImprovement: improvements.slice(0, 3)
  };
};

// Get prediction for a single task
export const GetTaskPredictionAction = (id) => async (dispatch, getState) => {
  dispatch(setRefresh(true));
  
  try {
    // Get task from redux store
    const task = getState().tasks._ALL.find(task => task._id === id);
    
    if (!task) {
      throw new Error("Task not found");
    }
    
    // Calculate prediction
    const prediction = calculatePrediction(task);
    
    // Update redux
    dispatch({
      type: 'SET_TASK_PREDICTION',
      payload: prediction
    });
    
    dispatch(setRefresh(false));
    return prediction;
  } catch (error) {
    console.error('Task Prediction Error:', error);
    dispatch(setErrors({ message: 'Failed to generate prediction' }));
    dispatch(setRefresh(false));
    throw error;
  }
};

// Get predictions for all active tasks
export const GetAllTaskPredictionsAction = () => async (dispatch, getState) => {
  dispatch(setRefresh(true));
  
  try {
    // Get tasks from redux store
    const allTasks = getState().tasks._ALL;
    
    // Filter active tasks (not completed)
    const activeTasks = allTasks.filter(task => task.status !== '4');
    
    // Calculate predictions for each task
    const predictions = activeTasks.map(task => calculatePrediction(task));
    
    // Update redux
    dispatch({
      type: 'SET_ALL_TASK_PREDICTIONS',
      payload: predictions
    });
    
    dispatch(setRefresh(false));
    return predictions;
  } catch (error) {
    console.error('All Task Predictions Error:', error);
    dispatch(setErrors({ message: 'Failed to generate predictions' }));
    dispatch(setRefresh(false));
    throw error;
  }
};

// Get productivity scores for all users
export const GetUserProductivityAction = () => async (dispatch, getState) => {
  dispatch(setRefresh(true));
  
  try {
    // Get users and tasks from redux store
    const users = getState().users._ALL;
    const tasks = getState().tasks._ALL;
    
    // Calculate productivity for each user
    const productivityData = users.map(user => calculateProductivity(user, tasks));
    
    // Update redux
    dispatch({
      type: 'SET_USER_PRODUCTIVITY',
      payload: productivityData
    });
    
    dispatch(setRefresh(false));
    return productivityData;
  } catch (error) {
    console.error('User Productivity Error:', error);
    dispatch(setErrors({ message: 'Failed to calculate productivity' }));
    dispatch(setRefresh(false));
    throw error;
  }
};