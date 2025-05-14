// pages/ChatAdmin/AdminChatManagement.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  GetAllChatRooms, 
  DeactivateChatRoom, 
  ArchiveChatRoom,
  ForceAddUserToRoom,
  DeleteMessages,
  ExportChatData
} from '../../redux/actions/adminChatActions';
import { useNavigate } from 'react-router-dom';
import DefaultLayout from '../../layout/DefaultLayout';
import Breadcrumb from '../../components/Breadcrumb';
import {
  Search,
  Filter,
  Eye,
  Archive,
  Ban,
  Download,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Trash2,
  MessageCircle
} from 'lucide-react';

const AdminChatManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminState = useSelector(state => state.admin);
  const { allChatRooms, roomsPagination, loading, error } = adminState;
  
  console.log('AdminChatManagement - Current admin state:', adminState);
  
  const [filters, setFilters] = useState({
    isActive: '',
    isDirectMessage: '',
    createdAfter: '',
    createdBefore: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  
  useEffect(() => {
    console.log('AdminChatManagement - Fetching chat rooms with filters:', filters);
    dispatch(GetAllChatRooms(filters));
  }, [dispatch, filters]);
  
  useEffect(() => {
    console.log('AdminChatManagement - Received chat rooms:', allChatRooms);
    console.log('AdminChatManagement - Pagination:', roomsPagination);
  }, [allChatRooms, roomsPagination]);
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page on filter change
    }));
  };
  
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };
  
  const handleViewRoom = (roomId) => {
    navigate(`/chatadmin/rooms/${roomId}`);
  };
  
  const handleDeactivateRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to deactivate this room?')) {
      await dispatch(DeactivateChatRoom(roomId));
      dispatch(GetAllChatRooms(filters));
    }
  };
  
  const handleArchiveRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to archive this room?')) {
      await dispatch(ArchiveChatRoom(roomId));
      dispatch(GetAllChatRooms(filters));
    }
  };
  
  const handleExportRoom = async (roomId, format = 'json') => {
    await dispatch(ExportChatData(roomId, format));
  };
  
  const handleAddUser = async () => {
    if (selectedRoom && newUserId) {
      await dispatch(ForceAddUserToRoom(selectedRoom._id, newUserId));
      setShowAddUserModal(false);
      setNewUserId('');
      setSelectedRoom(null);
      dispatch(GetAllChatRooms(filters));
    }
  };
  
  const handleDeleteAllMessages = async (roomId) => {
    if (window.confirm('Are you sure you want to delete ALL messages in this room? This action cannot be undone.')) {
      await dispatch(DeleteMessages(roomId, [], true));
      dispatch(GetAllChatRooms(filters));
    }
  };
  
  // Filter rooms based on search query
  const filteredRooms = allChatRooms?.filter(room => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesName = room.name?.toLowerCase().includes(searchLower);
    const matchesCreator = room.createdBy?.fullName?.toLowerCase().includes(searchLower);
    const matchesParticipant = room.participants?.some(p => 
      p.fullName?.toLowerCase().includes(searchLower) || 
      p.email?.toLowerCase().includes(searchLower)
    );
    
    return matchesName || matchesCreator || matchesParticipant;
  }) || [];
  
  // Debug: Check if filteredRooms is being set correctly
  console.log('AdminChatManagement - Filtered rooms:', filteredRooms);
  
  if (error) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Chat Room Management" />
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error Loading Chat Rooms</p>
            <p>{error}</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Chat Room Management" />
      
      <div className="flex flex-col gap-10">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">Chat Room Management</h1>
              <p className="text-sm text-bodydark2">Manage and monitor all chat rooms</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-bodydark2 h-5 w-5" />
            <input
              type="text"
              placeholder="Search rooms, creators, or participants..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-stroke dark:border-strokedark rounded-lg focus:outline-none focus:border-primary dark:bg-boxdark text-black dark:text-white"
            />
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-default p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    Status
                  </label>
                  <select
                    value={filters.isActive}
                    onChange={(e) => handleFilterChange('isActive', e.target.value)}
                    className="w-full px-3 py-2 border border-stroke dark:border-strokedark rounded dark:bg-meta-4 text-black dark:text-white"
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    Type
                  </label>
                  <select
                    value={filters.isDirectMessage}
                    onChange={(e) => handleFilterChange('isDirectMessage', e.target.value)}
                    className="w-full px-3 py-2 border border-stroke dark:border-strokedark rounded dark:bg-meta-4 text-black dark:text-white"
                  >
                    <option value="">All</option>
                    <option value="false">Group Chat</option>
                    <option value="true">Direct Message</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    Created After
                  </label>
                  <input
                    type="date"
                    value={filters.createdAfter}
                    onChange={(e) => handleFilterChange('createdAfter', e.target.value)}
                    className="w-full px-3 py-2 border border-stroke dark:border-strokedark rounded dark:bg-meta-4 text-black dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    Created Before
                  </label>
                  <input
                    type="date"
                    value={filters.createdBefore}
                    onChange={(e) => handleFilterChange('createdBefore', e.target.value)}
                    className="w-full px-3 py-2 border border-stroke dark:border-strokedark rounded dark:bg-meta-4 text-black dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
          
        
          
          {/* Rooms Table */}
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-default overflow-hidden">
            <table className="min-w-full divide-y divide-stroke dark:divide-strokedark">
              <thead className="bg-gray-2 dark:bg-meta-4">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Room Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-bodydark2 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-boxdark divide-y divide-stroke dark:divide-strokedark">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-bodydark2">
                      No rooms found
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room._id} className="hover:bg-gray-1 dark:hover:bg-meta-4">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white mr-3">
                            {room.isDirectMessage ? 'DM' : room.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-black dark:text-white">
                              {room.name || 'Unnamed Room'}
                            </div>
                            <div className="text-xs text-bodydark2">
                              Created: {new Date(room.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-meta-4 dark:text-gray-200">
                          {room.isDirectMessage ? 'Direct Message' : 'Group Chat'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-bodydark2">
                        {room.createdBy?.fullName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-bodydark2">
                        {room.participants?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-bodydark2">
                        {room.stats?.messageCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          room.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {room.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewRoom(room._id)}
                            className="text-primary hover:text-primary/80"
                            title="View Room"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setShowAddUserModal(true);
                            }}
                            className="text-success hover:text-success/80"
                            title="Add User"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveRoom(room._id)}
                            className="text-warning hover:text-warning/80"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivateRoom(room._id)}
                            className="text-danger hover:text-danger/80"
                            title="Deactivate"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExportRoom(room._id, 'json')}
                            className="text-info hover:text-info/80"
                            title="Export"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAllMessages(room._id)}
                            className="text-danger hover:text-danger/80"
                            title="Delete All Messages"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {roomsPagination?.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-bodydark2">
                Showing {(roomsPagination.page - 1) * roomsPagination.limit + 1} to{' '}
                {Math.min(roomsPagination.page * roomsPagination.limit, roomsPagination.total)} of{' '}
                {roomsPagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(roomsPagination.page - 1)}
                  disabled={roomsPagination.page === 1}
                  className="px-4 py-2 text-sm border border-stroke dark:border-strokedark rounded hover:bg-gray-2 dark:hover:bg-meta-4 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm border border-stroke dark:border-strokedark rounded bg-gray-2 dark:bg-meta-4">
                  Page {roomsPagination.page} of {roomsPagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(roomsPagination.page + 1)}
                  disabled={roomsPagination.page === roomsPagination.pages}
                  className="px-4 py-2 text-sm border border-stroke dark:border-strokedark rounded hover:bg-gray-2 dark:hover:bg-meta-4 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowAddUserModal(false)}></div>
                <div className="relative bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-medium text-black dark:text-white mb-4">
                    Add User to Room
                  </h3>
                  <p className="text-sm text-bodydark2 mb-4">
                    Adding user to: {selectedRoom?.name || 'Unknown Room'}
                  </p>
                  <input
                    type="text"
                    placeholder="Enter User ID"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-stroke dark:border-strokedark rounded mb-4 dark:bg-meta-4 text-black dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddUser}
                      className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
                    >
                      Add User
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

export default AdminChatManagement;