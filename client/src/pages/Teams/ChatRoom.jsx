import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
    GetMessages, 
    SendMessage, 
    MarkMessagesRead,
    ShowChatMembers,
    ClearChat
} from '../../redux/actions/chatActions';
import chatSocketService from '../../services/chatSocketService';

const ChatRoom = ({ roomId: propRoomId, teamId: propTeamId }) => {
  const { roomId: paramRoomId } = useParams();
  const roomId = propRoomId || paramRoomId;
  const teamId = propTeamId;
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Track initialization state
  const [initialized, setInitialized] = useState(false);
  const isProcessing = useRef(false);
  const lastRoomId = useRef(null);
  
  // Local states
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Redux states
  const currentRoom = useSelector(state => state.chat.currentRoom);
  const messages = useSelector(state => state.chat.messages);
  const messagesLoading = useSelector(state => state.chat.loading);
  const currentPage = useSelector(state => state.chat.currentPage);
  const totalPages = useSelector(state => state.chat.totalPages);
  const user = useSelector(state => state.auth.user);
  const currentTeam = useSelector(state => state.teams._ONE);

  // Get messages for current room
  const messagesList = messages && messages[roomId] ? messages[roomId] : [];
  
  // Initialize chat room
  useEffect(() => {
    const initializeRoom = async () => {
      // Prevent concurrent executions
      if (isProcessing.current) {
        console.log('[ChatRoom] Already processing, skipping...');
        return;
      }
      
      // Skip if we've already initialized this room
      if (roomId === lastRoomId.current && initialized) {
        console.log('[ChatRoom] Already initialized for this room, skipping...');
        return;
      }
      
      // Skip if no roomId
      if (!roomId) {
        console.log('[ChatRoom] No roomId provided, skipping...');
        return;
      }
      
      isProcessing.current = true;
      console.log('[ChatRoom] Starting initialization for room:', roomId);
      
      try {
        // Reset state when changing rooms
        if (roomId !== lastRoomId.current) {
          setInitialized(false);
          lastRoomId.current = roomId;
        }
        
        // Fetch messages
        console.log('[ChatRoom] Fetching messages...');
        await dispatch(GetMessages(roomId, 1, 20));
        
        // Join socket room
        console.log('[ChatRoom] Joining socket room...');
        if (teamId) {
          chatSocketService.joinTeamChatRoom(teamId, roomId);
        } else {
          chatSocketService.joinChatRoom(roomId);
        }
        
        // Mark as initialized
        setInitialized(true);
        console.log('[ChatRoom] Initialization complete');
      } catch (error) {
        console.error('[ChatRoom] Error during initialization:', error);
      } finally {
        isProcessing.current = false;
      }
    };
    
    initializeRoom();
    
    // Cleanup
    return () => {
      if (roomId === lastRoomId.current) {
        console.log('[ChatRoom] Cleanup for room:', roomId);
        if (teamId) {
          chatSocketService.leaveTeamChatRoom(teamId, roomId);
        } else {
          chatSocketService.leaveChatRoom(roomId);
        }
        setInitialized(false);
        lastRoomId.current = null;
        isProcessing.current = false;
      }
    };
  }, [roomId, teamId, dispatch]);
  
  // Mark messages as read
  useEffect(() => {
    if (roomId && initialized && messagesList.length > 0) {
      const timer = setTimeout(() => {
        dispatch(MarkMessagesRead(roomId));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [dispatch, roomId, initialized, messagesList.length]);
  
  // Listen for new messages
  useEffect(() => {
    if (!roomId || !initialized) return;
    
    const handleNewMessage = (message) => {
      if (message.chatRoom === roomId || message.chatRoomId === roomId) {
        console.log("New message received via socket:", message);
        
        // Debounced mark read
        if (!window.markReadTimeout) {
          window.markReadTimeout = setTimeout(() => {
            dispatch(MarkMessagesRead(roomId));
            window.markReadTimeout = null;
          }, 2000);
        }
      }
    };
    
    const eventName = teamId ? 'team-message' : 'new-message';
    chatSocketService.socketClient.on(eventName, handleNewMessage);
    
    return () => {
      chatSocketService.socketClient.off(eventName, handleNewMessage);
      if (window.markReadTimeout) {
        clearTimeout(window.markReadTimeout);
        window.markReadTimeout = null;
      }
    };
  }, [dispatch, roomId, teamId, initialized]);
  
  // Handle typing indicators
  useEffect(() => {
    if (!roomId || !initialized) return;
    
    const handleUserTyping = (data) => {
      if (data.chatRoomId === roomId && data.userId !== user?.id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: {
            isTyping: data.isTyping,
            fullName: data.fullName,
            timestamp: new Date()
          }
        }));
      }
    };
    
    const typingEvent = teamId ? 'team-typing' : 'typing';
    chatSocketService.socketClient.on(typingEvent, handleUserTyping);
    
    return () => {
      chatSocketService.socketClient.off(typingEvent, handleUserTyping);
    };
  }, [roomId, user?.id, teamId, initialized]);
  
  // Clean up old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const updatedTypingUsers = { ...typingUsers };
      let changed = false;
      
      Object.keys(updatedTypingUsers).forEach(userId => {
        const typingData = updatedTypingUsers[userId];
        if (now - new Date(typingData.timestamp) > 3000 && typingData.isTyping) {
          updatedTypingUsers[userId] = {
            ...typingData,
            isTyping: false
          };
          changed = true;
        }
      });
      
      if (changed) {
        setTypingUsers(updatedTypingUsers);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [typingUsers]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && messagesList.length > 0 && !loadingMore && initialized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesList.length, loadingMore, initialized]);
  
  // Event handlers
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && e.target.value.trim() !== '') {
      setIsTyping(true);
      if (teamId) {
        chatSocketService.setTeamTypingStatus(teamId, roomId, true);
      } else {
        chatSocketService.setTypingStatus(roomId, true);
      }
    } else if (e.target.value.trim() === '') {
      setIsTyping(false);
      if (teamId) {
        chatSocketService.setTeamTypingStatus(teamId, roomId, false);
      } else {
        chatSocketService.setTypingStatus(roomId, false);
      }
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (newMessage.trim() === '' && !attachment) return;
    
    let attachmentData = null;
    
    if (attachment) {
      try {
        const formData = new FormData();
        formData.append('file', attachment);
        
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('File upload failed');
        }
        
        const data = await response.json();
        attachmentData = {
          url: data.url,
          filename: attachment.name,
          contentType: attachment.type,
          size: attachment.size
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        return;
      }
    }
    
    const result = await dispatch(SendMessage(
      roomId, 
      newMessage.trim(), 
      attachmentData ? [attachmentData] : []
    ));
    
    if (result) {
      setNewMessage('');
      setAttachment(null);
      setIsTyping(false);
      if (teamId) {
        chatSocketService.setTeamTypingStatus(teamId, roomId, false);
      } else {
        chatSocketService.setTypingStatus(roomId, false);
      }
      
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  };
  
  const handleLoadMore = () => {
    if (currentPage < totalPages && !messagesLoading && initialized) {
      setLoadingMore(true);
      dispatch(GetMessages(roomId, currentPage + 1, 20)).then(() => {
        setLoadingMore(false);
      });
    }
  };
  
  // Helper functions
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
  
  const isCurrentUserMessage = (message) => {
    return message.sender?._id === user?.id;
  };
  
  const renderTypingIndicators = () => {
    const typingUsersList = Object.values(typingUsers)
      .filter(user => user.isTyping)
      .map(user => user.fullName);
    
    if (typingUsersList.length === 0) return null;
    
    return (
      <div className="text-xs text-bodydark2 italic px-4 py-2">
        {typingUsersList.length === 1
          ? `${typingUsersList[0]} is typing...`
          : typingUsersList.length === 2
          ? `${typingUsersList[0]} and ${typingUsersList[1]} are typing...`
          : 'Several people are typing...'}
      </div>
    );
  };
  
  // Loading state
  if (!initialized || messagesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-bodydark2">Loading chat...</p>
      </div>
    );
  }
  
  // Render chat interface
  return (
    <div className="flex flex-col h-full bg-white dark:bg-boxdark">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-stroke dark:border-strokedark bg-white dark:bg-boxdark">
        <div className="flex items-center">
          {/* Back Button */}
          <button 
            onClick={() => navigate(`/teams`)}
            className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4 mr-3"
            title="Back to teams"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          {/* Team Info */}
          <div className="flex items-center">
            <div className="relative mr-3 h-10 w-10 rounded-full flex items-center justify-center overflow-hidden">
              {currentTeam?.pictureprofile ? (
                <img 
                  src={`data:image/png;base64,${currentTeam.pictureprofile}`} 
                  alt="Team" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-white">
                  {currentTeam?.Name?.charAt(0) || 'T'}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {currentTeam?.Name || 'Team Chat'}
              </h3>
              <p className="text-xs text-bodydark2">
                Team Chat
              </p>
            </div>
          </div>
        </div>
        
        {/* Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-boxdark rounded-md shadow-lg z-10 border border-stroke dark:border-strokedark">
              <div className="py-1">
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-2 dark:hover:bg-meta-4"
                  onClick={() => {
                    setShowMenu(false);
                    // Add your clear chat logic here
                    dispatch(ClearChat(roomId));
                  }}
                >
                  Clear Chat History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        {messagesList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-bodydark2">
              Welcome to the team chat! Start a conversation with your team members.
            </p>
          </div>
        ) : (
          <div className="p-4">
            {/* Load More Button */}
            {currentPage < totalPages && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm bg-gray-2 dark:bg-meta-4 rounded-md hover:bg-gray-3 dark:hover:bg-meta-5 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More Messages'}
                </button>
              </div>
            )}
            
            {/* Messages */}
            {[...messagesList].sort((a, b) => 
              new Date(a.createdAt) - new Date(b.createdAt)
            ).map((message, index, sortedMessages) => {
              const showAvatar = index === 0 || 
                sortedMessages[index - 1]?.sender?._id !== message.sender?._id;
                
              return (
                <div 
                  key={message._id || index}
                  className={`flex mb-4 ${isCurrentUserMessage(message) ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar for others' messages */}
                  {!isCurrentUserMessage(message) && showAvatar && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
                        {message.sender?.fullName?.charAt(0) || message.sender?.email?.charAt(0) || 'U'}
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] ${isCurrentUserMessage(message) ? 'order-1' : 'order-2'}`}>
                    {!isCurrentUserMessage(message) && showAvatar && (
                      <div className="text-xs text-bodydark2 mb-1">
                        {message.sender?.fullName || message.sender?.email || 'Unknown User'}
                      </div>
                    )}
                    <div className={`p-3 rounded-lg ${
                      isCurrentUserMessage(message) 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-2 dark:bg-meta-4 text-black dark:text-white'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={`text-xs text-bodydark2 mt-1 ${
                      isCurrentUserMessage(message) ? 'text-right' : 'text-left'
                    }`}>
                      {formatMessageTime(message.createdAt)}
                    </div>
                  </div>
                  
                  {/* Spacer for own messages */}
                  {!isCurrentUserMessage(message) && !showAvatar && (
                    <div className="w-8 mr-3 flex-shrink-0"></div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Typing Indicators */}
      {renderTypingIndicators()}
      
      {/* Message Input */}
      <div className="p-4 border-t border-stroke dark:border-strokedark bg-white dark:bg-boxdark">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
            title="Attach file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
            className="hidden"
          />
          
          <input
            type="text"
            ref={messageInputRef}
            value={newMessage}
            onChange={handleMessageChange}
            placeholder={`Message ${currentTeam?.Name || 'team'}...`}
            className="flex-1 py-2 px-4 rounded-full border border-stroke bg-transparent
              text-black focus:border-primary focus-visible:outline-none dark:border-strokedark 
              dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
          
          <button 
            type="submit"
            disabled={newMessage.trim() === ''}
            className="p-2 bg-primary text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;