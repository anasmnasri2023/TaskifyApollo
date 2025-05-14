// pages/ChatAdmin/RoomDetails.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { GetRoomStats, DeleteMessages, ExportChatData } from '../../redux/actions/adminChatActions';
import { Line, Bar } from 'react-chartjs-2';
import DefaultLayout from '../../layout/DefaultLayout';
import Breadcrumb from '../../components/Breadcrumb';
import {
  ArrowLeft,
  MessageCircle,
  Users,
  Calendar,
  Clock,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const RoomDetails = () => {
  const { roomId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { roomStats, loading, error } = useSelector(state => state.admin);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const currentRoomStats = roomStats[roomId];
  
  useEffect(() => {
    if (roomId) {
      dispatch(GetRoomStats(roomId));
    }
  }, [dispatch, roomId]);
  
  const prepareActivityChartData = () => {
    if (!currentRoomStats?.activityPattern) return null;
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const activityData = hours.map(hour => {
      const found = currentRoomStats.activityPattern.find(item => item._id === hour);
      return found ? found.messageCount : 0;
    });
    
    return {
      labels: hours.map(h => `${h}:00`),
      datasets: [
        {
          label: 'Messages by Hour',
          data: activityData,
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        }
      ]
    };
  };
  
  const prepareUserDistributionChartData = () => {
    if (!currentRoomStats?.messageDistribution) return null;
    
    const labels = currentRoomStats.messageDistribution.map(user => user.userDetails.fullName);
    const data = currentRoomStats.messageDistribution.map(user => user.messageCount);
    
    return {
      labels,
      datasets: [
        {
          label: 'Messages per User',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    };
  };
  
  const handleExport = async (format) => {
    await dispatch(ExportChatData(roomId, format));
  };
  
  const handleDeleteMessages = async () => {
    if (window.confirm('Are you sure you want to delete all messages in this room? This action cannot be undone.')) {
      await dispatch(DeleteMessages(roomId, [], true));
      setShowDeleteModal(false);
      dispatch(GetRoomStats(roomId));
    }
  };
  
  if (loading) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Room Details" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DefaultLayout>
    );
  }
  
  if (error) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Room Details" />
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }
  
  if (!currentRoomStats) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Room Details" />
        <div className="p-6">
          <p>Room not found or statistics not available.</p>
        </div>
      </DefaultLayout>
    );
  }
  
  const room = currentRoomStats.room;
  const stats = currentRoomStats.statistics;
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Room Details" />
      
      <div className="flex flex-col gap-10">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/chatadmin/manage')}
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-meta-4 rounded"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                {room.name || 'Unnamed Room'}
              </h1>
              <p className="text-sm text-bodydark2">
                Created on {new Date(room.createdAt).toLocaleDateString()} by {room.createdBy?.fullName || 'Unknown'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('json')}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded hover:bg-success/90"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded hover:bg-danger/90"
              >
                <Trash2 className="h-4 w-4" />
                Clear Messages
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<MessageCircle className="h-8 w-8 text-primary" />}
              title="Total Messages"
              value={stats?.totalMessages || 0}
              color="text-primary"
            />
            <StatCard
              icon={<Users className="h-8 w-8 text-success" />}
              title="Active Participants"
              value={stats?.uniqueParticipants?.length || 0}
              color="text-success"
            />
            <StatCard
              icon={<Calendar className="h-8 w-8 text-warning" />}
              title="Days Active"
              value={Math.ceil((new Date(stats?.lastMessage || Date.now()) - new Date(stats?.firstMessage || Date.now())) / (1000 * 60 * 60 * 24)) || 0}
              color="text-warning"
            />
            <StatCard
              icon={<Clock className="h-8 w-8 text-info" />}
              title="Avg Message Length"
              value={`${Math.round(stats?.avgMessageLength || 0)} chars`}
              color="text-info"
            />
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Activity Pattern */}
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                Activity Pattern (24h)
              </h3>
              <div className="h-64">
                {prepareActivityChartData() ? (
                  <Bar data={prepareActivityChartData()} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-bodydark2">
                    No activity data available
                  </div>
                )}
              </div>
            </div>
            
            {/* User Distribution */}
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                Message Distribution by User
              </h3>
              <div className="h-64">
                {prepareUserDistributionChartData() ? (
                  <Bar data={prepareUserDistributionChartData()} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-bodydark2">
                    No distribution data available
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Participants List */}
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6 mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Participants
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {room.participants?.map((participant) => (
                <div key={participant._id} className="flex items-center p-3 bg-gray-100 dark:bg-meta-4 rounded">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white mr-3">
                    {participant.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-black dark:text-white">
                      {participant.fullName || 'Unknown User'}
                    </p>
                    <p className="text-xs text-bodydark2">
                      {participant.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Room Info */}
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Room Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-bodydark2">Room Type</label>
                <p className="text-black dark:text-white">
                  {room.isDirectMessage ? 'Direct Message' : 'Group Chat'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-bodydark2">Status</label>
                <p className={`font-medium ${room.isActive ? 'text-success' : 'text-danger'}`}>
                  {room.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-bodydark2">Created Date</label>
                <p className="text-black dark:text-white">
                  {new Date(room.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-bodydark2">Last Updated</label>
                <p className="text-black dark:text-white">
                  {new Date(room.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Delete Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowDeleteModal(false)}></div>
                <div className="relative bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-danger mr-3" />
                    <h3 className="text-lg font-medium text-black dark:text-white">
                      Delete All Messages
                    </h3>
                  </div>
                  <p className="text-sm text-bodydark2 mb-6">
                    This action will permanently delete all messages in this room. This cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteMessages}
                      className="px-4 py-2 text-sm bg-danger text-white rounded hover:bg-danger/90"
                    >
                      Delete All Messages
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6">
    <div className="flex items-center mb-4">
      {icon}
    </div>
    <h3 className="text-sm text-bodydark2">{title}</h3>
    <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
  </div>
);

export default RoomDetails;