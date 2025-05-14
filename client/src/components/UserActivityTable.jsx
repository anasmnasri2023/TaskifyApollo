import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserActivities } from '../redux/actions/activityActions';

const UserActivityTable = ({ activities, filters, onFilterChange }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { loading } = useSelector(state => state.activity);
  
  // Local state for pagination
  const [page, setPage] = useState(1);
  const limit = 8; // Fixed to 8 activities per page
  
  // Use activities prop directly instead of fetching from Redux store
  // This allows parent component to control filtering
  const skip = (page - 1) * limit;
  const displayedActivities = activities.slice(skip, skip + limit);
  
  // Initial fetch happens in parent component now
  // We keep this effect just for initial load if needed
  useEffect(() => {
    if (user?._id && (!activities || activities.length === 0)) {
      console.log(`Initial fetch for user: ${user._id}`);
      dispatch(fetchUserActivities(user._id, 'all', 100, 0, true))
        .then(response => {
          console.log('Initial fetch response:', response);
        })
        .catch(err => {
          console.error('Initial fetch error:', err);
        });
    }
  }, [dispatch, user, activities]);
  
  // Reset page when activities change (due to filtering)
  useEffect(() => {
    setPage(1);
  }, [activities]);
  
  // Get icon for activity type
  const getActivityIcon = (actionType) => {
    if (!actionType) return null;
    
    switch (actionType) {
      case 'task_created':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'task_completed':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'task_updated':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 text-warning">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'login':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info/10 text-info">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'project_created':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-bodydark/10 text-bodydark">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      // If less than a minute ago
      if (diffInSeconds < 60) {
        return 'Just now';
      }
      
      // If less than an hour ago
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      }
      
      // If less than a day ago
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      }
      
      // Otherwise, show full date
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get activity type class for styling
  const getActivityTypeClass = (actionType) => {
    switch (actionType) {
      case 'task_created':
        return 'bg-primary text-primary';
      case 'task_completed':
        return 'bg-success text-success';
      case 'task_updated':
        return 'bg-warning text-warning';
      case 'login':
        return 'bg-info text-info';
      case 'comment_added':
        return 'bg-indigo-100 text-indigo-600';
      case 'project_created':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-bodydark text-bodydark';
    }
  };
  
  // Calculate pagination range
  const totalCount = activities.length || 0;
  const startRange = Math.min((page - 1) * limit + 1, totalCount);
  const endRange = Math.min(page * limit, totalCount);
  const maxPage = Math.ceil(totalCount / limit) || 1;
  
  // Handle pagination navigation
  const handleNextPage = () => {
    if (page < maxPage) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (maxPage <= maxVisiblePages) {
      for (let i = 1; i <= maxPage; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(maxPage);
      } else if (page >= maxPage - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = maxPage - 3; i <= maxPage; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = page - 1; i <= page + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(maxPage);
      }
    }
    
    return pageNumbers;
  };
  
  // Debug logging
  console.log('UserActivityTable Debug:', {
    activitiesLength: activities.length,
    displayedActivitiesLength: displayedActivities.length,
    page,
    skip,
    totalCount,
    maxPage,
    filters // Show current filters in debug
  });
  
  return (
    <div id="user-activity-table" className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="py-6 px-4 md:px-6 xl:px-7.5 flex items-center justify-between border-b border-stroke dark:border-strokedark">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Activity History
        </h4>
        <span className="text-sm text-bodydark">
          Showing {startRange}-{endRange} of {totalCount} activities
          {filters && (filters.actionType !== 'all' || filters.category !== 'all' || filters.priority !== 'all' || filters.search) && (
            <span className="text-primary ml-2">(filtered)</span>
          )}
        </span>
      </div>
      
      {/* Activity Table */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white">
                Activity
              </th>
              <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                Type
              </th>
              <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                Time
              </th>
              <th className="py-4 px-4 font-medium text-black dark:text-white">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && activities.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-6">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <p className="mt-2 text-bodydark">Loading activities...</p>
                </td>
              </tr>
            ) : displayedActivities.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-6 text-bodydark">
                  {activities.length === 0 
                    ? 'No activities found. Complete some tasks to see your activity history.'
                    : filters && (filters.actionType !== 'all' || filters.category !== 'all' || filters.priority !== 'all' || filters.search)
                    ? 'No activities match the current filters.'
                    : 'No activities on this page.'}
                </td>
              </tr>
            ) : (
              displayedActivities.map((activity, index) => (
                <tr key={activity._id || activity.id || `activity-${index}`}>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.actionType || activity.type)}
                      <span className="text-black dark:text-white font-medium">
                        {activity.action || 'Unknown action'}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <span className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${getActivityTypeClass(activity.actionType || activity.type)}`}>
                      {activity.actionType || activity.type ? 
                        (activity.actionType || activity.type).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                        'Unknown'
                      }
                    </span>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <span className="text-black dark:text-white">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {activity.details || 'No details available'}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Enhanced Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between py-4 px-6 border-t border-stroke dark:border-strokedark">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-bodydark">
            Showing {startRange}-{endRange} of {totalCount} entries
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Previous Button */}
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="flex items-center justify-center rounded py-1.5 px-3 border border-stroke bg-transparent text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          {/* Page Numbers */}
          {getPageNumbers().map((pageNumber, index) => (
            <button
              key={index}
              onClick={() => pageNumber !== '...' && setPage(pageNumber)}
              disabled={pageNumber === '...'}
              className={`flex items-center justify-center rounded py-1.5 px-3 border transition-colors ${
                pageNumber === page
                  ? 'bg-primary text-white border-primary'
                  : pageNumber === '...'
                  ? 'border-transparent cursor-default'
                  : 'border-stroke bg-transparent text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4 dark:border-strokedark'
              }`}
            >
              {pageNumber}
            </button>
          ))}
          
          {/* Next Button */}
          <button
            onClick={handleNextPage}
            disabled={page >= maxPage}
            className="flex items-center justify-center rounded py-1.5 px-3 border border-stroke bg-transparent text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark transition-colors"
          >
            Next
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserActivityTable;