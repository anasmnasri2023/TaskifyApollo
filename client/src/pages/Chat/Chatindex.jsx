import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';

// Import actions and services
import { GetChatRooms, ClearCurrentRoom } from '../../redux/actions/chatActions';
import { initializeChatSocket } from '../../services/chatSocketService';

// Import components
import DefaultLayout from '../../layout/DefaultLayout';
import Breadcrumb from '../../components/Breadcrumb';
import ChatRoom from './ChatRoom';
import ChatSidebar from '../../components/Chat/ChatSidebar';
import CreateChatRoom from './CreateChatRoom';

const Chat = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [socketInitialized, setSocketInitialized] = useState(false);
  
  // Get data from Redux store
  const { chatRooms, loading, currentRoom } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);

  // Initialize socket and fetch chat rooms
  useEffect(() => {
    // Initialize socket only once
    if (!socketInitialized) {
      const socket = initializeChatSocket();
      setSocketInitialized(true);
      
      // Listen for silent refresh events
      socket.on('silent-refresh', (data) => {
        console.log('Silent refresh event received in Chat component:', data);
        // Refresh chat rooms without showing loading state
        if (data.type === 'new-message' || 
            data.type === 'messages-read' || 
            data.type === 'new-chat-room' || 
            data.type === 'delete-chat-room') {
          // Get fresh data from server
          dispatch(GetChatRooms());
        }
      });
      
      // Clean up listener on unmount
      return () => {
        socket.off('silent-refresh');
      };
    }
  }, [dispatch, socketInitialized]);
  
  // Fetch chat rooms on initial load
  useEffect(() => {
    dispatch(GetChatRooms());
    
    // Clean up when component unmounts
    return () => {
      // Clear current room when leaving chat page
      dispatch(ClearCurrentRoom());
    };
  }, [dispatch]);

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Chat" />
      
      <div className="flex flex-col gap-10">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-[calc(100vh-240px)]">
            {/* Chat Sidebar */}
            <div className="w-1/4 border-r border-stroke dark:border-strokedark">
              <ChatSidebar 
                chatRooms={chatRooms || []} 
                loading={loading} 
                currentUserId={user?.id}
                currentRoomId={roomId}
                onCreateNewChat={() => navigate('/chat/create')}
              />
            </div>
            
            {/* Chat Content */}
            <div className="w-3/4">
              <Routes>
                <Route index element={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h3 className="text-xl font-medium text-black dark:text-white">
                        Select a chat or start a new conversation
                      </h3>
                      <button
                        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-white hover:bg-opacity-90"
                        onClick={() => navigate('/chat/create')}
                      >
                        Start New Chat
                      </button>
                    </div>
                  </div>
                } />
                <Route path="room/:roomId" element={<ChatRoom />} />
                <Route path="create" element={<CreateChatRoom />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Chat;