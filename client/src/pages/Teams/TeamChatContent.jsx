import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

// Import actions and services
import { GetChatRoom, ClearCurrentRoom } from '../../redux/actions/chatActions';
import { initializeChatSocket } from '../../services/chatSocketService';
import { GetTeamAction } from '../../redux/actions/teams';

// Import components
import ChatRoom from './ChatRoom';
import TeamChatSidebar from '../../components/Chat/TeamChatSidebar';

const TeamChatContent = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { teamId } = useParams();
  
  // Track initialization state
  const [initState, setInitState] = useState({
    socketInitialized: false,
    teamFetched: false,
    roomFetched: false,
    error: null
  });
  
  // Track if we're currently processing
  const isProcessing = useRef(false);
  const lastTeamId = useRef(null);
  
  // Get data from Redux store
  const currentRoom = useSelector(state => state.chat.currentRoom);
  const currentTeam = useSelector(state => state.teams._ONE);
  const user = useSelector(state => state.auth.user);

  // Initialize socket only once
  useEffect(() => {
    if (!initState.socketInitialized) {
      console.log('[TeamChat] Initializing socket...');
      initializeChatSocket();
      setInitState(prev => ({ ...prev, socketInitialized: true }));
    }
  }, [initState.socketInitialized]);
  
  // Initialize team and chat room
  useEffect(() => {
    const initialize = async () => {
      // Prevent concurrent executions
      if (isProcessing.current) {
        console.log('[TeamChat] Already processing, skipping...');
        return;
      }
      
      // Skip if we've already loaded this team
      if (teamId === lastTeamId.current && initState.teamFetched && initState.roomFetched) {
        console.log('[TeamChat] Already initialized for this team, skipping...');
        return;
      }
      
      // Skip if no teamId or user
      if (!teamId || !user) {
        console.log('[TeamChat] Missing teamId or user, skipping...');
        return;
      }
      
      isProcessing.current = true;
      console.log('[TeamChat] Starting initialization for team:', teamId);
      
      try {
        // Reset state when changing teams
        if (teamId !== lastTeamId.current) {
          setInitState(prev => ({
            ...prev,
            teamFetched: false,
            roomFetched: false,
            error: null
          }));
          lastTeamId.current = teamId;
        }
        
        // Step 1: Fetch team if not already fetched
        if (!initState.teamFetched || currentTeam?._id !== teamId) {
          console.log('[TeamChat] Fetching team data...');
          const teamResult = await dispatch(GetTeamAction(teamId));
          
          if (!teamResult || !teamResult.team) {
            throw new Error('Failed to load team data');
          }
          
          setInitState(prev => ({ ...prev, teamFetched: true }));
        }
        
        // Step 2: Check membership
        const team = currentTeam?._id === teamId ? currentTeam : null;
        if (!team) {
          // Wait for team data to be available in Redux store
          console.log('[TeamChat] Waiting for team data in Redux store...');
          isProcessing.current = false;
          return;
        }
        
        const isMember = team.members?.some(
          member => (member.user?._id || member.user) === user.id
        );
        
        if (!isMember) {
          console.log('[TeamChat] User is not a member, redirecting...');
          navigate('/teams');
          isProcessing.current = false;
          return;
        }
        
        // Step 3: Get chat room ID
        const roomId = team.chatRoom?._id || team.chatRoom;
        if (!roomId) {
          throw new Error('No chat room found for this team');
        }
        
        // Step 4: Fetch chat room if not already fetched
        if (!initState.roomFetched || currentRoom?._id !== roomId) {
          console.log('[TeamChat] Fetching chat room data...');
          const roomResult = await dispatch(GetChatRoom(roomId));
          
          if (!roomResult || !roomResult.chatRoom) {
            throw new Error('Failed to load chat room');
          }
          
          setInitState(prev => ({ ...prev, roomFetched: true }));
        }
        
        console.log('[TeamChat] Initialization complete');
      } catch (err) {
        console.error('[TeamChat] Error during initialization:', err);
        setInitState(prev => ({ 
          ...prev, 
          error: err.message || 'Failed to initialize team chat' 
        }));
      } finally {
        isProcessing.current = false;
      }
    };
    
    initialize();
  }, [teamId, user, currentTeam?._id, currentRoom?._id, navigate, dispatch]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[TeamChat] Cleanup on unmount');
      dispatch(ClearCurrentRoom());
      isProcessing.current = false;
      lastTeamId.current = null;
    };
  }, [dispatch]);
  
  // Error state
  if (initState.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white dark:bg-boxdark rounded-lg shadow-sm max-w-md">
          <h3 className="text-xl font-medium text-danger mb-4">Error</h3>
          <p className="text-bodydark mb-6">{initState.error}</p>
          <button
            onClick={() => navigate('/teams')}
            className="inline-flex items-center justify-center rounded-md bg-primary py-2.5 px-6 text-white hover:bg-opacity-90"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }
  
  // Loading state - more precise conditions
  const isLoading = !initState.teamFetched || 
                   !initState.roomFetched || 
                   !currentTeam || 
                   currentTeam._id !== teamId ||
                   !currentRoom ||
                   currentRoom._id !== currentTeam?.chatRoom?._id;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-bodydark2">Loading team chat...</p>
        </div>
      </div>
    );
  }
  
  // Render the chat interface
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden">
      <div className="bg-white dark:bg-boxdark h-full rounded-sm border border-stroke dark:border-strokedark shadow-default">
        <div className="flex h-full">
          {/* Team Members Sidebar */}
          <div className="w-80 border-r border-stroke dark:border-strokedark h-full overflow-hidden">
            <TeamChatSidebar 
              team={currentTeam}
              currentUserId={user?.id}
              chatRoomId={currentRoom._id}
            />
          </div>
          
          {/* Chat Content */}
          <div className="flex-1 h-full overflow-hidden">
            <ChatRoom 
              roomId={currentRoom._id} 
              teamId={teamId} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamChatContent;