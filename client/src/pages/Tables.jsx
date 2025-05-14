import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DefaultLayout from '../layout/DefaultLayout';
import Breadcrumb from '../components/Breadcrumb';
import UserActivityTable from '../components/UserActivityTable';
import ActivitySummaryChart from '../components/ActivitySummaryChart';
import TaskAnalyticsPanel from '../components/TaskAnalyticsPanel';
import AIInsightsCard from '../components/AIInsightsCard';
import TaskPriorityWizard from '../components/TaskPriorityWizard';
import PersonaAnalyzerCard from '../components/PersonaAnalyzerCard';
import ExportReportCard from '../components/ExportReportCard';
import { 
  fetchUserActivities,
  fetchActivityStats,
  fetchUserPersona,
  fetchTaskPriorities,
  fetchDashboardSummary,
  fetchAllActivityData,
  clearActivityCache
} from '../redux/actions/activityActions';
import { 
  selectActivityInsights, 
  selectPriorityDistribution, 
  selectActivityTimeline 
} from '../redux/reducers/activityReducer';
import { MOCK_PRIORITY, MOCK_STATUS, MOCK_TYPE, MOCK_DATA } from '../data/mock';

const Tables = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // Getting data from Redux
  const { 
    activities, 
    stats, 
    persona, 
    taskPriorities, 
    dashboardSummary, 
    loading, 
    error,
    pendingActivities = []
  } = useSelector((state) => state.activity);
  
  // Using selectors for computed data
  const activityInsights = useSelector(selectActivityInsights);
  const priorityDistribution = useSelector(selectPriorityDistribution);
  const activityTimeline = useSelector(selectActivityTimeline);
  
  // Local state management
  const [lastAction, setLastAction] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [filters, setFilters] = useState({
    actionType: 'all',
    category: 'all',
    priority: 'all',
    search: ''
  });

  // Debug user object to see what's available
  useEffect(() => {
    if (user) {
      console.log('User object structure:', user);
      console.log('Available user properties:', Object.keys(user));
    }
  }, [user]);
  
  // Generate mock activities for when there's no real data
  const getMockActivities = useCallback(() => {
    const mockActions = [
      { action: "Created Task", actionType: "task_created" },
      { action: "Updated Task", actionType: "task_updated" },
      { action: "Completed Task", actionType: "task_completed" },
      { action: "Added Comment", actionType: "comment_added" },
      { action: "Created Project", actionType: "project_created" },
      { action: "Login Successful", actionType: "login" },
    ];
    
    return Array.from({ length: 10 }, (_, index) => {
      const mockType = MOCK_TYPE[Math.floor(Math.random() * MOCK_TYPE.length)];
      const mockPriority = MOCK_PRIORITY[Math.floor(Math.random() * MOCK_PRIORITY.length)];
      const mockStatus = MOCK_STATUS[Math.floor(Math.random() * MOCK_STATUS.length)];
      const mockAction = mockActions[Math.floor(Math.random() * mockActions.length)];
      
      let details = "";
      switch (mockAction.actionType) {
        case "task_created":
          details = `${mockAction.action}: ${mockType.label} for ${MOCK_DATA[0]?.project_name || "Sample Project"} with priority ${mockPriority.label}`;
          break;
        case "task_updated":
          details = `${mockAction.action}: ${mockType.label} - Status changed to ${mockStatus.label}`;
          break;
        case "task_completed":
          details = `${mockAction.action}: ${mockType.label} for ${MOCK_DATA[0]?.client_name || "Sample Client"}`;
          break;
        case "comment_added":
          details = `${mockAction.action} on task: ${mockType.label} in ${MOCK_DATA[0]?.project_name || "Sample Project"}`;
          break;
        case "project_created":
          details = `${mockAction.action}: ${MOCK_DATA[0]?.project_name || "Sample Project"} for client ${MOCK_DATA[0]?.client_name || "Sample Client"}`;
          break;
        case "login":
          details = "Login from Chrome on Windows";
          break;
        default:
          details = `${mockAction.action} related to ${mockType.label}`;
      }
      
      return {
        _id: `mock_${Date.now()}_${index}`,
        user: user?.id || "67bf41edcafb8d0c231f60dd",
        action: mockAction.action,
        actionType: mockAction.actionType,
        details,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        taskCategory: mockType.category,
        taskPriority: mockPriority.label
      };
    });
  }, [user?.id]);

  // Initialize data on mount
  useEffect(() => {
    if (!user?._id && !user?.id) {
      console.log("No user ID available");
      setLastAction("No user ID available");
      return;
    }

    const userId = user._id || user.id;
    console.log("Initializing dashboard for user:", userId);
    setLastAction("Initializing data fetch");

    // Fetch all activity data
    dispatch(fetchAllActivityData(userId))
      .then(() => {
        setLastAction("All data fetched successfully");
        setLastSync(new Date());
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setLastAction(`Error: ${err.message}`);
      });
  }, [dispatch, user]);

  // Handle filtering with debugging
  useEffect(() => {
    const allActivities = activities.length > 0 ? activities : getMockActivities();
    
    // Debug: Log sample activity to see structure
    if (allActivities.length > 0) {
      console.log('Sample activity structure:', allActivities[0]);
      console.log('Available fields:', Object.keys(allActivities[0]));
    }
    
    let filtered = [...allActivities];
    
    // Apply action type filter
    if (filters.actionType !== 'all') {
      console.log('Filtering by actionType:', filters.actionType);
      filtered = filtered.filter(activity => {
        // Check different possible field names
        const activityType = activity.actionType || activity.type || activity.action_type;
        return activityType === filters.actionType;
      });
      console.log('After actionType filter:', filtered.length);
    }
    
    // Apply category filter
    if (filters.category !== 'all') {
      console.log('Filtering by category:', filters.category);
      filtered = filtered.filter(activity => {
        // Check different possible field names
        const category = activity.taskCategory || activity.category || activity.task_category;
        return category === filters.category;
      });
      console.log('After category filter:', filtered.length);
    }
    
    // Apply priority filter  
    if (filters.priority !== 'all') {
      console.log('Filtering by priority:', filters.priority);
      filtered = filtered.filter(activity => {
        // Check different possible field names
        const priority = activity.taskPriority || activity.priority || activity.task_priority;
        return priority === filters.priority;
      });
      console.log('After priority filter:', filtered.length);
    }
    
    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(activity => {
        // Search in all text fields
        const searchableText = [
          activity.action,
          activity.details,
          activity.taskCategory,
          activity.taskPriority,
          activity.actionType
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchableText.includes(searchLower);
      });
    }
    
    console.log('Final filtered activities:', filtered.length);
    setFilteredActivities(filtered);
  }, [activities, filters, getMockActivities]);

  // Force refresh data
  const forceDataLoad = async () => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setLastAction("No user ID available");
      return;
    }

    setLastAction("Starting data refresh...");
    
    try {
      await dispatch(fetchAllActivityData(userId));
      setLastAction("Data refreshed successfully");
      setLastSync(new Date());
    } catch (error) {
      console.error("Error refreshing data:", error);
      setLastAction(`Error: ${error.message}`);
    }
  };

  // Clear cache handler
  const handleClearCache = () => {
    dispatch(clearActivityCache());
    setLastAction("Cache cleared - data will refresh on next fetch");
  };

  // Get display activities (filtered or all)
  const displayActivities = filteredActivities.length > 0 || filters.search || filters.actionType !== 'all' 
    ? filteredActivities 
    : (activities.length > 0 ? activities : getMockActivities());

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading activity data...</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Activity Dashboard" />
      
      {/* Improved Dashboard Controls */}
      <div className="mb-6 rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="text-xl font-semibold text-black dark:text-white">Dashboard Controls</h3>
        </div>
        
        <div className="p-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">User:</p>
              <p className="font-semibold text-black dark:text-white">
                {(() => {
                  // Try different possible username fields
                  if (user?.username) return user.username;
                  if (user?.name) return user.name;
                  if (user?.email) return user.email.split('@')[0]; // Use email prefix if no name
                  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
                  if (user?.firstName) return user.firstName;
                  
                  // If we still don't have a name, show the ID with a note
                  return `User ${user?.id || user?._id || 'Unknown'}`;
                })()}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Activities:</p>
              <p className="font-semibold text-primary">{displayActivities.length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Connection:</p>
              <p className="font-semibold text-success">Online</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Sync:</p>
              <p className="font-semibold text-meta-1">{pendingActivities.length || 0}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={forceDataLoad}
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-2.5 text-white transition hover:bg-opacity-90 disabled:opacity-70"
            >
              {loading ? "Loading..." : "Force Refresh"}
            </button>
            
            <button
              onClick={handleClearCache}
              className="rounded-lg bg-meta-1 px-6 py-2.5 text-white transition hover:bg-opacity-90"
            >
              Clear Cache
            </button>
          </div>

          {/* Working Filters */}
          <div className="mb-4">
            <h4 className="mb-3 text-sm font-medium text-black dark:text-white">Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={filters.actionType}
                onChange={(e) => setFilters({...filters, actionType: e.target.value})}
                className="rounded-lg border border-stroke bg-transparent py-2 px-3 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                <option value="all">All Action Types</option>
                <option value="task_created">Tasks Created</option>
                <option value="task_updated">Tasks Updated</option>
                <option value="task_completed">Tasks Completed</option>
                <option value="comment_added">Comments Added</option>
                <option value="project_created">Projects Created</option>
                <option value="login">Logins</option>
              </select>
              
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="rounded-lg border border-stroke bg-transparent py-2 px-3 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="bug_fix">Bug Fix</option>
                <option value="feature">Feature</option>
                <option value="design">Design</option>
                <option value="documentation">Documentation</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="security">Security</option>
              </select>
              
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="rounded-lg border border-stroke bg-transparent py-2 px-3 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              
              <input
                type="text"
                placeholder="Search activities..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="rounded-lg border border-stroke bg-transparent py-2 px-3 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Last Action: {lastAction || "Ready"} | 
            Last Sync: {lastSync ? lastSync.toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>
      
      {/* Activity insights summary */}
      {activityInsights && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-boxdark p-4 rounded-lg border border-stroke dark:border-strokedark">
            <h4 className="text-sm text-gray-600 dark:text-gray-400">Today's Activities</h4>
            <p className="text-2xl font-bold text-black dark:text-white">{activityInsights.todayCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-boxdark p-4 rounded-lg border border-stroke dark:border-strokedark">
            <h4 className="text-sm text-gray-600 dark:text-gray-400">This Week</h4>
            <p className="text-2xl font-bold text-black dark:text-white">{activityInsights.weekCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-boxdark p-4 rounded-lg border border-stroke dark:border-strokedark">
            <h4 className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</h4>
            <p className="text-2xl font-bold text-black dark:text-white">{activityInsights.completionRate?.toFixed(1) || 0}%</p>
          </div>
          <div className="bg-white dark:bg-boxdark p-4 rounded-lg border border-stroke dark:border-strokedark">
            <h4 className="text-sm text-gray-600 dark:text-gray-400">Activity Trend</h4>
            <p className="text-2xl font-bold text-black dark:text-white capitalize">{activityInsights.activityTrend || 'Stable'}</p>
          </div>
        </div>
      )}
      
      {/* Main dashboard components */}
      <div className="flex flex-col gap-6">
      <UserActivityTable 
          activities={displayActivities}
          filters={filters}
          onFilterChange={setFilters}
        />
         
        <TaskPriorityWizard 
          priorities={taskPriorities} 
          distribution={priorityDistribution}
        />
        
        <ActivitySummaryChart 
          stats={stats} 
          timeline={activityTimeline}
        />

         <AIInsightsCard 
          stats={stats} 
          persona={persona}
          insights={activityInsights}
        />
        <TaskAnalyticsPanel 
          summary={dashboardSummary}
          insights={activityInsights}
        />
        

        <PersonaAnalyzerCard 
          persona={persona} 
          insights={activityInsights}
        />
        <ExportReportCard 
          activities={activities}
          stats={stats}
          persona={persona}
        />
      </div>
    </DefaultLayout>
  );
};

export default Tables;