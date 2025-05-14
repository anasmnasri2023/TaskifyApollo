// pages/ChatAdmin/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GetOverviewStats } from '../../redux/actions/adminChatActions';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import DefaultLayout from '../../layout/DefaultLayout';
import { UseAuth } from "../../hooks/useAuth";
import { ROLES } from "../../data/roles";
import Breadcrumb from '../../components/Breadcrumb';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Added this for the 'fill' option
} from 'chart.js';
import {
  MessageCircle,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
  Settings
} from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler // Registered the Filler plugin
);

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { overviewStats, loading, error } = useSelector(state => state.admin);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7days');
  
  useEffect(() => {
    dispatch(GetOverviewStats());
  }, [dispatch]);
  
  // Prepare chart data
  const prepareMessageStatsChartData = () => {
    if (!overviewStats?.messageStats || overviewStats.messageStats.length === 0) return null;
    
    const labels = overviewStats.messageStats.map(item => item._id);
    const data = overviewStats.messageStats.map(item => item.count);
    
    return {
      labels,
      datasets: [
        {
          label: 'Messages per Day',
          data,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)', // Reduced opacity for visibility
          borderWidth: 2,
          tension: 0.4,
          fill: true // Now this should work with Filler plugin registered
        }
      ]
    };
  };
  
  const preparePeakActivityChartData = () => {
    if (!overviewStats?.peakActivityHours || overviewStats.peakActivityHours.length === 0) return null;
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const activityData = hours.map(hour => {
      const found = overviewStats.peakActivityHours.find(item => item._id === hour);
      return found ? found.count : 0;
    });
    
    return {
      labels: hours.map(h => `${h}:00`),
      datasets: [
        {
          label: 'Messages by Hour',
          data: activityData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    };
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  if (loading) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Chat Administration" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DefaultLayout>
    );
  }
  
  if (error) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Chat Administration" />
        <div className="flex items-center justify-center h-screen">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }
  
  const hasData = overviewStats && (
    overviewStats.totalRooms > 0 || 
    overviewStats.messageStats?.length > 0 || 
    overviewStats.topRooms?.length > 0
  );
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Chat Administration" />
      
      <div className="flex flex-col gap-10">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-black dark:text-white">Chat Administration</h1>
            <p className="text-sm text-bodydark2">Overview and statistics of your chat system</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="mb-6">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-2 border border-stroke dark:border-strokedark rounded bg-white dark:bg-boxdark text-black dark:text-white"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>
          
          {/* No Data Message */}
          {!hasData && (
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6 mb-6 text-center">
              <MessageCircle className="h-16 w-16 text-bodydark2 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                No Chat Data Available
              </h3>
              <p className="text-bodydark2 mb-4">
                It looks like there are no chat rooms or messages in your system yet.
              </p>
              <Link 
                to="/chatadmin/manage" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Manage Chat Rooms
              </Link>
            </div>
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<MessageCircle className="h-8 w-8 text-primary" />}
              title="Total Rooms"
              value={overviewStats?.totalRooms || 0}
              trend="+12%"
              color="text-primary"
            />
            <StatCard
              icon={<Users className="h-8 w-8 text-success" />}
              title="Active Users"
              value={overviewStats?.activeUsers || 0}
              trend="+5%"
              color="text-success"
            />
            <StatCard
              icon={<TrendingUp className="h-8 w-8 text-warning" />}
              title="Daily Messages"
              value={overviewStats?.messageStats?.reduce((sum, stat) => sum + stat.count, 0) || 0}
              trend="+23%"
              color="text-warning"
            />
            <StatCard
              icon={<Clock className="h-8 w-8 text-info" />}
              title="Avg Response Time"
              value={`${Math.round((overviewStats?.avgResponseTime || 0) / 60000)}min`}
              trend="-8%"
              color="text-info"
            />
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Activity Chart */}
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                Message Activity (Last 30 Days)
              </h3>
              <div className="h-64">
                {prepareMessageStatsChartData() ? (
                  <Line data={prepareMessageStatsChartData()} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-bodydark2">
                    No message activity data available
                  </div>
                )}
              </div>
            </div>
            
            {/* Peak Hours Chart */}
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                Peak Activity Hours
              </h3>
              <div className="h-64">
                {preparePeakActivityChartData() ? (
                  <Bar data={preparePeakActivityChartData()} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-bodydark2">
                    No peak activity data available
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Top Rooms Section */}
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6 mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Most Active Rooms
            </h3>
            {overviewStats?.topRooms?.length > 0 ? (
              <div className="space-y-3">
                {overviewStats.topRooms.map((room) => (
                  <div key={room._id} className="flex items-center justify-between p-3 bg-gray-2 dark:bg-meta-4 rounded">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white mr-3">
                        {room.roomDetails.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-black dark:text-white">
                          {room.roomDetails.name || 'Unnamed Room'}
                        </p>
                        <p className="text-xs text-bodydark2">
                          {room.messageCount} messages
                        </p>
                      </div>
                    </div>
                    <Link 
                      to={`/chatadmin/rooms/${room._id}`}
                      className="text-primary hover:text-primarydark"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-bodydark2 py-4">
                No active rooms found
              </div>
            )}
          </div>
          
          {/* Room Type Distribution */}
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6 mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Room Type Distribution
            </h3>
            {overviewStats?.roomTypeDistribution?.length > 0 ? (
              <div className="flex space-x-8">
                {overviewStats.roomTypeDistribution.map((type) => (
                  <div key={type._id} className="flex-1 text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl font-bold text-primary">
                        {overviewStats.totalRooms > 0 
                          ? Math.round((type.count / overviewStats.totalRooms) * 100)
                          : 0}%
                      </span>
                    </div>
                    <p className="text-sm text-bodydark2">
                      {type._id ? 'Direct Messages' : 'Group Chats'}
                    </p>
                    <p className="text-sm font-medium">
                      {type.count} rooms
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-bodydark2 py-4">
                No room distribution data available
              </div>
            )}
          </div>
          
          {/* Management Actions */}
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Management Actions
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/chatadmin/manage" 
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Settings className="h-5 w-5" />
                Manage Chat Rooms
              </Link>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-stroke text-black dark:text-white rounded-lg hover:bg-stroke/80 transition-colors"
                onClick={() => dispatch(GetOverviewStats())}
              >
                Refresh Statistics
              </button>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, trend, color }) => (
  <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
    <div className="flex items-center justify-between mb-4">
      {icon}
      <span className={`text-sm font-medium ${trend.startsWith('+') ? 'text-success' : 'text-danger'}`}>
        {trend}
      </span>
    </div>
    <h3 className="text-sm text-bodydark2">{title}</h3>
    <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
  </div>
);

export default UseAuth(AdminDashboard, ["ADMIN"]);