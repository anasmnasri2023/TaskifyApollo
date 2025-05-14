import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import chatSocketService from '../../services/chatSocketService';

const ChatSidebar = memo(({ 
  chatRooms, 
  loading, 
  currentUserId, 
  currentRoomId,
  onCreateNewChat 
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'direct', 'group'
  const { user } = useSelector(state => state.auth);
  const { messages } = useSelector(state => state.chat); // Add this to watch for new messages
  
  // Make sure socket is connected on component mount
  useEffect(() => {
    if (!chatSocketService.socketClient.connected) {
      chatSocketService.setSocketAuth();
      chatSocketService.socketClient.connect();
    }
    
    // Listen for new messages to update unread counts
    const handleNewMessage = (message) => {
      // The sidebar will automatically update because Redux state changes
      console.log("ChatSidebar received new message notification");
    };
    
    // Set up socket listeners
    chatSocketService.socketClient.on('new-message', handleNewMessage);
    
    // Clean up
    return () => {
      chatSocketService.socketClient.off('new-message', handleNewMessage);
    };
  }, []);
  
  // Filter chat rooms by search term and view mode
  const filteredRooms = Array.isArray(chatRooms) ? chatRooms.filter(room => {
    if (!room) return false;
    
    // Filter by view mode
    if (viewMode === 'direct' && !room.isDirectMessage) return false;
    if (viewMode === 'group' && room.isDirectMessage) return false;
    
    // If room name exists, search in it
    if (room.name) {
      return room.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    // If it's a direct message, search in participants' names
    const otherParticipants = room.participants?.filter(p => 
      (p._id !== currentUserId) && (p._id !== user?.id)
    );
    
    if (otherParticipants && otherParticipants.length > 0) {
      return otherParticipants.some(p => 
        (p.fullName && p.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return false;
  }) : [];
  
  // Sort rooms by latest activity
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const aTimestamp = a.lastMessage?.createdAt || a.updatedAt;
    const bTimestamp = b.lastMessage?.createdAt || b.updatedAt;
    return new Date(bTimestamp) - new Date(aTimestamp);
  });
  
  // Get display name for chat
  const getChatDisplayName = (room) => {
    // If it's a direct message, show the other person's name
    if (room.isDirectMessage) {
      const otherParticipant = room.participants?.find(p => 
        p._id !== currentUserId && p._id !== user?.id
      );
      
      if (otherParticipant) {
        return otherParticipant.fullName || otherParticipant.email || 'Unknown User';
      }
      
      return 'Direct Message';
    }
    
    // For group chats, use the room name
    return room.name || 'Chat Room';
  };
  
  // Get last message preview
  const getLastMessagePreview = (room) => {
    if (!room.lastMessage) return 'No messages yet';
    
    const isSentByCurrentUser = room.lastMessage.sender?._id === currentUserId || 
                               room.lastMessage.sender?._id === user?.id;
    const prefix = isSentByCurrentUser ? 'You: ' : '';
    
    // Handle attachments
    if (room.lastMessage.attachments && room.lastMessage.attachments.length > 0) {
      return `${prefix}📎 Attachment`;
    }
    
    // Truncate long messages
    const content = room.lastMessage.content || '';
    return `${prefix}${content.length > 20 
      ? content.substring(0, 20) + '...' 
      : content}`;
  };
  
  // Format time for last message
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours ago
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Less than 7 days ago
    if (diff < 604800000) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    }
    
    // Older than 7 days
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Get unread count for a room
  const getUnreadCount = (room) => {
    if (!room.unreadCount) return 0;
    
    // If unreadCount is an object with userId as keys
    if (typeof room.unreadCount === 'object') {
      return room.unreadCount[currentUserId] || room.unreadCount[user?.id] || 0;
    }
    
    // If unreadCount is a direct property
    return room.unreadCount || 0;
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-stroke dark:border-strokedark flex justify-between items-center">
        <h3 className="text-lg font-semibold text-black dark:text-white">Messages</h3>
        <button
          onClick={onCreateNewChat}
          className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
          title="New Chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
      
      {/* Filter and Search */}
      <div className="p-4 border-b border-stroke dark:border-strokedark">
        {/* Filter Tabs */}
        <div className="flex mb-4 bg-gray-2 dark:bg-meta-4 p-1 rounded-lg">
          <button
            className={`flex-1 py-1 px-2 rounded-md text-xs ${viewMode === 'all' 
              ? 'bg-white dark:bg-boxdark text-primary' 
              : 'text-black dark:text-white'}`}
            onClick={() => setViewMode('all')}
          >
            All
          </button>
          <button
            className={`flex-1 py-1 px-2 rounded-md text-xs ${viewMode === 'direct' 
              ? 'bg-white dark:bg-boxdark text-primary' 
              : 'text-black dark:text-white'}`}
            onClick={() => setViewMode('direct')}
          >
            Direct
          </button>
          <button
            className={`flex-1 py-1 px-2 rounded-md text-xs ${viewMode === 'group' 
              ? 'bg-white dark:bg-boxdark text-primary' 
              : 'text-black dark:text-white'}`}
            onClick={() => setViewMode('group')}
          >
            Groups
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 
              text-black focus:border-primary focus-visible:outline-none dark:border-strokedark 
              dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
        </div>
      </div>
      
      {/* Chat Rooms List */}
      <div className="overflow-y-auto flex-grow">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sortedRooms.length === 0 ? (
          <div className="text-center p-4">
            <p className="text-bodydark mb-4">No conversations found</p>
            <button
              onClick={onCreateNewChat}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-white hover:bg-opacity-90"
            >
              <span className="mr-2">+</span>
              Start New Chat
            </button>
          </div>
        ) : (
          sortedRooms.map((room) => {
            const isActive = currentRoomId === room._id;
            const unreadCount = getUnreadCount(room);
            const isDirectMessage = room.isDirectMessage;
            
            return (
              <div
                key={room._id}
                onClick={() => navigate(`/chat/room/${room._id}`)}
                className={`p-4 border-b border-stroke dark:border-strokedark hover:bg-gray-2 dark:hover:bg-meta-4 cursor-pointer
                  ${isActive ? 'bg-gray-2 dark:bg-meta-4' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white
                      ${isDirectMessage ? 'bg-primary' : 'bg-success'}`}>
                      {isDirectMessage ? (
                        getChatDisplayName(room).charAt(0).toUpperCase()
                      ) : (
                        <span># </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-danger text-xs text-white flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-medium text-black dark:text-white truncate">
                        {getChatDisplayName(room)}
                      </h4>
                      <p className="text-xs text-bodydark2">
                        {formatLastMessageTime(room.lastMessage?.createdAt || room.updatedAt)}
                      </p>
                    </div>
                    <p className="text-xs text-bodydark2 truncate">
                      {getLastMessagePreview(room)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default ChatSidebar;