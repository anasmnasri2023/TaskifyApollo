// services/huggingFaceService.js
const axios = require('axios');
require('dotenv').config();

// Hugging Face Inference API endpoint - free tier
const HF_API_URL = 'https://api-inference.huggingface.co/models';
// Using a text classification model from the free tier
const HF_MODEL_TEXT = 'facebook/bart-large-mnli';
const HF_TOKEN = process.env.HUGGING_FACE_TOKEN;

// Create a client for Hugging Face API
const hfClient = axios.create({
  baseURL: HF_API_URL,
  headers: {
    'Authorization': `Bearer ${HF_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Main function to predict task completion
const predictTaskCompletion = async (taskData, historicalTasks) => {
  try {
    // For free tier, we'll use a simpler approach
    // Instead of a full ML prediction, we'll use text classification
    // to determine task complexity, then estimate completion time
    
    // Format task for classification
    const taskDescription = `Task: ${taskData.title}. Description: ${taskData.description || ''}. Priority: ${taskData.priority}. Type: ${taskData.type}.`;
    
    // Use Hugging Face to classify task complexity
    const response = await hfClient.post(`/${HF_MODEL_TEXT}`, {
      inputs: taskDescription,
      parameters: {
        candidate_labels: ["simple", "moderate", "complex"],
      }
    });
    
    // Extract classification result
    const complexityResults = response.data;
    const complexityScores = {
      simple: complexityResults.scores[complexityResults.labels.indexOf("simple")] || 0.33,
      moderate: complexityResults.scores[complexityResults.labels.indexOf("moderate")] || 0.33,
      complex: complexityResults.scores[complexityResults.labels.indexOf("complex")] || 0.33
    };
    
    // Find highest complexity score
    const complexity = Object.keys(complexityScores).reduce(
      (a, b) => complexityScores[a] > complexityScores[b] ? a : b
    );
    
    // Base duration factors by complexity
    const baseDurationByComplexity = {
      simple: 2, // 2 days
      moderate: 5, // 5 days
      complex: 10 // 10 days
    };
    
    // Adjust based on priority (1=highest, 4=lowest)
    const priorityFactor = {
      '1': 0.7, // High priority - faster
      '2': 1.0, // Medium priority - normal 
      '3': 1.2, // Low priority - slower
      '4': 1.5  // Lowest - even slower
    }[taskData.priority] || 1.0;
    
    // Calculate predicted days
    const predictedDays = Math.round(baseDurationByComplexity[complexity] * priorityFactor * 10) / 10;
    
    // Calculate confidence score based on classification confidence
    const confidence = Math.round(complexityScores[complexity] * 10);
    
    // Determine predicted completion date
    const startDate = taskData.start_date ? new Date(taskData.start_date) : new Date();
    const predictedDate = new Date(startDate);
    predictedDate.setDate(predictedDate.getDate() + predictedDays);
    
    return {
      taskId: taskData._id,
      predictedCompletionDate: predictedDate.toISOString(),
      predictedDurationDays: predictedDays,
      confidenceScore: confidence,
      complexity: complexity,
      reasoningExplanation: `Task classified as ${complexity} complexity with ${confidence}/10 confidence.`
    };
  } catch (error) {
    console.error('Hugging Face Prediction Error:', error);
    // Provide a fallback prediction if the API fails
    return fallbackPrediction(taskData, historicalTasks);
  }
};

// Fallback prediction if API fails
const fallbackPrediction = (task, historicalTasks) => {
  // Simple heuristics based on task type and priority
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
  
  const priorityFactor = {
    '1': 0.7, // High priority - faster
    '2': 1.0, // Medium priority - normal 
    '3': 1.2, // Low priority - slower
    '4': 1.5  // Lowest - even slower
  }[task.priority] || 1.0;
  
  const predictedDays = Math.round(typeFactor * priorityFactor * 10) / 10;
  
  // Calculate predicted date
  const startDate = task.start_date ? new Date(task.start_date) : new Date();
  const predictedDate = new Date(startDate);
  predictedDate.setDate(predictedDate.getDate() + predictedDays);
  
  return {
    taskId: task._id,
    predictedCompletionDate: predictedDate.toISOString(),
    predictedDurationDays: predictedDays,
    confidenceScore: 5, // Medium confidence
    complexity: 'unknown',
    reasoningExplanation: 'Prediction based on task type and priority (fallback method)'
  };
};

// Calculate user productivity score
const calculateUserProductivity = async (userId, completedTasks) => {
  try {
    if (!completedTasks || completedTasks.length === 0) {
      return null;
    }
    
    // Calculate on-time completion ratio
    let onTimeCount = 0;
    let totalTaskTime = 0;
    
    completedTasks.forEach(task => {
      const completed = new Date(task.updatedAt);
      const deadline = task.end_date ? new Date(task.end_date) : null;
      
      if (deadline && completed <= deadline) {
        onTimeCount++;
      }
      
      // Calculate actual duration
      const created = new Date(task.createdAt);
      const durationDays = (completed - created) / (1000 * 60 * 60 * 24);
      totalTaskTime += durationDays;
    });
    
    const onTimeRatio = onTimeCount / completedTasks.length;
    const avgTaskDuration = totalTaskTime / completedTasks.length;
    
    // Use Hugging Face for sentiment analysis on task descriptions (optional)
    // This can help analyze difficulty of completed tasks
    let complexityScore = 0;
    
    try {
      // Take up to 5 recent tasks for analysis
      const recentTasks = completedTasks.slice(0, 5);
      const descriptions = recentTasks.map(task => 
        `${task.title}. ${task.description || ''}`
      ).join(' ');
      
      const response = await hfClient.post(`/${HF_MODEL_TEXT}`, {
        inputs: descriptions,
        parameters: {
          candidate_labels: ["simple", "moderate", "complex"],
        }
      });
      
      // Convert complexity to score (simple=0.3, moderate=0.6, complex=0.9)
      const complexityLabels = response.data.labels;
      const complexityScores = response.data.scores;
      
      complexityScore = 
        (complexityScores[complexityLabels.indexOf("simple")] || 0) * 0.3 +
        (complexityScores[complexityLabels.indexOf("moderate")] || 0) * 0.6 +
        (complexityScores[complexityLabels.indexOf("complex")] || 0) * 0.9;
    } catch (error) {
      console.error('Complexity analysis error:', error);
      // Default to moderate complexity
      complexityScore = 0.6;
    }
    
    // Combine factors to create productivity score (1-10 scale)
    // 50% on-time ratio, 30% speed, 20% task complexity
    const speedScore = Math.min(10, 10 / (avgTaskDuration / 3 + 0.5)); // Normalize speed
    const productivityScore = Math.round(
      (onTimeRatio * 5 + speedScore * 3 + complexityScore * 2) * 10
    ) / 10;
    
    // Calculate strengths based on task types
    const typePerformance = {};
    completedTasks.forEach(task => {
      if (!typePerformance[task.type]) {
        typePerformance[task.type] = { total: 0, onTime: 0 };
      }
      
      typePerformance[task.type].total++;
      
      const completed = new Date(task.updatedAt);
      const deadline = task.end_date ? new Date(task.end_date) : null;
      
      if (deadline && completed <= deadline) {
        typePerformance[task.type].onTime++;
      }
    });
    
    // Find top strengths
    const strengths = [];
    for (const [type, perf] of Object.entries(typePerformance)) {
      if (perf.total >= 2 && perf.onTime / perf.total >= 0.7) {
        let typeLabel = "Unknown";
        switch (type) {
          case '1': typeLabel = "Bug fixing"; break;
          case '2': typeLabel = "Feature development"; break;
          case '3': typeLabel = "Improvements"; break;
          case '4': typeLabel = "Documentation"; break;
          case '5': typeLabel = "Research"; break;
          case '6': typeLabel = "Testing"; break;
          case '7': typeLabel = "Maintenance"; break;
          case '8': typeLabel = "Deployment"; break;
          case '9': typeLabel = "Project management"; break;
        }
        strengths.push(`Strong at ${typeLabel}`);
      }
    }
    
    // Add general strengths if needed
    if (onTimeRatio >= 0.8) {
      strengths.push("Consistently meets deadlines");
    }
    if (speedScore >= 7) {
      strengths.push("Completes tasks quickly");
    }
    
    // Areas for improvement
    const improvements = [];
    for (const [type, perf] of Object.entries(typePerformance)) {
      if (perf.total >= 2 && perf.onTime / perf.total < 0.5) {
        let typeLabel = "Unknown";
        switch (type) {
          case '1': typeLabel = "Bug fixing"; break;
          case '2': typeLabel = "Feature development"; break;
          case '3': typeLabel = "Improvements"; break;
          case '4': typeLabel = "Documentation"; break;
          case '5': typeLabel = "Research"; break;
          case '6': typeLabel = "Testing"; break;
          case '7': typeLabel = "Maintenance"; break;
          case '8': typeLabel = "Deployment"; break;
          case '9': typeLabel = "Project management"; break;
        }
        improvements.push(`${typeLabel} timeliness`);
      }
    }
    
    if (onTimeRatio < 0.6) {
      improvements.push("Meeting deadlines");
    }
    if (speedScore < 5) {
      improvements.push("Task completion speed");
    }
    
    return {
      userId,
      productivityScore: Math.min(Math.max(productivityScore, 1), 10),
      strengths: strengths.slice(0, 3),
      areasForImprovement: improvements.slice(0, 3),
      recommendations: [
        "Break down complex tasks into smaller subtasks",
        "Set realistic interim milestones",
        "Focus on one task at a time until completion"
      ]
    };
  } catch (error) {
    console.error('Productivity Calculation Error:', error);
    return {
      userId,
      productivityScore: 5,
      strengths: ["No data available"],
      areasForImprovement: ["No data available"],
      recommendations: ["Collect more task completion data"]
    };
  }
};

module.exports = {
  predictTaskCompletion,
  calculateUserProductivity
};