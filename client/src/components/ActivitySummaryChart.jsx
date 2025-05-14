// components/ActivitySummaryChart.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActivityStats } from '../redux/actions/activityActions';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area
} from 'recharts';

const ActivitySummaryChart = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { stats, loading, activities } = useSelector(state => state.activity);
  
  const [timeFrame, setTimeFrame] = useState('week');
  const [processedData, setProcessedData] = useState(null);
  
  // Debug: Log what we're getting from Redux
  useEffect(() => {
    console.log('Redux state - stats:', stats);
    console.log('Redux state - activities:', activities);
    console.log('Redux state - loading:', loading);
  }, [stats, activities, loading]);
  
  // Process activities data to generate real statistics
  const processActivitiesData = (activitiesData) => {
    if (!activitiesData || activitiesData.length === 0) {
      console.log('No activities data to process');
      return null;
    }
    
    console.log('Processing activities:', activitiesData.length);
    
    // Initialize counters
    const hourlyMap = {};
    const typeMap = {};
    const weekdayMap = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 
      'Fri': 0, 'Sat': 0, 'Sun': 0
    };
    const categoryMap = {};
    
    // Process each activity
    activitiesData.forEach(activity => {
      // Process hourly distribution
      const date = new Date(activity.timestamp);
      const hour = date.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyMap[hourKey] = (hourlyMap[hourKey] || 0) + 1;
      
      // Process type distribution
      const activityType = activity.actionType || activity.type || 'unknown';
      typeMap[activityType] = (typeMap[activityType] || 0) + 1;
      
      // Process weekday distribution
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      weekdayMap[weekday] = (weekdayMap[weekday] || 0) + 1;
      
      // Process category distribution
      const category = activity.taskCategory || activity.category || 'uncategorized';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });
    
    // Convert maps to arrays for charts
    const hourlyDistribution = Object.keys(hourlyMap)
      .sort()
      .map(hour => ({
        hour,
        count: hourlyMap[hour]
      }));
    
    // Fill in missing hours with 0
    const fullHourlyDistribution = Array.from({ length: 24 }, (_, i) => {
      const hour = `${i.toString().padStart(2, '0')}:00`;
      return {
        hour,
        count: hourlyMap[hour] || 0
      };
    });
    
    const totalActivities = activitiesData.length;
    
    const typeDistribution = Object.entries(typeMap).map(([type, count]) => ({
      type: formatTypeName(type),
      count,
      percentage: ((count / totalActivities) * 100).toFixed(1)
    }));
    
    const weekdayDistribution = Object.entries(weekdayMap).map(([day, count]) => ({
      day,
      count
    }));
    
    const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({
      category: formatCategoryName(category),
      count,
      percentage: ((count / totalActivities) * 100).toFixed(1)
    }));
    
    // Calculate summary statistics
    const today = new Date();
    const todayActivities = activitiesData.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate.toDateString() === today.toDateString();
    }).length;
    
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekActivities = activitiesData.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= weekAgo;
    }).length;
    
    const lastWeekActivities = activitiesData.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      return activityDate >= twoWeeksAgo && activityDate < weekAgo;
    }).length;
    
    const weeklyGrowth = lastWeekActivities > 0 
      ? ((thisWeekActivities - lastWeekActivities) / lastWeekActivities * 100).toFixed(1)
      : 0;
    
    const completedActivities = activitiesData.filter(activity => 
      activity.actionType === 'task_completed' || 
      activity.type === 'task_completed'
    ).length;
    
    const totalTasks = activitiesData.filter(activity => 
      activity.actionType?.includes('task') || 
      activity.type?.includes('task')
    ).length;
    
    const completionRate = totalTasks > 0 
      ? ((completedActivities / totalTasks) * 100).toFixed(1)
      : 0;
    
    // Find most active day
    const mostActiveDay = Object.entries(weekdayMap)
      .sort(([, a], [, b]) => b - a)[0][0];
    
    return {
      hourlyDistribution: fullHourlyDistribution,
      typeDistribution,
      weekdayDistribution,
      categoryDistribution,
      summary: {
        totalActivities,
        todayActivities,
        weeklyGrowth,
        mostActiveDay,
        completionRate
      }
    };
  };
  
  // Helper functions to format names
  const formatTypeName = (type) => {
    const typeMap = {
      'task_created': 'Tasks Created',
      'task_updated': 'Tasks Updated',
      'task_completed': 'Tasks Completed',
      'comment_added': 'Comments Added',
      'project_created': 'Projects Created',
      'login': 'Logins',
      'team_fetch': 'Team Data Fetched',
      'email_sent': 'Emails Sent'
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const formatCategoryName = (category) => {
    if (!category) return 'Uncategorized';
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Load stats when component mounts or time frame changes
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (userId) {
      console.log('Fetching activity stats for user:', userId);
      dispatch(fetchActivityStats(userId, timeFrame));
    }
  }, [dispatch, user, timeFrame]);
  
  // Process activities data when it changes
  useEffect(() => {
    if (activities && activities.length > 0) {
      console.log('Processing activities data...');
      const processed = processActivitiesData(activities);
      setProcessedData(processed);
    } else if (!loading) {
      console.log('No activities data available');
      // If no activities and not loading, use empty state
      setProcessedData(null);
    }
  }, [activities, loading]);
  
  // Colors for charts
  const COLORS = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    dark: '#1f2937',
    light: '#f3f4f6'
  };
  
  const CHART_COLORS = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.warning,
    COLORS.danger,
    COLORS.info
  ];
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-stroke rounded-lg shadow-lg dark:bg-boxdark dark:border-strokedark">
          <p className="text-sm font-medium text-black dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-bodydark dark:text-gray-300">
              {entry.name}: <span className="font-medium" style={{ color: entry.color }}>{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Use real data from stats or activities, with empty state fallback
  const displayData = processedData || stats || null;
  
  // Show empty state if no data
  if (!loading && !displayData) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between border-b border-stroke p-6 dark:border-strokedark">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Activity Analytics Dashboard
          </h4>
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-sm font-medium text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="mb-4 h-16 w-16 text-bodydark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">No Activity Data Available</h3>
            <p className="text-center text-bodydark">
              Complete some tasks or perform activities to see your analytics here.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex flex-wrap items-center justify-between border-b border-stroke p-6 dark:border-strokedark">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Activity Analytics Dashboard
        </h4>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-bodydark">Time Period:</span>
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-sm font-medium text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-bodydark">Loading activity analytics...</p>
          </div>
        ) : (
          <>
            {/* Summary Stats Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-black dark:text-white">
                      {displayData.summary?.totalActivities || 0}
                    </h4>
                    <p className="text-sm font-medium text-bodydark">Total Activities</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-black dark:text-white">
                      {displayData.summary?.weeklyGrowth || 0}%
                    </h4>
                    <p className="text-sm font-medium text-bodydark">Weekly Growth</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                    <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-black dark:text-white">
                      {displayData.summary?.completionRate || 0}%
                    </h4>
                    <p className="text-sm font-medium text-bodydark">Completion Rate</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                    <svg className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-black dark:text-white">
                      {displayData.summary?.mostActiveDay || 'N/A'}
                    </h4>
                    <p className="text-sm font-medium text-bodydark">Most Active Day</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
                    <svg className="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Activity by Hour Chart */}
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h5 className="mb-4 text-lg font-semibold text-black dark:text-white">
                  Activity by Hour of Day
                </h5>
                
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={displayData.hourlyDistribution}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12 }}
                        interval={2}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Activity Types Distribution */}
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h5 className="mb-4 text-lg font-semibold text-black dark:text-white">
                  Activity Types Distribution
                </h5>
                
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayData.typeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percentage }) => `${type}: ${percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {displayData.typeDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Weekly Activity Trend */}
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h5 className="mb-4 text-lg font-semibold text-black dark:text-white">
                  Weekly Activity Trend
                </h5>
                
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={displayData.weekdayDistribution}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke={COLORS.secondary}
                        strokeWidth={3}
                        dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: COLORS.secondary, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Task Categories */}
              <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h5 className="mb-4 text-lg font-semibold text-black dark:text-white">
                  Task Categories Distribution
                </h5>
                
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={displayData.categoryDistribution}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill={COLORS.success}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivitySummaryChart;