import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StorageList = () => {
  const [taskDates, setTaskDates] = useState({
    thisWeek: 0,
    thisMonth: 0
  });

  useEffect(() => {
    const fetchTaskDates = async () => {
      try {
        const response = await axios.get('/api/tasks');
        const tasks = response.data.data;
        
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = {
          thisWeek: tasks.filter(task => new Date(task.createdAt) >= weekStart).length,
          thisMonth: tasks.filter(task => new Date(task.createdAt) >= monthStart).length
        };

        setTaskDates(stats);
      } catch (error) {
        console.error('Error fetching task dates:', error);
      }
    };

    fetchTaskDates();
  }, []);

  return (
    <div className='flex-grow rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5'>
      <div className='flex gap-4'>
        <div className='flex h-11.5 w-11.5 items-center justify-center rounded-md bg-[#F6F6F8] dark:bg-graydark'>
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M16 2V6M8 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z'
              stroke='#3056D3'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>

        <div className='flex-grow'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='font-medium text-black dark:text-white'>This Week</span>
            <span className='text-sm font-medium'>{taskDates.thisWeek} Tasks</span>
          </div>

          <div className='relative h-1.5 w-full rounded-full bg-stroke dark:bg-strokedark'>
            <span 
              className='absolute left-0 block h-1.5 rounded-full bg-primary'
              style={{ width: `${(taskDates.thisWeek / (taskDates.thisMonth || 1)) * 100}%` }}
            ></span>
          </div>
        </div>
      </div>

      <div className='mt-5 flex gap-4'>
        <div className='flex h-11.5 w-11.5 items-center justify-center rounded-md bg-[#F6F6F8] dark:bg-graydark'>
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z'
              stroke='#F2994A'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M16 2V6M8 2V6M3 10H21'
              stroke='#F2994A'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>

        <div className='flex-grow'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='font-medium text-black dark:text-white'>
              This Month
            </span>
            <span className='text-sm font-medium'>{taskDates.thisMonth} Tasks</span>
          </div>

          <div className='relative h-1.5 w-full rounded-full bg-stroke dark:bg-strokedark'>
            <span 
              className='absolute left-0 block h-1.5 rounded-full bg-[#F2994A]'
              style={{ width: '100%' }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StorageList;
