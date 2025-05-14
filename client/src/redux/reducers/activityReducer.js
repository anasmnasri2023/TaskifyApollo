import {
  FETCH_USER_ACTIVITIES_SUCCESS,
  FETCH_USER_ACTIVITIES_FAIL,
  FETCH_ACTIVITIES_DIRECT_SUCCESS,
  FETCH_ACTIVITIES_DIRECT_FAIL,
  FETCH_ACTIVITIES_DIRECT_REQUEST,
  FETCH_ACTIVITY_STATS_SUCCESS,
  FETCH_ACTIVITY_STATS_FAIL,
  FETCH_ACTIVITY_STATS_REQUEST,
  FETCH_USER_PERSONA_SUCCESS,
  FETCH_USER_PERSONA_FAIL,
  FETCH_USER_PERSONA_REQUEST,
  FETCH_TASK_PRIORITIES_SUCCESS,
  FETCH_TASK_PRIORITIES_FAIL,
  FETCH_TASK_PRIORITIES_REQUEST,
  FETCH_DASHBOARD_SUMMARY_SUCCESS,
  FETCH_DASHBOARD_SUMMARY_FAIL,
  FETCH_DASHBOARD_SUMMARY_REQUEST,
  // New action types for enhanced features
  NEW_ACTIVITY_RECEIVED,
  FETCH_FILTERED_ACTIVITIES_REQUEST,
  FETCH_FILTERED_ACTIVITIES_SUCCESS,
  FETCH_FILTERED_ACTIVITIES_FAIL,
  QUEUE_ACTIVITY,
  SYNC_ACTIVITIES_START,
  SYNC_ACTIVITIES_SUCCESS,
  SYNC_ACTIVITIES_FAIL,
  SET_ONLINE_STATUS,
  CLEAR_ACTIVITY_CACHE,
  UPDATE_ACTIVITY_FILTER,
  ACTIVITY_BATCH_UPDATE,
  SET_REFRESH_INTERVAL,
  UPDATE_USER_PREFERENCES,
  ACTIVITY_ERROR_DISMISSED
} from '../actions/activityActions';

// Enhanced initial state with all the new features
const initialState = {
  // Core activity data
  activities: [],
  stats: null,
  persona: null,
  taskPriorities: [],
  dashboardSummary: null,
  
  // Loading and error states
  loading: false,
  error: null,
  loadingStates: {
    activities: false,
    stats: false,
    persona: false,
    priorities: false,
    dashboard: false,
    sync: false
  },
  
  // Enhanced features
  pendingActivities: [],
  isOnline: navigator.onLine,
  
  // Cache management
  lastFetched: {
    activities: null,
    stats: null,
    persona: null,
    priorities: null,
    dashboard: null
  },
  
  // Filtering and sorting
  filters: {
    actionType: 'all',
    category: '',
    priority: '',
    startDate: null,
    endDate: null,
    search: '',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  },
  
  // Pagination
  pagination: {
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    hasMore: true
  },
  
  // Sync status
  syncStatus: {
    isSyncing: false,
    lastSync: null,
    failedSyncs: 0,
    syncErrors: []
  },
  
  // User preferences
  preferences: {
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    notificationsEnabled: true,
    compactView: false,
    theme: 'light'
  },
  
  // Activity metadata
  metadata: {
    mostActiveHour: null,
    mostActiveDay: null,
    activityTrend: 'stable',
    lastActivityTimestamp: null,
    totalActivitiesCount: 0
  }
};

// Helper function to merge activities without duplicates
const mergeActivities = (currentActivities, newActivities) => {
  const activityMap = new Map();
  
  // Add existing activities to map
  currentActivities.forEach(activity => {
    activityMap.set(activity._id, activity);
  });
  
  // Add or update with new activities
  newActivities.forEach(activity => {
    activityMap.set(activity._id, activity);
  });
  
  // Convert back to array and sort by timestamp
  return Array.from(activityMap.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Helper function to apply filters and sorting
const applyFiltersAndSort = (activities, filters) => {
  let filtered = [...activities];
  
  // Apply action type filter
  if (filters.actionType && filters.actionType !== 'all') {
    filtered = filtered.filter(a => a.actionType === filters.actionType);
  }
  
  // Apply category filter
  if (filters.category) {
    filtered = filtered.filter(a => a.taskCategory === filters.category);
  }
  
  // Apply priority filter
  if (filters.priority) {
    filtered = filtered.filter(a => a.taskPriority === filters.priority);
  }
  
  // Apply date range filter
  if (filters.startDate) {
    filtered = filtered.filter(a => 
      new Date(a.timestamp) >= new Date(filters.startDate)
    );
  }
  
  if (filters.endDate) {
    filtered = filtered.filter(a => 
      new Date(a.timestamp) <= new Date(filters.endDate)
    );
  }
  
  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(a => 
      a.action.toLowerCase().includes(searchLower) ||
      a.details.toLowerCase().includes(searchLower) ||
      (a.taskCategory && a.taskCategory.toLowerCase().includes(searchLower))
    );
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    const aValue = a[filters.sortBy];
    const bValue = b[filters.sortBy];
    
    if (filters.sortBy === 'timestamp') {
      return filters.sortOrder === 'desc' 
        ? new Date(bValue) - new Date(aValue)
        : new Date(aValue) - new Date(bValue);
    }
    
    // Default string comparison
    if (filters.sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });
  
  return filtered;
};

// Enhanced activity reducer
const activityReducer = (state = initialState, action) => {
  switch (action.type) {
    // Loading states with granular control
    case FETCH_ACTIVITIES_DIRECT_REQUEST:
      return {
        ...state,
        loading: true,
        loadingStates: { ...state.loadingStates, activities: true },
        error: null
      };
      
    case FETCH_ACTIVITY_STATS_REQUEST:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, stats: true },
        error: null
      };
      
    case FETCH_USER_PERSONA_REQUEST:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, persona: true },
        error: null
      };
      
    case FETCH_TASK_PRIORITIES_REQUEST:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, priorities: true },
        error: null
      };
      
    case FETCH_DASHBOARD_SUMMARY_REQUEST:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, dashboard: true },
        error: null
      };

    // Success handlers with enhanced data processing
    case FETCH_USER_ACTIVITIES_SUCCESS:
    case FETCH_ACTIVITIES_DIRECT_SUCCESS:
      const mergedActivities = mergeActivities(state.activities, action.payload);
      return {
        ...state,
        activities: mergedActivities,
        loading: false,
        loadingStates: { ...state.loadingStates, activities: false },
        error: null,
        lastFetched: {
          ...state.lastFetched,
          activities: Date.now()
        },
        metadata: {
          ...state.metadata,
          totalActivitiesCount: mergedActivities.length,
          lastActivityTimestamp: mergedActivities[0]?.timestamp || state.metadata.lastActivityTimestamp
        },
        pagination: {
          ...state.pagination,
          hasMore: action.payload.length === state.pagination.pageSize
        }
      };

    case FETCH_ACTIVITY_STATS_SUCCESS:
      return {
        ...state,
        stats: action.payload,
        loadingStates: { ...state.loadingStates, stats: false },
        error: null,
        lastFetched: {
          ...state.lastFetched,
          stats: Date.now()
        },
        metadata: {
          ...state.metadata,
          mostActiveHour: action.payload.mostActiveHour,
          mostActiveDay: action.payload.mostActiveDay,
          activityTrend: action.payload.trend || state.metadata.activityTrend
        }
      };

    case FETCH_USER_PERSONA_SUCCESS:
      return {
        ...state,
        persona: action.payload,
        loadingStates: { ...state.loadingStates, persona: false },
        error: null,
        lastFetched: {
          ...state.lastFetched,
          persona: Date.now()
        }
      };

    case FETCH_TASK_PRIORITIES_SUCCESS:
      return {
        ...state,
        taskPriorities: action.payload,
        loadingStates: { ...state.loadingStates, priorities: false },
        error: null,
        lastFetched: {
          ...state.lastFetched,
          priorities: Date.now()
        }
      };

    case FETCH_DASHBOARD_SUMMARY_SUCCESS:
      return {
        ...state,
        dashboardSummary: action.payload,
        loadingStates: { ...state.loadingStates, dashboard: false },
        error: null,
        lastFetched: {
          ...state.lastFetched,
          dashboard: Date.now()
        }
      };

    // Real-time activity updates
    case NEW_ACTIVITY_RECEIVED:
      // Prevent duplicates
      if (state.activities.some(a => a._id === action.payload._id)) {
        return state;
      }
      
      const updatedActivities = [action.payload, ...state.activities];
      return {
        ...state,
        activities: updatedActivities,
        metadata: {
          ...state.metadata,
          totalActivitiesCount: updatedActivities.length,
          lastActivityTimestamp: action.payload.timestamp
        }
      };

    // Filtered activities
    case FETCH_FILTERED_ACTIVITIES_SUCCESS:
      return {
        ...state,
        activities: action.payload.activities,
        loadingStates: { ...state.loadingStates, activities: false },
        pagination: {
          ...state.pagination,
          totalCount: action.payload.totalCount,
          hasMore: action.payload.hasMore
        },
        filters: action.payload.filters || state.filters
      };

    // Error handlers with specific error tracking
    case FETCH_USER_ACTIVITIES_FAIL:
    case FETCH_ACTIVITIES_DIRECT_FAIL:
      return {
        ...state,
        loading: false,
        loadingStates: { ...state.loadingStates, activities: false },
        error: { type: 'activities', message: action.payload }
      };

    case FETCH_ACTIVITY_STATS_FAIL:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, stats: false },
        error: { type: 'stats', message: action.payload }
      };

    case FETCH_USER_PERSONA_FAIL:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, persona: false },
        error: { type: 'persona', message: action.payload }
      };

    case FETCH_TASK_PRIORITIES_FAIL:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, priorities: false },
        error: { type: 'priorities', message: action.payload }
      };

    case FETCH_DASHBOARD_SUMMARY_FAIL:
      return {
        ...state,
        loadingStates: { ...state.loadingStates, dashboard: false },
        error: { type: 'dashboard', message: action.payload }
      };

    // Offline support
    case QUEUE_ACTIVITY:
      return {
        ...state,
        pendingActivities: [...state.pendingActivities, action.payload]
      };

    case SET_ONLINE_STATUS:
      return {
        ...state,
        isOnline: action.payload
      };

    case SYNC_ACTIVITIES_START:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSyncing: true
        },
        loadingStates: { ...state.loadingStates, sync: true }
      };

    case SYNC_ACTIVITIES_SUCCESS:
      const syncedActivities = mergeActivities(state.activities, action.payload);
      return {
        ...state,
        activities: syncedActivities,
        pendingActivities: [],
        syncStatus: {
          isSyncing: false,
          lastSync: Date.now(),
          failedSyncs: 0,
          syncErrors: []
        },
        loadingStates: { ...state.loadingStates, sync: false }
      };

    case SYNC_ACTIVITIES_FAIL:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSyncing: false,
          failedSyncs: state.syncStatus.failedSyncs + 1,
          syncErrors: [...state.syncStatus.syncErrors, action.payload]
        },
        loadingStates: { ...state.loadingStates, sync: false }
      };

    // Cache management
    case CLEAR_ACTIVITY_CACHE:
      return {
        ...state,
        lastFetched: {
          activities: null,
          stats: null,
          persona: null,
          priorities: null,
          dashboard: null
        }
      };

    // Filter updates
    case UPDATE_ACTIVITY_FILTER:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    // Batch updates for performance
    case ACTIVITY_BATCH_UPDATE:
      return {
        ...state,
        ...action.payload
      };

    // User preferences
    case UPDATE_USER_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };

    // Error dismissal
    case ACTIVITY_ERROR_DISMISSED:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Enhanced selectors for comprehensive insights
export const selectActivityInsights = (state) => {
  const activities = state.activity.activities;
  
  if (!activities || activities.length === 0) return null;
  
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  const last24Hours = activities.filter(a => 
    new Date(a.timestamp).getTime() > oneDayAgo
  );
  
  const last7Days = activities.filter(a => 
    new Date(a.timestamp).getTime() > oneWeekAgo
  );
  
  const last30Days = activities.filter(a => 
    new Date(a.timestamp).getTime() > oneMonthAgo
  );
  
  // Calculate productivity score
  const productivityScore = calculateProductivityScore(last7Days);
  
  // Identify peak hours
  const peakHours = identifyPeakHours(last7Days);
  
  // Category analysis
  const categoryBreakdown = analyzeCategoryDistribution(activities);
  
  return {
    todayCount: last24Hours.length,
    weekCount: last7Days.length,
    monthCount: last30Days.length,
    mostActiveHour: getMostActiveHour(last24Hours),
    mostActiveDay: getMostActiveDay(last7Days),
    topCategories: getTopCategories(activities),
    completionRate: calculateCompletionRate(last30Days),
    averageActivitiesPerDay: last7Days.length / 7,
    activityTrend: calculateActivityTrend(activities),
    productivityScore,
    peakHours,
    categoryBreakdown,
    lastActivityTime: activities[0]?.timestamp,
    streak: calculateActivityStreak(activities)
  };
};

// Comprehensive helper functions
const calculateProductivityScore = (activities) => {
  if (activities.length === 0) return 0;
  
  const completedTasks = activities.filter(a => a.actionType === 'task_completed').length;
  const createdTasks = activities.filter(a => a.actionType === 'task_created').length;
  const totalActions = activities.length;
  
  // Weight different factors
  const completionWeight = 0.4;
  const activityWeight = 0.3;
  const consistencyWeight = 0.3;
  
  const completionScore = createdTasks > 0 ? (completedTasks / createdTasks) * 100 : 0;
  const activityScore = Math.min((totalActions / 50) * 100, 100); // Cap at 50 activities per week
  const consistencyScore = calculateConsistencyScore(activities);
  
  return Math.round(
    completionScore * completionWeight +
    activityScore * activityWeight +
    consistencyScore * consistencyWeight
  );
};

const calculateConsistencyScore = (activities) => {
  const daysWithActivity = new Set(
    activities.map(a => new Date(a.timestamp).toDateString())
  ).size;
  
  return Math.min((daysWithActivity / 7) * 100, 100);
};

const identifyPeakHours = (activities) => {
  const hourCounts = new Array(24).fill(0);
  
  activities.forEach(activity => {
    const hour = new Date(activity.timestamp).getHours();
    hourCounts[hour]++;
  });
  
  // Find top 3 hours
  return hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter(item => item.count > 0);
};

const analyzeCategoryDistribution = (activities) => {
  const categories = activities.reduce((acc, activity) => {
    if (activity.taskCategory) {
      acc[activity.taskCategory] = (acc[activity.taskCategory] || 0) + 1;
    }
    return acc;
  }, {});
  
  const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(categories).map(([category, count]) => ({
    category,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }));
};

const calculateActivityStreak = (activities) => {
  if (activities.length === 0) return 0;
  
  let currentStreak = 0;
  let maxStreak = 0;
  let lastDate = null;
  
  // Sort activities by date (oldest first)
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  sortedActivities.forEach(activity => {
    const activityDate = new Date(activity.timestamp).toDateString();
    
    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const diffDays = Math.floor(
        (new Date(activityDate) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
      );
      
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    
    maxStreak = Math.max(maxStreak, currentStreak);
    lastDate = activityDate;
  });
  
  return maxStreak;
};

// Key helper functions carried over from previous version
const getMostActiveHour = (activities) => {
  const hourCounts = activities.reduce((acc, activity) => {
    const hour = new Date(activity.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});
  
  const sorted = Object.entries(hourCounts).sort(([,a], [,b]) => b - a);
  return sorted[0] ? { hour: parseInt(sorted[0][0]), count: sorted[0][1] } : null;
};

const getMostActiveDay = (activities) => {
  const dayCounts = activities.reduce((acc, activity) => {
    const day = new Date(activity.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  
  const sorted = Object.entries(dayCounts).sort(([,a], [,b]) => b - a);
  return sorted[0] ? { day: sorted[0][0], count: sorted[0][1] } : null;
};

const getTopCategories = (activities) => {
  const categoryCounts = activities.reduce((acc, activity) => {
    if (activity.taskCategory) {
      acc[activity.taskCategory] = (acc[activity.taskCategory] || 0) + 1;
    }
    return acc;
  }, {});
  
  return Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
};

const calculateCompletionRate = (activities) => {
  const taskActivities = activities.filter(a => 
    ['task_created', 'task_completed'].includes(a.actionType)
  );
  
  const created = taskActivities.filter(a => a.actionType === 'task_created').length;
  const completed = taskActivities.filter(a => a.actionType === 'task_completed').length;
  
  return created > 0 ? (completed / created) * 100 : 0;
};

const calculateActivityTrend = (activities) => {
  if (activities.length < 14) return 'insufficient_data';
  
  const thisWeek = activities.filter(a => {
    const timestamp = new Date(a.timestamp).getTime();
    return timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;
  
  const lastWeek = activities.filter(a => {
    const timestamp = new Date(a.timestamp).getTime();
    return timestamp > Date.now() - 14 * 24 * 60 * 60 * 1000 &&
           timestamp <= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;
  
  if (lastWeek === 0) return 'increasing';
  
  const changePercent = ((thisWeek - lastWeek) / lastWeek) * 100;
  
  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
};

// Enhanced selectors
export const selectFilteredActivities = (state) => {
  const { activities, filters } = state.activity;
  return applyFiltersAndSort(activities, filters);
};

export const selectPriorityDistribution = (state) => {
  const priorities = state.activity.taskPriorities;
  if (!priorities || priorities.length === 0) return null;
  
  const total = priorities.reduce((sum, p) => sum + p.count, 0);
  
  return priorities.map(p => ({
    ...p,
    percentage: total > 0 ? (p.count / total) * 100 : 0,
    trending: calculatePriorityTrend(p, state.activity.activities)
  }));
};

const calculatePriorityTrend = (priority, activities) => {
  const recentActivities = activities.filter(a => 
    new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  const priorityCount = recentActivities.filter(a => 
    a.taskPriority === priority.priority.toLowerCase()
  ).length;
  
  // Compare to historical average
  const historicalAverage = priority.count / 30; // Assuming 30 days of data
  const currentRate = priorityCount / 7;
  
  if (currentRate > historicalAverage * 1.1) return 'increasing';
  if (currentRate < historicalAverage * 0.9) return 'decreasing';
  return 'stable';
};

export const selectActivityTimeline = (state) => {
  const activities = state.activity.activities;
  if (!activities || activities.length === 0) return [];
  
  // Group activities by date
  const timeline = activities.reduce((acc, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {});
  
  // Convert to array with additional metrics
  return Object.entries(timeline)
    .map(([date, activities]) => ({
      date,
      activities,
      count: activities.length,
      categories: [...new Set(activities.map(a => a.taskCategory).filter(Boolean))],
      completionRate: calculateCompletionRate(activities),
      productivity: calculateDailyProductivityScore(activities)
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const calculateDailyProductivityScore = (activities) => {
  const completed = activities.filter(a => a.actionType === 'task_completed').length;
  const total = activities.length;
  
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

export const selectSyncStatus = (state) => {
  const { syncStatus, pendingActivities, isOnline } = state.activity;
  
  return {
    ...syncStatus,
    pendingCount: pendingActivities.length,
    isOnline,
    canSync: isOnline && pendingActivities.length > 0,
    syncHealth: calculateSyncHealth(syncStatus)
  };
};

const calculateSyncHealth = (syncStatus) => {
  if (syncStatus.failedSyncs === 0) return 'excellent';
  if (syncStatus.failedSyncs < 3) return 'good';
  if (syncStatus.failedSyncs < 5) return 'fair';
  return 'poor';
};

export const selectActivityMetrics = (state) => {
  const { activities, metadata } = state.activity;
  const insights = selectActivityInsights(state);
  
  if (!insights) return null;
  
  return {
    ...metadata,
    ...insights,
    efficiency: calculateEfficiencyMetric(activities),
    collaboration: calculateCollaborationScore(activities),
    workload: calculateWorkloadDistribution(activities)
  };
};

const calculateEfficiencyMetric = (activities) => {
  const taskActivities = activities.filter(a => 
    a.actionType.includes('task_')
  );
  
  const updates = taskActivities.filter(a => a.actionType === 'task_updated').length;
  const completions = taskActivities.filter(a => a.actionType === 'task_completed').length;
  
  // Fewer updates per completion indicates higher efficiency
  return completions > 0 ? Math.round((completions / (updates + completions)) * 100) : 0;
};

const calculateCollaborationScore = (activities) => {
  const commentActivities = activities.filter(a => a.actionType === 'comment_added').length;
  const teamActivities = activities.filter(a => a.actionType.includes('team_')).length;
  
  return Math.min(((commentActivities + teamActivities) / activities.length) * 100, 100);
};

const calculateWorkloadDistribution = (activities) => {
  const workloadByDay = {};
  
  activities.forEach(activity => {
    const day = new Date(activity.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
    workloadByDay[day] = (workloadByDay[day] || 0) + 1;
  });
  
  return workloadByDay;
};

export default activityReducer;