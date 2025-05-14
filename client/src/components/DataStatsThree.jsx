import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DataStatsThree = () => {
  const [taskStats, setTaskStats] = useState({
    total: 0,
    byPriority: {},
    byStatus: {},
    byType: {}
  });

  useEffect(() => {
    const fetchTaskStats = async () => {
      try {
        const response = await axios.get('/api/tasks');
        const tasks = response.data.data;
        
        // Calculate statistics
        const stats = {
          total: tasks.length,
          byPriority: {},
          byStatus: {},
          byType: {}
        };

        // Count tasks by priority, status, and type
        tasks.forEach(task => {
          stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
          stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
          stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
        });

        setTaskStats(stats);
      } catch (error) {
        console.error('Error fetching task statistics:', error);
      }
    };

    fetchTaskStats();
  }, []);

  // Calculate percentage change (for demo, you can implement real calculation later)
  const getPercentageChange = (value) => {
    return value > 0 ? '+2%' : '-1.5%';
  };

  return (
    <div>
      <div className='mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-title-sm2 font-bold text-black dark:text-white'>
            Tasks Overview
          </h2>
        </div>

        <div className='flex items-center'>
          <p className='font-medium uppercase text-black dark:text-white'>
            Short by:
          </p>
          <div className='relative z-20 inline-block'>
            <select
              name='#'
              id='#'
              className='relative z-20 inline-flex appearance-none bg-transparent py-1 pl-3 pr-8 font-medium outline-none'
            >
              <option value=''>Current Week</option>
              <option value=''>Last Week</option>
            </select>
            <span className='absolute top-1/2 right-1 z-10 -translate-y-1/2'>
              <svg
                width='18'
                height='18'
                viewBox='0 0 18 18'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M8.99995 12.8249C8.8312 12.8249 8.69058 12.7687 8.54995 12.6562L2.0812 6.2999C1.82808 6.04678 1.82808 5.65303 2.0812 5.3999C2.33433 5.14678 2.72808 5.14678 2.9812 5.3999L8.99995 11.278L15.0187 5.34365C15.2718 5.09053 15.6656 5.09053 15.9187 5.34365C16.1718 5.59678 16.1718 5.99053 15.9187 6.24365L9.44995 12.5999C9.30933 12.7405 9.1687 12.8249 8.99995 12.8249Z'
                  fill='#64748B'
                />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:gap-7.5">
        {/* Total Tasks */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="mb-4 text-title-lg font-bold text-black dark:text-white">
                {taskStats.total}
              </h3>
              <p className="font-medium">Total Tasks</p>
              <span className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-meta-3 p-1 text-xs font-medium text-white">
                  <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.0155 5.24683H9.49366C9.23116 5.24683 9.01241 5.46558 9.01241 5.72808C9.01241 5.99058 9.23116 6.20933 9.49366 6.20933H11.6593L8.85928 8.09058C8.74991 8.17808 8.59678 8.17808 8.46553 8.09058L5.57803 6.18745C5.11866 5.8812 4.54991 5.8812 4.09053 6.18745L0.721783 8.44058C0.503033 8.5937 0.437408 8.89995 0.590533 9.1187C0.678033 9.24995 0.831157 9.33745 1.00616 9.33745C1.09366 9.33745 1.20303 9.31558 1.26866 9.24995L4.65928 6.99683C4.76866 6.90933 4.92178 6.90933 5.05303 6.99683L7.94053 8.92183C8.39991 9.22808 8.96866 9.22808 9.42803 8.92183L12.5124 6.8437V9.27183C12.5124 9.53433 12.7312 9.75308 12.9937 9.75308C13.2562 9.75308 13.4749 9.53433 13.4749 9.27183V5.72808C13.5187 5.46558 13.278 5.24683 13.0155 5.24683Z"
                      fill="white"
                    />
                  </svg>
                  <span>{getPercentageChange(taskStats.total)}</span>
                </span>
                <span className="text-sm font-medium">Since last week</span>
              </span>
            </div>

            <div>
              <svg className="h-17.5 w-17.5 -rotate-90 transform">
                <circle
                  className="text-stroke dark:text-strokedark"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
                <circle
                  className="text-primary"
                  strokeWidth="10"
                  strokeDasharray={30 * 2 * Math.PI}
                  strokeDashoffset={30 * 2 * Math.PI - 60 / 100 * 30 * 2 * Math.PI}
                  strokeLinecap=""
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
              </svg>
            </div>
          </div>
        </div>

       

        {/* Tasks by Status */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="mb-4 text-title-lg font-bold text-black dark:text-white">
                {taskStats.byStatus[3] || 0}
              </h3>
              <p className="font-medium">Completed Tasks</p>
              <span className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-meta-3 p-1 text-xs font-medium text-white">
                  <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.0155 5.24683H9.49366C9.23116 5.24683 9.01241 5.46558 9.01241 5.72808C9.01241 5.99058 9.23116 6.20933 9.49366 6.20933H11.6593L8.85928 8.09058C8.74991 8.17808 8.59678 8.17808 8.46553 8.09058L5.57803 6.18745C5.11866 5.8812 4.54991 5.8812 4.09053 6.18745L0.721783 8.44058C0.503033 8.5937 0.437408 8.89995 0.590533 9.1187C0.678033 9.24995 0.831157 9.33745 1.00616 9.33745C1.09366 9.33745 1.20303 9.31558 1.26866 9.24995L4.65928 6.99683C4.76866 6.90933 4.92178 6.90933 5.05303 6.99683L7.94053 8.92183C8.39991 9.22808 8.96866 9.22808 9.42803 8.92183L12.5124 6.8437V9.27183C12.5124 9.53433 12.7312 9.75308 12.9937 9.75308C13.2562 9.75308 13.4749 9.53433 13.4749 9.27183V5.72808C13.5187 5.46558 13.278 5.24683 13.0155 5.24683Z"
                      fill="white"
                    />
                  </svg>
                  <span>{getPercentageChange(taskStats.byStatus[3] || 0)}</span>
                </span>
                <span className="text-sm font-medium">Since last week</span>
              </span>
            </div>

            <div>
              <svg className="h-17.5 w-17.5 -rotate-90 transform">
                <circle
                  className="text-stroke dark:text-strokedark"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
                <circle
                  className="text-primary"
                  strokeWidth="10"
                  strokeDasharray={30 * 2 * Math.PI}
                  strokeDashoffset={30 * 2 * Math.PI - (taskStats.byStatus[3] || 0) / taskStats.total * 100 / 100 * 30 * 2 * Math.PI}
                  strokeLinecap=""
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Blocked Tasks */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="mb-4 text-title-lg font-bold text-black dark:text-white">
                {taskStats.byStatus[4] || 0}
              </h3>
              <p className="font-medium">Blocked Tasks</p>
              <span className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-meta-3 p-1 text-xs font-medium text-white">
                  <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.0155 5.24683H9.49366C9.23116 5.24683 9.01241 5.46558 9.01241 5.72808C9.01241 5.99058 9.23116 6.20933 9.49366 6.20933H11.6593L8.85928 8.09058C8.74991 8.17808 8.59678 8.17808 8.46553 8.09058L5.57803 6.18745C5.11866 5.8812 4.54991 5.8812 4.09053 6.18745L0.721783 8.44058C0.503033 8.5937 0.437408 8.89995 0.590533 9.1187C0.678033 9.24995 0.831157 9.33745 1.00616 9.33745C1.09366 9.33745 1.20303 9.31558 1.26866 9.24995L4.65928 6.99683C4.76866 6.90933 4.92178 6.90933 5.05303 6.99683L7.94053 8.92183C8.39991 9.22808 8.96866 9.22808 9.42803 8.92183L12.5124 6.8437V9.27183C12.5124 9.53433 12.7312 9.75308 12.9937 9.75308C13.2562 9.75308 13.4749 9.53433 13.4749 9.27183V5.72808C13.5187 5.46558 13.278 5.24683 13.0155 5.24683Z"
                      fill="white"
                    />
                  </svg>
                  <span>{getPercentageChange(taskStats.byStatus[4] || 0)}</span>
                </span>
                <span className="text-sm font-medium">Since last week</span>
              </span>
            </div>

            <div>
              <svg className="h-17.5 w-17.5 -rotate-90 transform">
                <circle
                  className="text-stroke dark:text-strokedark"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
                <circle
                  className="text-primary"
                  strokeWidth="10"
                  strokeDasharray={30 * 2 * Math.PI}
                  strokeDashoffset={30 * 2 * Math.PI - (taskStats.byStatus[4] || 0) / taskStats.total * 100 / 100 * 30 * 2 * Math.PI}
                  strokeLinecap=""
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Tasks To Do */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="mb-4 text-title-lg font-bold text-black dark:text-white">
                {(taskStats.byStatus[0] || 0) + (taskStats.byStatus[1] || 0) + (taskStats.byStatus[2] || 0)}
              </h3>
              <p className="font-medium">Tasks To Do</p>
              <span className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-meta-3 p-1 text-xs font-medium text-white">
                  <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.0155 5.24683H9.49366C9.23116 5.24683 9.01241 5.46558 9.01241 5.72808C9.01241 5.99058 9.23116 6.20933 9.49366 6.20933H11.6593L8.85928 8.09058C8.74991 8.17808 8.59678 8.17808 8.46553 8.09058L5.57803 6.18745C5.11866 5.8812 4.54991 5.8812 4.09053 6.18745L0.721783 8.44058C0.503033 8.5937 0.437408 8.89995 0.590533 9.1187C0.678033 9.24995 0.831157 9.33745 1.00616 9.33745C1.09366 9.33745 1.20303 9.31558 1.26866 9.24995L4.65928 6.99683C4.76866 6.90933 4.92178 6.90933 5.05303 6.99683L7.94053 8.92183C8.39991 9.22808 8.96866 9.22808 9.42803 8.92183L12.5124 6.8437V9.27183C12.5124 9.53433 12.7312 9.75308 12.9937 9.75308C13.2562 9.75308 13.4749 9.53433 13.4749 9.27183V5.72808C13.5187 5.46558 13.278 5.24683 13.0155 5.24683Z"
                      fill="white"
                    />
                  </svg>
                  <span>{getPercentageChange((taskStats.byStatus[0] || 0) + (taskStats.byStatus[1] || 0) + (taskStats.byStatus[2] || 0))}</span>
                </span>
                <span className="text-sm font-medium">Since last week</span>
              </span>
            </div>

            <div>
              <svg className="h-17.5 w-17.5 -rotate-90 transform">
                <circle
                  className="text-stroke dark:text-strokedark"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
                <circle
                  className="text-primary"
                  strokeWidth="10"
                  strokeDasharray={30 * 2 * Math.PI}
                  strokeDashoffset={30 * 2 * Math.PI - ((taskStats.byStatus[0] || 0) + (taskStats.byStatus[1] || 0) + (taskStats.byStatus[2] || 0)) / taskStats.total * 100 / 100 * 30 * 2 * Math.PI}
                  strokeLinecap=""
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="35"
                  cy="35"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataStatsThree;
