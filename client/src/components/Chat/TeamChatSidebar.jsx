// components/Chat/TeamChatSidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import chatSocketService from '../../services/chatSocketService';

const TeamChatSidebar = ({ team, currentUserId, chatRoomId }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineMembers, setOnlineMembers] = useState(new Set());
  
  // Listen for member online status without reinitializing socket
  useEffect(() => {
    // Socket should already be initialized by parent component
    
    // Listen for member online status
    const handleMemberOnline = (data) => {
      if (data.teamId === team._id) {
        setOnlineMembers(prev => new Set([...prev, data.userId]));
      }
    };
    
    const handleMemberOffline = (data) => {
      if (data.teamId === team._id) {
        setOnlineMembers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };
    
    // Set up socket listeners
    chatSocketService.socketClient.on('member-online', handleMemberOnline);
    chatSocketService.socketClient.on('member-offline', handleMemberOffline);
    
    // Clean up
    return () => {
      chatSocketService.socketClient.off('member-online', handleMemberOnline);
      chatSocketService.socketClient.off('member-offline', handleMemberOffline);
    };
  }, [team._id]);
  
  // Filter members by search term
  const filteredMembers = team.members?.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = member.user?.fullName?.toLowerCase() || '';
    const email = member.user?.email?.toLowerCase() || '';
    return fullName.includes(searchLower) || email.includes(searchLower);
  }) || [];
  
  // Sort members: online first, then by role
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const aOnline = onlineMembers.has(a.user._id);
    const bOnline = onlineMembers.has(b.user._id);
    
    // Online members first
    if (aOnline !== bOnline) {
      return bOnline ? 1 : -1;
    }
    
    // Then by role priority (ADMIN, MANAGER, ENGINEER, GUEST)
    const rolePriority = {
      'ADMIN': 0,
      'MANAGER': 1,
      'ENGINEER': 2,
      'GUEST': 3
    };
    
    const aPriority = rolePriority[a.role] || 4;
    const bPriority = rolePriority[b.role] || 4;
    
    return aPriority - bPriority;
  });
  
  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'text-danger';
      case 'MANAGER':
        return 'text-warning';
      case 'ENGINEER':
        return 'text-primary';
      case 'GUEST':
        return 'text-bodydark2';
      default:
        return 'text-black dark:text-white';
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-boxdark">
      {/* Header */}
      <div className="p-4 border-b border-stroke dark:border-strokedark">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-black dark:text-white">Team Members</h3>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-4 border-b border-stroke dark:border-strokedark">
        <div className="relative">
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-10 pr-4 
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
      
      {/* Members List */}
      <div className="overflow-y-auto flex-grow">
        <div className="p-2">
          <div className="mb-2 px-2">
            <span className="text-xs text-bodydark2 uppercase font-semibold">
              {sortedMembers.length} Members
            </span>
          </div>
          
          {sortedMembers.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-bodydark mb-4">No members found</p>
            </div>
          ) : (
            sortedMembers.map((member) => {
              const isOnline = onlineMembers.has(member.user._id);
              const isCurrentUser = member.user._id === currentUserId;
              
              return (
                <div
                  key={member.user._id}
                  className="p-3 mb-1 rounded-lg hover:bg-gray-2 dark:hover:bg-meta-4 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                        {member.user?.fullName?.charAt(0) || member.user?.email?.charAt(0) || 'U'}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-white dark:border-boxdark"></span>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-black dark:text-white truncate">
                          {member.user?.fullName || member.user?.email}
                        </h4>
                        {isCurrentUser && (
                          <span className="text-xs text-bodydark2">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                        <span className="text-gray-400 dark:text-gray-600">•</span>
                        <span className={`text-xs ${isOnline ? 'text-success' : 'text-bodydark2'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamChatSidebar;