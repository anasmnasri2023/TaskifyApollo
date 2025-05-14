// Pages/Teams/teamlayout
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import DefaultLayout from '../../layout/DefaultLayout';
import Breadcrumb from '../../components/Breadcrumb';
import TeamHome from './teamHome';
import TeamPosts from './teamPosts';
import TeamChatContent from './TeamChatContent';
import TeamSettings from './TeamSettingsContent';

// Import actions
import { GetTeamAction } from '../../redux/actions/teams';

const TeamLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { teamId } = useParams();
  
  // Get data from Redux store
  const { user } = useSelector(state => state.auth || {});
  const { _ONE: team } = useSelector(state => state.teams || {});
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [loadError, setLoadError] = useState(null);
  
  // Define the available tabs with better styling for active chat
  const tabs = [
    { id: 'home', label: 'Home', icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    )},
    { id: 'posts', label: 'Posts', icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    )},
    { id: 'chat', label: 'Chat', icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    )},
    { id: 'settings', label: 'Settings', icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    )},
  ];
  
  // Fetch team data
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        if (teamId) {
          console.log("Fetching team data for ID:", teamId);
          await dispatch(GetTeamAction(teamId));
        }
      } catch (error) {
        console.error("Error loading team:", error);
        setLoadError(error.message || "Failed to load team data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeam();
  }, [teamId, dispatch]);
  
  // Check if user is member of the team
  const isTeamMember = () => {
    if (!team || !team.members || !user) {
      return false;
    }
    
    const isMember = team.members.some(member => {
      const memberUserId = member.user?._id || member.user;
      const currentUserId = user.id || user._id;
      return String(memberUserId) === String(currentUserId);
    });
    
    return isMember;
  };
  
  // Check if user is admin of the team
  const isAdmin = () => {
    if (!team || !team.members || !user) return false;
    
    const userMember = team.members.find(member => {
      const memberUserId = member.user?._id || member.user;
      const currentUserId = user.id || user._id;
      return String(memberUserId) === String(currentUserId);
    });
    
    return userMember?.role === 'ADMIN';
  };
  
  // Navigate back to all teams
  const handleBackToTeams = () => {
    navigate('/teams');
  };
  
  // Loading state UI
  const renderLoadingState = () => (
    <div className="flex h-screen items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
  
  // Error alert component
  const ErrorAlert = ({ message }) => (
    <div className="mb-6 rounded-sm border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
      <div className="flex items-start">
        <div className="mr-3 mt-0.5 text-red-500 dark:text-red-400">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
          <div className="mt-1 text-sm text-red-700 dark:text-red-400">{message}</div>
        </div>
      </div>
    </div>
  );
  
  // Team not found UI
  const renderTeamNotFound = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <svg
        className="mb-4 h-20 w-20 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="mb-2 text-xl font-semibold text-black">
        Team Not Found
      </h3>
      <p className="mb-6 text-center text-gray-600">
        The team you're looking for doesn't exist or you don't have permission to view it.
      </p>
      <button
        onClick={handleBackToTeams}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-white transition hover:opacity-90"
      >
        Back to Teams
      </button>
    </div>
  );
  
  // Access restricted UI
  const renderAccessRestricted = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <svg
        className="mb-4 h-20 w-20 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h3 className="mb-2 text-xl font-semibold text-black">
        Access Restricted
      </h3>
      <p className="mb-6 text-center text-gray-600">
        You don't have permission to access this team.
      </p>
      <button
        onClick={handleBackToTeams}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-white transition hover:opacity-90"
      >
        Back to Teams
      </button>
    </div>
  );
  
  // Render the team layout with tabs
  const renderTeamContent = () => (
    <>
      {/* Team Header */}
      <div className="mb-6 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="mr-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl overflow-hidden">
              {team.pictureprofile ? (
                <img
                  src={`data:image/png;base64,${team.pictureprofile}`}
                  alt={team.Name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-black dark:text-white">
                {team.Name}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {team.description || 'No description provided'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-0">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
            </div>
            
            {isAdmin() && (
              <a 
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}
                className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Manage Team
              </a>
            )}
            
            <button
              onClick={handleBackToTeams}
              className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                />
              </svg>
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Team Navigation Tabs */}
      <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              className={`flex min-w-max items-center gap-2 px-5 py-4 text-sm font-medium transition relative ${
                activeTab === tab.id
                  ? 'text-primary bg-gray-1 dark:bg-meta-4'
                  : 'text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
              {/* Special indicator for chat tab */}
              {tab.id === 'chat' && activeTab !== 'chat' && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* Team Content Area */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {/* Render the appropriate content based on the active tab */}
        {activeTab === 'home' && <TeamHome team={team} user={user} />}
        {activeTab === 'posts' && <TeamPosts team={team} user={user} />}
        {activeTab === 'chat' && <TeamChatContent team={team} user={user} />}
        {activeTab === 'settings' && <TeamSettings team={team} user={user} />}
      </div>
    </>
  );
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName={team ? team.Name : 'Team'} />
      
      {loadError && <ErrorAlert message={loadError} />}
      
      <div className="flex flex-col gap-10">
        {isLoading ? (
          renderLoadingState()
        ) : !team ? (
          renderTeamNotFound()
        ) : !isTeamMember() ? (
          renderAccessRestricted()
        ) : (
          renderTeamContent()
        )}
      </div>
    </DefaultLayout>
  );
};

export default TeamLayout;