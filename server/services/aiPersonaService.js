// services/aiPersonaService.js
const Activity = require('../models/Activity');
const Task = require('../models/tasks'); // Adjust path as needed

/**
 * AI Persona Service
 * 
 * This service analyzes user activity patterns to generate an AI-powered 
 * technical persona. While it doesn't use an external AI API, it implements
 * sophisticated analysis algorithms that create personalized, insightful results.
 */
class AIPersonaService {
  /**
   * Generate a technical persona based on user's task history
   * 
   * @param {string} userId - The ID of the user to analyze
   * @returns {Object} - Technical persona data
   */
  async generatePersona(userId) {
    try {
      // 1. Gather data for analysis
      const analysisData = await this.gatherAnalysisData(userId);
      
      // 2. Analyze task category distribution
      const categoryAnalysis = this.analyzeCategoryDistribution(analysisData.categoryCount);
      
      // 3. Analyze work patterns
      const patternAnalysis = this.analyzeWorkPatterns(analysisData.activityTimestamps);
      
      // 4. Determine technical strengths
      const strengthsAnalysis = this.determineStrengths(
        analysisData.categoryCount,
        analysisData.completedTasksCount,
        analysisData.completionRates
      );
      
      // 5. Calculate confidence level
      const confidenceScore = this.calculateConfidenceScore(analysisData);
      
      // 6. Generate the persona profile
      return this.composePersonaProfile(
        categoryAnalysis,
        patternAnalysis,
        strengthsAnalysis,
        confidenceScore,
        analysisData
      );
    } catch (error) {
      console.error("Error generating AI persona:", error);
      return this.getFallbackPersona();
    }
  }
  
  /**
   * Gather all necessary data for persona analysis
   * 
   * @param {string} userId - The user ID to analyze
   * @returns {Object} - Collection of analysis data
   */
  async gatherAnalysisData(userId) {
    // Get completed tasks (status 3 = completed)
    const completedTasks = await Task.find({
      assignee: userId,
      status: "3"
    });
    
    // Get in-progress tasks (status 2 = in progress)
    const inProgressTasks = await Task.find({
      assignee: userId,
      status: "2" 
    });
    
    // Combine task sets
    const allTasks = [...completedTasks, ...inProgressTasks];
    
    // Extract task categories and count occurrences
    const categoryCount = {};
    allTasks.forEach(task => {
      // You'll need to adapt this to match how your task types are stored
      // This assumes you have MOCK_TYPE imported or accessible
      const taskType = global.MOCK_TYPE.find(t => t.value === task.type);
      if (taskType && taskType.category) {
        const category = taskType.category;
        if (!categoryCount[category]) {
          categoryCount[category] = 0;
        }
        categoryCount[category]++;
      }
    });
    
    // Get task completion rates by category
    const completionRates = {};
    Object.keys(categoryCount).forEach(category => {
      const tasksInCategory = allTasks.filter(task => {
        const taskType = global.MOCK_TYPE.find(t => t.value === task.type);
        return taskType && taskType.category === category;
      });
      
      const completedInCategory = tasksInCategory.filter(t => t.status === "3").length;
      completionRates[category] = tasksInCategory.length > 0 
        ? (completedInCategory / tasksInCategory.length) 
        : 0;
    });
    
    // Get activity timestamps for pattern analysis
    const activities = await Activity.find({
      user: userId,
      actionType: { $in: ["task_created", "task_updated", "task_completed"] }
    }).sort({ timestamp: 1 });
    
    const activityTimestamps = activities.map(a => a.timestamp);
    
    // Return all gathered data
    return {
      categoryCount,
      completionRates,
      completedTasksCount: completedTasks.length,
      inProgressTasksCount: inProgressTasks.length,
      totalTasksCount: allTasks.length,
      activityTimestamps,
      taskPriorities: allTasks.map(t => t.priority)
    };
  }
  
  /**
   * Analyze the distribution of task categories
   * 
   * @param {Object} categoryCount - Count of tasks in each category
   * @returns {Object} - Analysis results
   */
  analyzeCategoryDistribution(categoryCount) {
    // Calculate total tasks
    const totalTasks = Object.values(categoryCount).reduce((sum, count) => sum + count, 0) || 1;
    
    // Calculate percentages
    const percentages = {};
    Object.entries(categoryCount).forEach(([category, count]) => {
      percentages[category] = Math.round((count / totalTasks) * 100);
    });
    
    // Sort categories by percentage
    const sortedCategories = Object.entries(percentages)
      .sort((a, b) => b[1] - a[1]);
    
    // Determine dominant category (if any)
    const dominantCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null;
    const dominantPercentage = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;
    const isDominant = dominantPercentage > 40;
    
    // Determine if profile is diverse (several significant categories)
    const significantCategories = sortedCategories.filter(([_, pct]) => pct >= 15);
    const isDiverse = significantCategories.length >= 3;
    
    // Format distribution for display
    const distribution = sortedCategories
      .slice(0, 4)
      .map(([category, percent]) => `${category}: ${percent}%`);
    
    return {
      percentages,
      sortedCategories,
      dominantCategory,
      dominantPercentage,
      isDominant,
      isDiverse,
      distribution
    };
  }
  
  /**
   * Analyze work patterns based on activity timestamps
   * 
   * @param {Array} timestamps - List of activity timestamps
   * @returns {Object} - Pattern analysis
   */
  analyzeWorkPatterns(timestamps) {
    if (!timestamps || timestamps.length < 5) {
      return { 
        insufficient: true,
        workPattern: "too_few_activities" 
      };
    }
    
    // Extract hours of day
    const hours = timestamps.map(t => new Date(t).getHours());
    
    // Count activities by hour
    const hourCounts = Array(24).fill(0);
    hours.forEach(hour => {
      hourCounts[hour]++;
    });
    
    // Determine peak times
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count > maxCount * 0.7)
      .map(({ hour }) => hour);
    
    // Categorize work pattern
    let workPattern = "balanced";
    
    if (peakHours.every(h => h >= 9 && h <= 17)) {
      workPattern = "standard_hours";
    } else if (peakHours.every(h => h >= 17 || h <= 2)) {
      workPattern = "night_owl";
    } else if (peakHours.every(h => h >= 5 && h <= 9)) {
      workPattern = "early_bird";
    }
    
    // Check for consistency
    const timestamps24h = timestamps.map(t => new Date(t).getTime());
    let isConsistent = false;
    
    if (timestamps24h.length > 10) {
      // Check time differences between activities
      const timeDiffs = [];
      for (let i = 1; i < timestamps24h.length; i++) {
        timeDiffs.push(timestamps24h[i] - timestamps24h[i-1]);
      }
      
      // Standard deviation of time differences
      const average = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
      const squareDiffs = timeDiffs.map(diff => Math.pow(diff - average, 2));
      const avgSquareDiff = squareDiffs.reduce((sum, squareDiff) => sum + squareDiff, 0) / squareDiffs.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      
      // Compare standard deviation to average
      isConsistent = stdDev / average < 1.5;
    }
    
    return {
      workPattern,
      peakHours,
      isConsistent
    };
  }
  
  /**
   * Determine technical strengths based on task categories and completion rates
   * 
   * @param {Object} categoryCount - Count of tasks by category
   * @param {number} completedTasksCount - Number of completed tasks
   * @param {Object} completionRates - Completion rates by category
   * @returns {Object} - Strengths analysis
   */
  determineStrengths(categoryCount, completedTasksCount, completionRates) {
    const strengths = [];
    const weaknesses = [];
    
    // Analyze each category for strengths
    Object.entries(categoryCount).forEach(([category, count]) => {
      const completionRate = completionRates[category] || 0;
      
      // Category is a strength if it has sufficient tasks and good completion rate
      if (count >= 3 && completionRate >= 0.5) {
        strengths.push(this.getCategoryStrengths(category));
      }
      
      // Category is a weakness if it has tasks but poor completion rate
      if (count >= 2 && completionRate < 0.3) {
        weaknesses.push(category);
      }
    });
    
    // Flatten and deduplicate strengths array
    const flatStrengths = [...new Set(strengths.flat())];
    
    return {
      strengths: flatStrengths.slice(0, 5),
      weaknesses
    };
  }
  
  /**
   * Get specific strengths associated with a category
   * 
   * @param {string} category - Task category
   * @returns {Array} - List of specific strengths
   */
  getCategoryStrengths(category) {
    const strengthsMap = {
      security: ["Threat Detection", "Security Protocols", "Vulnerability Assessment"],
      infrastructure: ["System Scaling", "Resource Optimization", "Platform Architecture"],
      architecture: ["System Design", "Technical Planning", "Pattern Recognition"],
      development: ["Code Implementation", "Feature Development", "Test Coverage"],
      networking: ["Network Configuration", "Connectivity Solutions", "Protocol Design"],
      "hr process": ["Team Management", "Process Improvement", "Policy Implementation"],
      technical: ["Technical Problem Solving", "Troubleshooting", "System Integration"]
    };
    
    return strengthsMap[category] || ["Technical Implementation"];
  }
  
  /**
   * Calculate confidence score for the analysis
   * 
   * @param {Object} analysisData - All gathered analysis data
   * @returns {Object} - Confidence assessment
   */
  calculateConfidenceScore(analysisData) {
    let score = 0;
    let confidenceLevel = "low";
    let factors = [];
    
    // More tasks = higher confidence
    if (analysisData.totalTasksCount >= 30) {
      score += 40;
      factors.push("Large task sample size");
    } else if (analysisData.totalTasksCount >= 15) {
      score += 25;
      factors.push("Moderate task sample size");
    } else if (analysisData.totalTasksCount >= 5) {
      score += 10;
      factors.push("Small task sample size");
    }
    
    // More completed tasks = higher confidence
    if (analysisData.completedTasksCount >= 15) {
      score += 30;
      factors.push("Multiple completed tasks");
    } else if (analysisData.completedTasksCount >= 7) {
      score += 15;
      factors.push("Several completed tasks");
    }
    
    // More diverse categories = higher confidence (to a point)
    const categoryCount = Object.keys(analysisData.categoryCount).length;
    if (categoryCount >= 4) {
      score += 20;
      factors.push("Diverse task categories");
    } else if (categoryCount >= 2) {
      score += 10;
      factors.push("Multiple task categories");
    }
    
    // Determine confidence level
    if (score >= 70) confidenceLevel = "high";
    else if (score >= 40) confidenceLevel = "moderate";
    
    return {
      score,
      confidenceLevel,
      factors
    };
  }
  
  /**
   * Compose the final persona profile based on all analyses
   * 
   * @param {Object} categoryAnalysis - Category distribution analysis
   * @param {Object} patternAnalysis - Work pattern analysis
   * @param {Object} strengthsAnalysis - Strengths analysis
   * @param {Object} confidenceScore - Confidence assessment
   * @param {Object} analysisData - All raw analysis data
   * @returns {Object} - Complete persona profile
   */
  composePersonaProfile(
    categoryAnalysis,
    patternAnalysis,
    strengthsAnalysis,
    confidenceScore,
    analysisData
  ) {
    // Determine base persona type
    let personaType, personaTitle, personaDescription, personaEmoji;
    
    // Check if we have a dominant category or diverse profile
    if (categoryAnalysis.isDominant) {
      // Use dominant category to define persona
      const typeData = this.getPersonaDataByCategory(categoryAnalysis.dominantCategory);
      personaType = typeData.type;
      personaTitle = typeData.title;
      personaDescription = typeData.description;
      personaEmoji = typeData.emoji;
    } else if (categoryAnalysis.isDiverse) {
      // Diverse profile
      personaType = "versatile";
      personaTitle = "Technical Polymath";
      personaDescription = "You adapt to diverse technical challenges across multiple domains. Your flexible skill set allows you to contribute in various capacities.";
      personaEmoji = "🔄";
    } else {
      // Not enough data or no clear pattern
      personaType = "emerging";
      personaTitle = "Emerging Technologist";
      personaDescription = "Your technical profile is still taking shape. As you complete more diverse tasks, your specialized skills will become more apparent.";
      personaEmoji = "🌱";
    }
    
    // Enhance description with work pattern insight if available
    if (!patternAnalysis.insufficient) {
      const patternInsight = this.getWorkPatternInsight(patternAnalysis.workPattern);
      personaDescription += " " + patternInsight;
    }
    
    // Build the full persona object
    const persona = {
      type: personaType,
      title: personaTitle,
      description: personaDescription,
      emoji: personaEmoji,
      distribution: categoryAnalysis.distribution,
      strengths: strengthsAnalysis.strengths,
      workPattern: patternAnalysis.workPattern,
      tasksAnalyzed: analysisData.totalTasksCount,
      completedTasks: analysisData.completedTasksCount,
      confidenceLevel: confidenceScore.confidenceLevel,
      confidenceFactors: confidenceScore.factors,
      lastUpdated: new Date().toISOString()
    };
    
    return persona;
  }
  
  /**
   * Get persona data for a specific category
   * 
   * @param {string} category - Task category
   * @returns {Object} - Persona details for this category
   */
  getPersonaDataByCategory(category) {
    const personaMap = {
      security: {
        type: "security",
        title: "Security Specialist",
        description: "You excel at identifying and mitigating security threats. Your analytical approach helps protect systems and data from vulnerabilities.",
        emoji: "🛡️"
      },
      infrastructure: {
        type: "infrastructure",
        title: "Infrastructure Engineer",
        description: "You build and maintain the foundation that supports all technical operations. Your work enables scalable, reliable technical environments.",
        emoji: "🏗️"
      },
      architecture: {
        type: "architecture",
        title: "Systems Architect",
        description: "You think in systems and structures, designing the blueprints that guide technical implementation. You see the big picture connections.",
        emoji: "🧠"
      },
      development: {
        type: "development",
        title: "Software Developer",
        description: "You transform requirements into functional code with precision and creativity. You build the features that users interact with daily.",
        emoji: "💻"
      },
      networking: {
        type: "networking",
        title: "Network Engineer",
        description: "You specialize in the connectivity that allows systems to communicate. Your expertise ensures data flows seamlessly across the organization.",
        emoji: "🌐"
      },
      "hr process": {
        type: "process",
        title: "Process Manager",
        description: "You focus on the human side of technical operations, ensuring processes work for the people implementing them.",
        emoji: "👥"
      },
      technical: {
        type: "technical",
        title: "Technical Specialist",
        description: "You apply deep technical knowledge to solve complex problems. Your troubleshooting skills quickly identify and resolve issues.",
        emoji: "🔧"
      }
    };
    
    return personaMap[category] || {
      type: "technical",
      title: "Technical Professional",
      description: "You apply your technical skills to address various challenges. Your methodical approach solves problems effectively.",
      emoji: "💼"
    };
  }
  
  /**
   * Get insight text based on work pattern
   * 
   * @param {string} pattern - Work pattern identifier
   * @returns {string} - Insight text
   */
  getWorkPatternInsight(pattern) {
    const insights = {
      standard_hours: "You tend to work during standard business hours, maintaining a consistent schedule.",
      night_owl: "You often work during evening hours, perhaps finding focus when the world quiets down.",
      early_bird: "You're an early riser, tackling technical challenges at the start of the day when focus is high.",
      balanced: "Your work schedule is flexible, adapting to the needs of each task regardless of time."
    };
    
    return insights[pattern] || "";
  }
  
  /**
   * Fallback persona when analysis fails
   * 
   * @returns {Object} - Basic persona object
   */
  getFallbackPersona() {
    return {
      type: "undefined",
      title: "Technical Explorer",
      description: "Your technical profile is still developing. Complete more tasks to reveal your specialized skills and working patterns.",
      emoji: "🔍",
      tasksAnalyzed: 0,
      confidenceLevel: "low"
    };
  }
}

// Create and export a singleton instance
const aiPersonaService = new AIPersonaService();
module.exports = aiPersonaService;