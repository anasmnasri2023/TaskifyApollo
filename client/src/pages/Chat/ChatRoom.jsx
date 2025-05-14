import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  GetChatRoom, 
  GetMessages, 
  SendMessage, 
  MarkMessagesRead,
  ClearCurrentRoom,
  ClearChatError,
  ShowChatMembers,
  ShowChatInfo,
  ClearChat,
  LeaveChatRoom
} from '../../redux/actions/chatActions';
import chatSocketService from '../../services/chatSocketService';

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Local states
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [attemptedFetch, setAttemptedFetch] = useState(false);
  
  // Redux states
  const { 
    currentRoom, 
    messages, 
    messagesLoading, 
    roomLoading,
    roomError, 
    currentPage,
    totalPages 
  } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);

  // Ensure messages is always an object and get current room's messages
  const messagesList = messages && messages[roomId] ? messages[roomId] : [];
  
  // Initialize the chat room
  useEffect(() => {
    if (roomId) {
      // Clear any previous errors and data when room ID changes
      dispatch(ClearCurrentRoom());
      dispatch(ClearChatError());
      setRoomNotFound(false);
      setAttemptedFetch(false);
      
      // Fetch the chat room data
      dispatch(GetChatRoom(roomId));
      
      // Clean up function
      return () => {
        chatSocketService.leaveChatRoom(roomId);
      };
    }
  }, [dispatch, roomId]);
  
  // Handle room loading/error state
  useEffect(() => {
    if (roomError) {
      console.error('[ChatRoom] Error fetching chat room:', roomError);
      setRoomNotFound(true);
    } else if (currentRoom && currentRoom._id === roomId) {
      // Room found, fetch messages and mark as read
      // Only fetch if we haven't already or if the room ID changed
      if (!attemptedFetch) {
        dispatch(GetMessages(roomId, 1, 20));
        dispatch(MarkMessagesRead(roomId));
        chatSocketService.joinChatRoom(roomId);
        setAttemptedFetch(true);
      }
    }
  }, [dispatch, roomId, currentRoom, roomError, attemptedFetch]);
  
  // Listen for new messages from socket
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message.chatRoom === roomId || message.chatRoomId === roomId) {
        console.log("New message received via socket:", message);
        // Mark messages as read if we're in this room
        dispatch(MarkMessagesRead(roomId));
      }
    };
    
    // Setup socket listener for new messages
    chatSocketService.socketClient.on('new-message', handleNewMessage);
    
    // Clean up
    return () => {
      chatSocketService.socketClient.off('new-message', handleNewMessage);
    };
  }, [dispatch, roomId]);
  
  // Listen for chat cleared event
  useEffect(() => {
    const handleChatCleared = (data) => {
      if (data.roomId === roomId) {
        console.log("Chat cleared event received:", data);
        // Refresh messages
        dispatch(GetMessages(roomId, 1, 20));
      }
    };
    
    // Setup socket listener for chat cleared
    chatSocketService.socketClient.on('chat-cleared', handleChatCleared);
    
    // Clean up
    return () => {
      chatSocketService.socketClient.off('chat-cleared', handleChatCleared);
    };
  }, [dispatch, roomId]);
  
  // Listen for member updates
  useEffect(() => {
    const handleMemberUpdate = (data) => {
      if (data.roomId === roomId) {
        console.log("Member update received:", data);
        // Refresh room data
        dispatch(GetChatRoom(roomId));
      }
    };
    
    // Setup socket listener for member updates
    chatSocketService.socketClient.on('chat-member-update', handleMemberUpdate);
    
    // Clean up
    return () => {
      chatSocketService.socketClient.off('chat-member-update', handleMemberUpdate);
    };
  }, [dispatch, roomId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && messagesList.length > 0 && !loadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesList, loadingMore]);
  
  // Handle typing status
  useEffect(() => {
    // Setup typing event listener
    const handleUserTyping = (data) => {
      if (data.chatRoomId === roomId && data.userId !== user?.id) {
        // Update typing users list
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
    
    // Setup socket listener for typing
    chatSocketService.socketClient.on('user-typing', handleUserTyping);
    
    // Clean up
    return () => {
      chatSocketService.socketClient.off('user-typing', handleUserTyping);
    };
  }, [roomId, user?.id]);
  
  // Clean up typing status after delay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const updatedTypingUsers = { ...typingUsers };
      let changed = false;
      
      Object.keys(updatedTypingUsers).forEach(userId => {
        const typingData = updatedTypingUsers[userId];
        // Remove typing status after 3 seconds of inactivity
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
  
  // Handle outgoing typing status
  useEffect(() => {
    if (isTyping) {
      chatSocketService.setTypingStatus(roomId, true);
      
      // Reset typing status after 3 seconds of no changes
      const timeout = setTimeout(() => {
        setIsTyping(false);
        chatSocketService.setTypingStatus(roomId, false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isTyping, roomId]);
  
  // Render typing indicators
  const renderTypingIndicators = () => {
    const typingUsersList = Object.values(typingUsers)
      .filter(user => user.isTyping)
      .map(user => user.fullName);
    
    if (typingUsersList.length === 0) return null;
    
    if (typingUsersList.length === 1) {
      return (
        <div className="text-xs text-bodydark2 italic">
          {typingUsersList[0]} is typing...
        </div>
      );
    } else if (typingUsersList.length === 2) {
      return (
        <div className="text-xs text-bodydark2 italic">
          {typingUsersList[0]} and {typingUsersList[1]} are typing...
        </div>
      );
    } else {
      return (
        <div className="text-xs text-bodydark2 italic">
          Several people are typing...
        </div>
      );
    }
  };
  
  // Handle message input change
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    
    // Set typing status
    if (!isTyping && e.target.value.trim() !== '') {
      setIsTyping(true);
    } else if (e.target.value.trim() === '') {
      setIsTyping(false);
      chatSocketService.setTypingStatus(roomId, false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Don't send empty messages
    if (newMessage.trim() === '' && !attachment) return;
    
    let attachmentData = null;
    
    // Handle file attachment if any
    if (attachment) {
      try {
        const formData = new FormData();
        formData.append('file', attachment);
        
        // Upload the file to your file server
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
    
    // Pass message parameters as expected by the SendMessage action
    const result = await dispatch(SendMessage(
      roomId, 
      newMessage.trim(), 
      attachmentData ? [attachmentData] : []
    ));
    
    // If message was sent successfully, reset states
    if (result) {
      // Reset states
      setNewMessage('');
      setAttachment(null);
      setIsTyping(false);
      chatSocketService.setTypingStatus(roomId, false);
      
      // Focus on input field after sending
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
      
      // Scroll to bottom after sending a message
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  
  // Handle attachment selection
  const handleAttachmentChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };
  
  // Remove selected attachment
  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Load more messages
  const handleLoadMore = () => {
    if (currentPage < totalPages && !messagesLoading) {
      setLoadingMore(true);
      dispatch(GetMessages(
        roomId, 
        currentPage + 1, 
        20
      )).then(() => {
        setLoadingMore(false);
      });
    }
  };
  
  // Format message time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    // Less than a minute
    if (diffSec < 60) {
      return 'just now';
    }
    
    // Less than an hour
    if (diffMin < 60) {
      return `${diffMin} min ago`;
    }
    
    // Less than a day
    if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    }
    
    // Less than a week
    if (diffDay < 7) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    }
    
    // More than a week
    return date.toLocaleDateString();
  };
  
  // Handle menu items
  const handleViewChatInfo = () => {
    setShowMenu(false);
    dispatch(ShowChatInfo(roomId));
  };
  
  const handleShowMembers = () => {
    setShowMenu(false);
    dispatch(ShowChatMembers(roomId));
  };
  
  const handleClearChat = () => {
    setShowMenu(false);
    dispatch(ClearChat(roomId));
  };
  
  const handleLeaveChat = () => {
    setShowMenu(false);
    if (currentRoom && !currentRoom.isDirectMessage) {
      dispatch(LeaveChatRoom(roomId));
    } else {
      navigate('/chat');
    }
  };
  
  // Render chat header
  const renderChatHeader = () => {
    if (!currentRoom || roomLoading) return null;
    
    const isDirectMessage = currentRoom.isDirectMessage;
    const isGroup = !isDirectMessage && currentRoom.participants?.length > 2;
    
    // Get other participant for direct message
    const getDirectMessagePartner = () => {
      if (isDirectMessage && currentRoom.participants) {
        const otherUser = currentRoom.participants.find(p => 
          p._id !== user?.id
        );
        return otherUser || null;
      }
      return null;
    };
    
    const directMessagePartner = getDirectMessagePartner();
    
    return (
      <div className="flex items-center justify-between p-4 border-b border-stroke dark:border-strokedark">
        <div className="flex items-center">
          <div className={`relative mr-3 h-10 w-10 rounded-full flex items-center justify-center text-white
            ${isDirectMessage ? 'bg-primary' : 'bg-success'}`}>
            {isDirectMessage ? (
              <span>{(directMessagePartner?.fullName || directMessagePartner?.email || 'U').charAt(0).toUpperCase()}</span>
            ) : (
              <span># </span>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              {isDirectMessage 
                ? (directMessagePartner?.fullName || directMessagePartner?.email || 'Direct Message')
                : currentRoom.name}
            </h3>
            {!isDirectMessage && currentRoom.participants && (
              <p className="text-xs text-bodydark2 cursor-pointer hover:underline" 
                 onClick={handleShowMembers}>
                {currentRoom.participants.length} {currentRoom.participants.length === 1 ? 'member' : 'members'}
              </p>
            )}
            {isDirectMessage && (
              <div className="flex items-center text-xs text-bodydark2">
                <span className="w-2 h-2 rounded-full bg-success mr-1"></span>
                <span>Online</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/chat')}
            className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
            title="Back to chats"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-boxdark rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-2 dark:hover:bg-meta-4"
                    onClick={handleViewChatInfo}
                  >
                    View Chat Info
                  </button>
                  {!isDirectMessage && (
                    <button 
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-2 dark:hover:bg-meta-4"
                      onClick={handleShowMembers}
                    >
                      View Members
                    </button>
                  )}
                  <button 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-2 dark:hover:bg-meta-4"
                    onClick={() => setShowMenu(false)}
                  >
                    Mute Notifications
                  </button>
                  {isDirectMessage ? (
                    <button 
                      className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-gray-2 dark:hover:bg-meta-4"
                      onClick={handleClearChat}
                    >
                      Clear Chat
                    </button>
                  ) : (
                    <button 
                      className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-gray-2 dark:hover:bg-meta-4"
                      onClick={handleLeaveChat}
                    >
                      Leave Group
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Check if a message is from the current user
  const isCurrentUserMessage = (message) => {
    return message.sender?._id === user?.id;
  };
  
  // Render a message
  const renderMessage = (message, index, showSender) => {
    const isFromCurrentUser = isCurrentUserMessage(message);
    
    return (
      <div 
        key={message._id || index}
        className={`flex mb-4 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isFromCurrentUser && showSender && (
          <div className="flex-shrink-0 mr-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
              {message.sender?.fullName?.charAt(0) || message.sender?.email?.charAt(0) || 'U'}
            </div>
          </div>
        )}
        
        <div className={`max-w-[70%] ${isFromCurrentUser ? 'order-1' : 'order-2'}`}>
          {showSender && !isFromCurrentUser && (
            <div className="text-xs text-bodydark2 mb-1">
              {message.sender?.fullName || message.sender?.email || 'Unknown User'}
            </div>
          )}
          
          {/* Message content */}
          <div className={`p-3 rounded-lg ${
            isFromCurrentUser 
              ? 'bg-primary text-white' 
              : 'bg-gray-2 dark:bg-meta-4 text-black dark:text-white'
          }`}>
            {message.content && (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2">
                {message.attachments.map((attachment, i) => {
                  const isImage = attachment.contentType?.startsWith('image/');
                  
                  if (isImage) {
                    return (
                      <div key={i} className="mt-2">
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={attachment.url} 
                            alt={attachment.filename}
                            className="max-w-full max-h-48 rounded"
                          />
                        </a>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={i} className="mt-2">
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-2 bg-bodydark2 bg-opacity-10 rounded"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span className="ml-2 text-sm truncate">{attachment.filename}</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className={`text-xs text-bodydark2 mt-1 ${
            isFromCurrentUser ? 'text-right' : 'text-left'
          }`}>
            {formatMessageTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  };
  
  // If room not found, show error message
  if (roomNotFound) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center p-8 bg-white dark:bg-boxdark rounded-lg shadow-sm">
          <h3 className="text-xl font-medium text-danger mb-4">Chat room not found</h3>
          <p className="text-bodydark mb-6">This chat room may have been deleted or you don't have access.</p>
          <button
            onClick={() => navigate('/chat')}
            className="inline-flex items-center justify-center rounded-md bg-primary py-2.5 px-6 text-white hover:bg-opacity-90"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      {renderChatHeader()}
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
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
        
        {/* Loading Indicator */}
        {messagesLoading && !loadingMore && (
          <div className="flex justify-center p-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* No Messages Yet */}
        {!messagesLoading && messagesList.length === 0 && (
          <div className="text-center py-8">
            <p className="text-bodydark2">No messages yet. Start a conversation!</p>
          </div>
        )}
        
        {/* Messages List - Display in chronological order (oldest at top, newest at bottom) */}
        <div className="flex flex-col">
          {/* Sort messages chronologically - oldest first */}
          {[...messagesList].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          ).map((message, index, sortedMessages) => {
            // Determine if we should show the sender
            const isFirstMessageByUser = index === 0 || 
              sortedMessages[index - 1]?.sender?._id !== message.sender?._id;
            
            return renderMessage(message, index, isFirstMessageByUser);
          })}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Typing Indicators */}
      <div className="px-4 h-6">
        {renderTypingIndicators()}
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t border-stroke dark:border-strokedark">
        {/* Attachment Preview */}
        {attachment && (
          <div className="mb-3 p-2 bg-gray-2 dark:bg-meta-4 rounded-md flex justify-between items-center">
            <div className="flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="ml-2 text-sm truncate">{attachment.name}</span>
            </div>
            <button 
              onClick={handleRemoveAttachment}
              className="p-1 hover:bg-gray-3 dark:hover:bg-meta-5 rounded-full"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        {/* Message Form */}
        <form onSubmit={handleSendMessage} className="flex items-center">
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4 mr-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleAttachmentChange}
            className="hidden"
          />
          
          <input
            type="text"
            ref={messageInputRef}
            value={newMessage}
            onChange={handleMessageChange}
            placeholder="Type your message..."
            className="flex-1 py-2 px-4 rounded-full border border-stroke bg-white
              text-black focus:border-primary focus-visible:outline-none dark:border-strokedark 
              dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
          
          <button 
            type="submit"
            disabled={newMessage.trim() === '' && !attachment}
            className="p-2 bg-primary text-white rounded-full ml-2 disabled:opacity-50"
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