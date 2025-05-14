import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Breadcrumb from '../../components/Breadcrumb'
import DefaultLayout from '../../layout/DefaultLayout'
import ChartOne from '../../components/ChartOne'
import ChartTwo from '../../components/ChartTwo'
import ChartTen from '../../components/ChartTen'
import StorageChart from '../../components/StorageChart'
import StorageList from '../../components/StorageList'
import DataStatsThree from '../../components/DataStatsThree'
import { UseAuth } from "../../hooks/useAuth";
import { ROLES } from "../../data/roles";

const BasicChart = () => {
  const [taskStats, setTaskStats] = useState({
    byPriority: {},
    byStatus: {},
    byType: {},
    totalTasks: 0
  });

  useEffect(() => {
    fetchTaskStats();
  }, []);

  const fetchTaskStats = async () => {
    try {
      const response = await axios.get('/api/tasks');
      const tasks = response.data.data;

      // Calculate statistics
      const stats = {
        byPriority: {'1': 0, '2': 0, '3': 0, '4': 0},
        byStatus: {'1': 0, '2': 0, '3': 0, '4': 0},
        byType: {},
        totalTasks: tasks.length
      };

      tasks.forEach(task => {
        // Count by priority
        stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
        
        // Count by status
        stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
        
        // Count by type
        stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
      });

      setTaskStats(stats);
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  };

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Task Analytics Dashboard' />
      <DataStatsThree />
      <br></br>
      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-6">
          <ChartOne taskStats={taskStats} /> {/* Tasks by Priority */}
        </div>
        <div className="col-span-12 xl:col-span-6">
          <ChartTwo taskStats={taskStats} /> {/* Tasks by Status */}
        </div>
      </div>
      <div className='mt-7.5 grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5'>
        <div className='col-span-12 xl:col-span-8'>
          <ChartTen taskStats={taskStats} /> {/* Tasks by Type */}
        </div>
        <div className='col-span-12 xl:col-span-4'>
          <div className='flex flex-col gap-4 sm:flex-row md:gap-6 xl:flex-col xl:gap-7.5'>
            <StorageChart taskStats={taskStats} />
            <StorageList />
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default UseAuth(
  BasicChart,
  ROLES.filter((r) => r.title != "ENGINEER").map((i) => i.title)
);