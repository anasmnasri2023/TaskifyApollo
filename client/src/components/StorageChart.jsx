import React from 'react';

const StorageChart = ({ taskStats }) => {
  const calculateCompletionPercentage = () => {
    if (!taskStats || !taskStats.byStatus) return 0;
    const completedTasks = taskStats.byStatus['3'] || 0; // Status 3 is for completed tasks
    const totalTasks = taskStats.totalTasks || 0;
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className="relative rounded-sm border border-stroke bg-white py-8 pl-7.5 pr-12 shadow-default dark:border-strokedark dark:bg-boxdark xl:py-11 2xl:pl-12 2xl:pr-16">
      <div className="flex flex-col gap-3 2xsm:flex-row 2xsm:items-center 2xl:gap-9">
        <div className="relative flex items-center justify-center">
          <svg className="h-33 w-33 -rotate-90 transform">
            <circle
              className="text-stroke dark:text-strokedark"
              strokeWidth="16"
              stroke="currentColor"
              fill="transparent"
              r="58"
              cx="66"
              cy="66"
            />
            <circle
              className="text-primary"
              strokeWidth="16"
              strokeDasharray={58 * 2 * Math.PI}
              strokeDashoffset={58 * 2 * Math.PI - completionPercentage / 100 * 58 * 2 * Math.PI}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="58"
              cx="66"
              cy="66"
            />
          </svg>
          <span className="absolute text-xl font-bold text-black dark:text-white">
            {completionPercentage}%
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-black dark:text-white">
            Task Completion
          </h3>
          <p className="mt-3.5 font-medium">
            <span className="text-black dark:text-white">
              {taskStats?.byStatus['3'] || 0}
            </span>
            <span className="text-sm"> Completed</span> /
            <span className="text-black dark:text-white">
              {taskStats?.totalTasks || 0}
            </span>
            <span className="text-sm"> Total Tasks</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StorageChart;
