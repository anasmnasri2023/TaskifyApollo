import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActivityStats, fetchDashboardSummary } from '../redux/actions/activityActions';

const AIInsightsCard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { stats, dashboardSummary, loading, error } = useSelector(state => state.activity);
  const [insights, setInsights] = useState([]);
  const [timePeriod, setTimePeriod] = useState('week');
  const [expandedInsight, setExpandedInsight] = useState(null);

  // Load data based on selected time period
  useEffect(() => {
    if (user && user._id) {
      console.log('Fetching data for user:', user._id);
      dispatch(fetchActivityStats(user._id, timePeriod));
      dispatch(fetchDashboardSummary(user._id));
    } else {
      console.warn('User or user._id is undefined:', user);
    }
  }, [dispatch, user, timePeriod]);

  // Generate insights when stats or dashboard summary changes
  useEffect(() => {
    if (!loading) {
      if (error) {
        console.error('Error in activity state:', error);
        setInsights([]);
      } else if (stats && dashboardSummary) {
        console.log('Generating insights with stats:', stats, 'and dashboardSummary:', dashboardSummary);
        const generatedInsights = generateInsights(stats, dashboardSummary, timePeriod);
        const prioritizedInsights = prioritizeInsights(generatedInsights).slice(0, 4);
        setInsights(prioritizedInsights);
      } else {
        console.warn('Missing stats or dashboardSummary:', { stats, dashboardSummary });
        setInsights([]);
      }
    }
  }, [stats, dashboardSummary, loading, error, timePeriod]);

  // Prioritize insights based on relevance or impact
  const prioritizeInsights = (insights) => {
    return insights.sort((a, b) => {
      const priorityMap = {
        overworking: 1,
        low: 2,
        inactive: 3,
        excellent: 4,
        'very-active': 5,
      };
      return (priorityMap[b.type] || 10) - (priorityMap[a.type] || 10);
    });
  };

  // Generate insights with dynamic recommendations
  const generateInsights = (stats, metrics, period) => {
    console.log('Generating insights with:', { stats, metrics, period });
    const insights = [];

    // Productivity Pattern Insight
    if (stats.hourlyDistribution && Array.isArray(stats.hourlyDistribution) && stats.hourlyDistribution.length > 0) {
      console.log('Hourly distribution:', stats.hourlyDistribution);
      const hourlyData = stats.hourlyDistribution;
      const mostActiveHour = hourlyData.reduce(
        (max, hour) => (hour.count > max.count ? hour : max),
        hourlyData[0] || { hour: '00:00', count: 0 }
      );

      const morningHours = hourlyData.slice(5, 12).reduce((sum, h) => sum + h.count, 0);
      const afternoonHours = hourlyData.slice(12, 17).reduce((sum, h) => sum + h.count, 0);
      const eveningHours = hourlyData.slice(17, 23).reduce((sum, h) => sum + h.count, 0);

      let timePattern = 'balanced';
      let timeInsight = '';
      let recommendation = '';

      if (morningHours > afternoonHours && morningHours > eveningHours) {
        timePattern = 'morning';
        timeInsight = `You tend to be most productive in the morning hours during this ${period}.`;
        recommendation = 'Schedule complex tasks in the morning to maximize effectiveness.';
      } else if (afternoonHours > morningHours && afternoonHours > eveningHours) {
        timePattern = 'afternoon';
        timeInsight = `Your productivity peaks during afternoon hours this ${period}.`;
        recommendation = 'Reserve afternoons for collaborative work or meetings.';
      } else if (eveningHours > morningHours && eveningHours > afternoonHours) {
        timePattern = 'evening';
        timeInsight = `You prefer evening work during this ${period}.`;
        recommendation = 'Plan creative or deep thinking tasks for evenings.';
      } else {
        timeInsight = `Your productivity is balanced throughout the day this ${period}.`;
        recommendation = 'Maintain this approach for consistent energy levels.';
      }

      insights.push({
        title: 'Productivity Pattern',
        icon: '⏰',
        content: `Most active around ${mostActiveHour.hour}. ${timeInsight}`,
        recommendation,
        type: timePattern,
      });
    } else {
      console.warn('Missing or invalid hourlyDistribution:', stats.hourlyDistribution);
    }

    // Task Completion Insight
    if (metrics && typeof metrics.completionRate === 'number' && !isNaN(metrics.completionRate)) {
      console.log('Completion rate:', metrics.completionRate);
      let completionInsight = '';
      let completionType = '';
      let recommendation = '';

      if (metrics.completionRate >= 80) {
        completionType = 'excellent';
        completionInsight = `Your task completion rate is excellent (${metrics.completionRate}%).`;
        recommendation = 'Keep up the momentum by setting stretch goals.';
      } else if (metrics.completionRate >= 60) {
        completionType = 'good';
        completionInsight = `You have a good completion rate (${metrics.completionRate}%).`;
        recommendation = 'Balance new tasks with finishing existing ones.';
      } else if (metrics.completionRate >= 40) {
        completionType = 'moderate';
        completionInsight = `Your completion rate is moderate (${metrics.completionRate}%).`;
        recommendation = 'Focus on completing tasks before starting new ones.';
      } else {
        completionType = 'low';
        completionInsight = `Your task completion rate is low (${metrics.completionRate}%).`;
        recommendation = 'Prioritize in-progress tasks to boost completion.';
      }

      insights.push({
        title: 'Task Completion',
        icon: '✅',
        content: completionInsight,
        recommendation,
        type: completionType,
      });
    } else {
      console.warn('Missing or invalid completionRate:', metrics?.completionRate);
    }

    // Work Pattern Insight
    if (stats.weekdayDistribution && period !== 'day' && Array.isArray(stats.weekdayDistribution) && stats.weekdayDistribution.length > 0) {
      console.log('Weekday distribution:', stats.weekdayDistribution);
      const weekdayData = stats.weekdayDistribution;
      const totalActivity = weekdayData.reduce((sum, day) => sum + day.count, 0);
      const avgDailyActivity = totalActivity / weekdayData.length;

      const peakDays = weekdayData
        .filter(day => day.count > avgDailyActivity * 1.5)
        .map(day => day.day);
      const lowDays = weekdayData
        .filter(day => day.count < avgDailyActivity * 0.5 && day.count > 0)
        .map(day => day.day);

      let workPatternInsight = '';
      let patternType = '';
      let recommendation = '';

      if (peakDays.length === 0 && lowDays.length === 0) {
        patternType = 'consistent';
        workPatternInsight = `Your work is consistent throughout the ${period}.`;
        recommendation = 'Maintain this steady pace for sustainability.';
      } else if (peakDays.length >= 2) {
        patternType = 'burst';
        workPatternInsight = `You work in bursts, peaking on ${peakDays.join(' and ')}.`;
        recommendation = 'Spread tasks evenly to avoid burnout.';
      } else if (lowDays.length >= 3) {
        patternType = 'selective';
        workPatternInsight = `Lower activity on ${lowDays.join(', ')}.`;
        recommendation = 'Align low days with your productivity goals.';
      } else if (peakDays.length === 1) {
        patternType = 'peak';
        workPatternInsight = `${peakDays[0]} is your most productive day.`;
        recommendation = 'Schedule key tasks on this day.';
      }

      insights.push({
        title: 'Weekly Work Pattern',
        icon: '📊',
        content: workPatternInsight,
        recommendation,
        type: patternType,
      });
    } else {
      console.warn('Missing or invalid weekdayDistribution:', stats.weekdayDistribution);
    }

    // Task Category Insight
    if (stats.categoryDistribution && Array.isArray(stats.categoryDistribution) && stats.categoryDistribution.length > 0) {
      console.log('Category distribution:', stats.categoryDistribution);
      const topCategory = stats.categoryDistribution[0];
      const totalTasks = stats.categoryDistribution.reduce((sum, cat) => sum + cat.count, 0);
      const topCategoryPercentage = Math.round((topCategory.count / totalTasks) * 100);

      let categoryInsight = '';
      let categoryType = '';
      let recommendation = '';

      if (topCategoryPercentage > 70) {
        categoryType = 'specialized';
        categoryInsight = `${topCategoryPercentage}% of tasks are in ${topCategory.category}.`;
        recommendation = 'Leverage your expertise in this area.';
      } else if (topCategoryPercentage > 50) {
        categoryType = 'focused';
        categoryInsight = `${topCategoryPercentage}% of tasks focus on ${topCategory.category}.`;
        recommendation = 'Balance specialization with variety.';
      } else if (stats.categoryDistribution.length >= 3) {
        categoryType = 'diverse';
        categoryInsight = 'You work across diverse task categories.';
        recommendation = 'Use versatility for cross-functional roles.';
      } else {
        categoryType = 'balanced';
        categoryInsight = `Balanced tasks with ${topCategory.category} leading.`;
        recommendation = 'Maintain this balanced approach.';
      }

      insights.push({
        title: 'Task Category Focus',
        icon: '🔍',
        content: categoryInsight,
        recommendation,
        type: categoryType,
      });
    } else {
      console.warn('Missing or invalid categoryDistribution:', stats.categoryDistribution);
    }

    // Recent Activity Insight
    if (metrics && typeof metrics.activitiesToday === 'number') {
      console.log('Activities today:', metrics.activitiesToday);
      let activityInsight = '';
      let activityType = '';
      let recommendation = '';

      if (metrics.activitiesToday === 0) {
        activityType = 'inactive';
        activityInsight = 'No activity recorded today.';
        recommendation = 'Track your work to maintain consistency.';
      } else if (metrics.activitiesToday > 10) {
        activityType = 'very-active';
        activityInsight = `High activity with ${metrics.activitiesToday} actions today.`;
        recommendation = 'Ensure quality alongside quantity.';
      } else if (metrics.activitiesToday > 5) {
        activityType = 'active';
        activityInsight = `Good activity with ${metrics.activitiesToday} actions today.`;
        recommendation = 'Keep up the steady progress.';
      } else {
        activityType = 'moderate';
        activityInsight = `Moderate activity with ${metrics.activitiesToday} actions today.`;
        recommendation = 'Break tasks into smaller trackable units.';
      }

      insights.push({
        title: "Today's Activity",
        icon: '📈',
        content: activityInsight,
        recommendation,
        type: activityType,
      });
    } else {
      console.warn('Missing or invalid activitiesToday:', metrics?.activitiesToday);
    }

    // Work-Life Balance Insight
    if (stats.hourlyDistribution && Array.isArray(stats.hourlyDistribution) && stats.hourlyDistribution.length > 0) {
      console.log('Work-life balance data:', stats.hourlyDistribution);
      const earlyMorning = stats.hourlyDistribution.slice(0, 6).reduce((sum, h) => sum + h.count, 0);
      const lateNight = stats.hourlyDistribution.slice(22, 24).reduce((sum, h) => sum + h.count, 0);
      const offHours = earlyMorning + lateNight;
      const totalActivity = stats.hourlyDistribution.reduce((sum, h) => sum + h.count, 0);

      if (totalActivity > 0) {
        const offHoursPercentage = Math.round((offHours / totalActivity) * 100);
        let balanceInsight = '';
        let balanceType = '';
        let recommendation = '';

        if (offHoursPercentage > 30) {
          balanceType = 'overworking';
          balanceInsight = `${offHoursPercentage}% of activity is outside standard hours.`;
          recommendation = 'Set clearer work boundaries to avoid burnout.';
        } else if (offHoursPercentage > 15) {
          balanceType = 'flexible';
          balanceInsight = `${offHoursPercentage}% of activity occurs in off-hours.`;
          recommendation = 'Monitor for burnout with this flexibility.';
        } else {
          balanceType = 'balanced';
          balanceInsight = 'You maintain healthy work hours.';
          recommendation = 'Continue prioritizing work-life balance.';
        }

        insights.push({
          title: 'Work-Life Balance',
          icon: '⚖️',
          content: balanceInsight,
          recommendation,
          type: balanceType,
        });
      } else {
        console.warn('No activity for work-life balance calculation');
      }
    } else {
      console.warn('Missing or invalid hourlyDistribution for work-life balance:', stats.hourlyDistribution);
    }

    console.log('Generated insights:', insights);
    return insights;
  };

  // Define accent colors for different insight types
  const getCardAccent = (type) => {
    const accents = {
      morning: { bg: 'bg-amber-500', light: 'bg-amber-100', dark: 'dark:bg-amber-900/20' },
      afternoon: { bg: 'bg-blue-500', light: 'bg-blue-100', dark: 'dark:bg-blue-900/20' },
      evening: { bg: 'bg-indigo-500', light: 'bg-indigo-100', dark: 'dark:bg-indigo-900/20' },
      excellent: { bg: 'bg-emerald-500', light: 'bg-emerald-100', dark: 'dark:bg-emerald-900/20' },
      good: { bg: 'bg-green-500', light: 'bg-green-100', dark: 'dark:bg-green-900/20' },
      moderate: { bg: 'bg-yellow-500', light: 'bg-yellow-100', dark: 'dark:bg-yellow-900/20' },
      low: { bg: 'bg-red-500', light: 'bg-red-100', dark: 'dark:bg-red-900/20' },
      diverse: { bg: 'bg-violet-500', light: 'bg-violet-100', dark: 'dark:bg-violet-900/20' },
      balanced: { bg: 'bg-teal-500', light: 'bg-teal-100', dark: 'dark:bg-teal-900/20' },
      overworking: { bg: 'bg-red-500', light: 'bg-red-100', dark: 'dark:bg-red-900/20' },
      default: { bg: 'bg-gray-500', light: 'bg-gray-100', dark: 'dark:bg-gray-900/20' }
    };
    return accents[type] || accents.default;
  };

  return (
    <div id="ai-insights-card" className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="py-6 px-4 md:px-6 xl:px-7.5 flex flex-wrap items-center justify-between border-b border-stroke dark:border-strokedark">
        <h4 className="text-xl font-semibold text-black dark:text-white flex items-center">
          <span className="mr-2">AI Activity Insights</span>
          <span className="text-primary text-sm bg-primary/10 px-2 py-0.5 rounded-full">Powered by AI</span>
        </h4>
        <div className="flex items-center space-x-4">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="rounded bg-gray-100 dark:bg-meta-4 px-3 py-1 text-sm text-bodydark"
            disabled={loading}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
          <button
            onClick={() => {
              if (user && user._id) {
                dispatch(fetchActivityStats(user._id, timePeriod));
                dispatch(fetchDashboardSummary(user._id));
              }
            }}
            disabled={loading || !user?._id}
            className="inline-flex items-center justify-center rounded-full bg-primary/10 py-2 px-4 text-sm font-medium text-primary hover:bg-opacity-90 disabled:bg-opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analyzing
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Insights
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 xl:p-7.5">
        {error ? (
          <div className="text-center py-16 text-bodydark">
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h4 className="mt-4 text-lg font-medium text-black dark:text-white">Error Loading Insights</h4>
            <p className="mt-2 text-bodydark max-w-md mx-auto">
              We couldn't fetch your activity data. Please try refreshing or contact support if the issue persists.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-bodydark">Analyzing your activity patterns...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-16 text-bodydark">
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-bodydark opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.25m0 0c1.085.258 2.152.426 3.212.5m-3.212-.5a2.25 2.25 0 00-2.25 2.25m0 0c0 .896.168 1.766.5 2.571m0 0a2.25 2.25 0 001.125 1.125m0 0c.85.175 1.726.272 2.616.293m0 0h-.004c1.798 0 3.426-.324 4.624-.894m0 0a3.001 3.001 0 001.504-1.648m0 0c.285-.809.434-1.648.446-2.503m0 0v-.028c0-1.127-.259-2.142-.713-3.028"
                />
              </svg>
            </div>
            <h4 className="mt-4 text-lg font-medium text-black dark:text-white">No Insights Available</h4>
            <p className="mt-2 text-bodydark max-w-md mx-auto">
              We couldn't generate insights from your activity data. Ensure you're tracking tasks regularly, or try a different time period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => {
              const accent = getCardAccent(insight.type);
              const isExpanded = expandedInsight === index;
              
              return (
                <div
                  key={index}
                  className={`group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ${
                    isExpanded ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setExpandedInsight(isExpanded ? null : index)}
                >
                  {/* Left accent stripe */}
                  <div className={`absolute left-0 top-0 h-full w-1 ${accent.bg}`}></div>
                  
                  <div className="p-6 pl-8">
                    {/* Header section */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent.light} ${accent.dark}`}>
                          <span className="text-xl">{insight.icon}</span>
                        </div>
                        <h5 className="text-base font-semibold text-gray-900 dark:text-white">{insight.title}</h5>
                      </div>
                      <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {insight.content}
                    </p>
                    
                    {/* Expandable recommendation */}
                    {insight.recommendation && (
                      <div className={`overflow-hidden transition-all duration-300 ${
                        isExpanded ? 'mt-4 max-h-40 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 text-${accent.bg.replace('bg-', '')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {insight.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-gray-2 dark:bg-meta-4 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-3">
              <h5 className="text-sm font-medium text-black dark:text-white">About AI Insights</h5>
              <p className="mt-1 text-xs text-bodydark">
                These insights are generated by analyzing your activity patterns over the selected time period. They're
                designed to help you understand your work habits and identify opportunities for improvement. The more you
                use Taskify, the more accurate and valuable these insights will become.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCard;