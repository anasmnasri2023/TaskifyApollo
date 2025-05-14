// UserTeamsOverview.jsx - Fixed with proper stats counting

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { 
  GetUserTeamsAction, 
  CreateTeamAction,
  ResetCurrentTeamAction,
  GetTeamStatsAction // Import the stats action
} from "../../redux/actions/teams";
import { FindUsers } from "../../redux/actions/users";
import moment from "moment";
import CreateTeamUser from "../../components/Teams/CreateTeamUser"

const UserTeamsOverview = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get data from Redux store with better default handling
  const { _USER: userTeams = { all: [], created: [], joined: [] } } = useSelector((state) => state.teams || {});
  const { user } = useSelector((state) => state.auth || {});
  const errors = useSelector((state) => state.errors?.content);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, created, joined
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [teamStats, setTeamStats] = useState({}); // Store team stats here
  const [statsFetched, setStatsFetched] = useState(false); // Track if stats were fetched
  
  // Debug logging function
  const logTeamStats = (team, stats) => {
    console.group(`Team Stats Debug: ${team.Name} (${team._id})`);
    console.log('Team Object:', team);
    console.log('Stats Object:', stats);
    
    if (stats) {
      console.log('stats.projectCount:', stats.projectCount);
      console.log('stats.projects?.total:', stats.projects?.total);
      console.log('stats.taskCount:', stats.taskCount);
      console.log('stats.tasks?.total:', stats.tasks?.total);
    }
    
    console.groupEnd();
  };
  
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Reset any previous team data
        dispatch(ResetCurrentTeamAction());
        
        // Get user teams
        await dispatch(GetUserTeamsAction());
      } catch (error) {
        console.error("Error fetching teams:", error);
        setLoadError(error.message || "Failed to load teams. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, [dispatch]);

  // Separate effect to fetch stats for each team
  useEffect(() => {
    const fetchTeamStats = async () => {
      if (!userTeams.all?.length || statsFetched) return;
      
      try {
        console.log('Fetching stats for teams:', userTeams.all);
        const statsObj = {};
        let fetchCount = 0;
        
        // Create a copy of the stats tracking object to avoid state updates during the loop
        for (const team of userTeams.all) {
          if (team && team._id) {
            try {
              console.log(`Fetching stats for team ${team.Name} (${team._id})`);
              // Try to get stats from the API
              const stats = await dispatch(GetTeamStatsAction(team._id));
              statsObj[team._id] = stats;
              fetchCount++;
              
              // Log debug info
              logTeamStats(team, stats);
            } catch (err) {
              console.error(`Error fetching stats for team ${team._id}:`, err);
              // Use default stats if API call fails
              statsObj[team._id] = {
                projectCount: 0,
                taskCount: 0,
                postCount: 0
              };
            }
          }
        }
        
        console.log(`Fetched stats for ${fetchCount} teams`);
        console.log('Final teamStats object:', statsObj);
        setTeamStats(statsObj);
        setStatsFetched(true);
      } catch (error) {
        console.error("Error fetching team stats:", error);
      }
    };
    
    if (!isLoading && userTeams.all?.length > 0 && !statsFetched) {
      fetchTeamStats();
    }
  }, [userTeams.all, isLoading, dispatch, statsFetched]);

  // Reset statsFetched when user teams change
  useEffect(() => {
    if (userTeams.all?.length > 0 && Object.keys(teamStats).length === 0) {
      setStatsFetched(false);
    }
  }, [userTeams.all, teamStats]);

  // Filter teams based on search term and active tab
  const getFilteredTeams = () => {
    const teamsMap = {
      all: userTeams.all || [],
      created: userTeams.created || [],
      joined: userTeams.joined || []
    };
    
    const teams = teamsMap[activeTab] || [];
    
    return teams.filter(team => 
      team.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleTeamClick = (teamId) => {
    navigate(`/teams/${teamId}/home`);
  };

  // Get member count for each team
  const getMemberCount = (team) => {
    return team.members?.length || 0;
  };

  // Safe stats getter functions with improved error handling
  const getProjectCount = (team) => {
    // First try to get from our fetched stats
    if (teamStats[team._id]) {
      // Handle both API formats (full stats object or simple count object)
      if (teamStats[team._id].projectCount !== undefined) {
        return teamStats[team._id].projectCount;
      }
      if (teamStats[team._id].projects?.total !== undefined) {
        return teamStats[team._id].projects.total;
      }
    }
    
    // Fall back to direct check on team object
    if (Array.isArray(team.projects)) {
      return team.projects.length;
    }
    
    // Check if it's an object with a length property
    if (team.projects && typeof team.projects === 'object' && 'length' in team.projects) {
      return team.projects.length;
    }
    
    return 0;
  };

  const getTaskCount = (team) => {
    // First try to get from our fetched stats
    if (teamStats[team._id]) {
      // Handle both API formats
      if (teamStats[team._id].taskCount !== undefined) {
        return teamStats[team._id].taskCount;
      }
      if (teamStats[team._id].tasks?.total !== undefined) {
        return teamStats[team._id].tasks.total;
      }
    }
    
    // Fall back to direct check on team object
    if (Array.isArray(team.tasks)) {
      return team.tasks.length;
    }
    
    // Check if it's an object with a length property
    if (team.tasks && typeof team.tasks === 'object' && 'length' in team.tasks) {
      return team.tasks.length;
    }
    
    return 0;
  };

  // Updated getPostCount function for UserTeamsOverview.jsx
const getPostCount = (team) => {
  // First try to get from our fetched stats
  if (teamStats[team._id]) {
    // Handle both API formats
    if (teamStats[team._id].postCount !== undefined) {
      return teamStats[team._id].postCount;
    }
    if (teamStats[team._id].posts?.total !== undefined) {
      return teamStats[team._id].posts.total;
    }
  }
  
  // Check if posts property exists on the team object
  if (team.posts) {
    // Handle posts as an array
    if (Array.isArray(team.posts)) {
      return team.posts.length;
    }
    
    // Handle posts as a number
    if (typeof team.posts === 'number') {
      return team.posts;
    }
    
    // Handle posts as an object with a length property
    if (typeof team.posts === 'object' && 'length' in team.posts) {
      return team.posts.length;
    }
    
    // Handle posts as an object with a count property
    if (typeof team.posts === 'object' && 'count' in team.posts) {
      return team.posts.count;
    }
  }
  
  // Return default value if no posts data found
  return 0;
};
  // Check if user is admin of the team
  const isTeamAdmin = (team) => {
    if (!team || !team.members || !user) return false;
    const currentMember = team.members.find(m => m.user && (m.user._id === user._id || m.user === user._id));
    return currentMember?.role === "ADMIN";
  };

  // Get recent activity indicator
  const getActivityIndicator = (team) => {
    // This is a placeholder - you would implement based on your actual activity data
    const today = new Date();
    const createdDate = new Date(team.createdAt || team.datecreation);
    const daysDiff = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 7) return "high";
    if (daysDiff < 30) return "medium";
    return "low";
  };

  const filteredTeams = getFilteredTeams();
  
  // Error alert component
  const ErrorAlert = ({ message, onClose }) => (
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
        {onClose && (
          <button 
            onClick={onClose} 
            className="ml-auto text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb pageName="My Teams" />

        {/* Error alert for load errors */}
        {loadError && (
          <ErrorAlert 
            message={loadError} 
            onClose={() => setLoadError(null)} 
          />
        )}

        {/* Teams Header with Search and Create Button */}
        <div className="mb-6 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-black dark:text-white">
                My Teams
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Access and manage your teams
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="fill-current"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.3214 13.6583L11.3214 10.6583C12.1429 9.58333 12.5714 8.16667 12.4286 6.66667C12.2143 4.08333 10.1429 2.08333 7.57143 2C4.71429 1.91667 2.28571 4.33333 2.28571 7.16667C2.28571 9.75 4.28571 11.8333 6.85714 12.0833C8.35714 12.225 9.77143 11.7917 10.8429 10.9167L13.8429 13.9167C13.9286 14 14.0714 14 14.1571 13.9167L14.3214 13.75C14.4071 13.6667 14.4071 13.5417 14.3214 13.6583ZM3.71429 7.08333C3.71429 5.16667 5.28571 3.58333 7.21429 3.58333C9.14286 3.58333 10.7143 5.16667 10.7143 7.08333C10.7143 9 9.14286 10.5833 7.21429 10.5833C5.28571 10.5833 3.71429 9 3.71429 7.08333Z"
                      fill="#9CA3AF"
                    />
                  </svg>
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 font-medium text-white transition hover:bg-opacity-90"
              >
                <svg
                  className="fill-current"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 7H9V1C9 0.4 8.6 0 8 0C7.4 0 7 0.4 7 1V7H1C0.4 7 0 7.4 0 8C0 8.6 0.4 9 1 9H7V15C7 15.6 7.4 16 8 16C8.6 16 9 15.6 9 15V9H15C15.6 9 16 8.6 16 8C16 7.4 15.6 7 15 7Z"
                    fill=""
                  />
                </svg>
                Create Team
              </button>
            </div>
          </div>
        </div>

        {/* Team Filter Tabs */}
        <div className="mb-6 flex border-b border-stroke dark:border-strokedark">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-4 text-sm font-medium transition ${
              activeTab === "all"
                ? "border-b-2 border-primary text-primary"
                : "text-body-color hover:text-primary"
            }`}
          >
            All Teams ({userTeams.all?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("created")}
            className={`px-5 py-4 text-sm font-medium transition ${
              activeTab === "created"
                ? "border-b-2 border-primary text-primary"
                : "text-body-color hover:text-primary"
            }`}
          >
            Created by Me ({userTeams.created?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("joined")}
            className={`px-5 py-4 text-sm font-medium transition ${
              activeTab === "joined"
                ? "border-b-2 border-primary text-primary"
                : "text-body-color hover:text-primary"
            }`}
          >
            Joined ({userTeams.joined?.length || 0})
          </button>
        </div>

        {/* Team Grid */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6 py-5 dark:border-strokedark">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-black dark:text-white">
                {activeTab === "all" ? "All Teams" : 
                 activeTab === "created" ? "Teams Created by Me" : 
                 "Teams I've Joined"}
              </h4>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm 
                    ? "No teams match your search" 
                    : activeTab === "all" 
                      ? "You're not part of any teams yet" 
                      : activeTab === "created" 
                        ? "You haven't created any teams yet" 
                        : "You haven't joined any teams yet"
                  }
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                  >
                    Clear search
                  </button>
                )}
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                  >
                    Create your first team
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeams.map((team) => {
                  const activityLevel = getActivityIndicator(team);
                  return (
                    <div 
                      key={team._id} 
                      className="group cursor-pointer rounded-xl border border-stroke bg-white p-5 transition hover:shadow-lg dark:border-strokedark dark:bg-boxdark dark:hover:shadow-gray-800"
                      onClick={() => handleTeamClick(team._id)}
                    >
                      <div className="mb-4 flex items-center">
                        <div className="relative mr-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          {team.pictureprofile ? (
                            <img
                              src={`data:image/png;base64,${team.pictureprofile}`}
                              alt={team.Name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <svg
                              className="h-7 w-7 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          )}
                          
                          {/* Activity indicator dot */}
                          <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white 
                            ${activityLevel === 'high' ? 'bg-success' : 
                              activityLevel === 'medium' ? 'bg-warning' : 'bg-danger'}`}></span>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-black dark:text-white">
                            {team.Name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {getMemberCount(team)} member{getMemberCount(team) !== 1 ? 's' : ''}
                            </div>
                            
                            {isTeamAdmin(team) && (
                              <div className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                                Admin
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        {team.description || 'No description provided'}
                      </p>
                      
                      {/* Team stats summary - FIXED SECTION */}
                      <div className="mb-4 grid grid-cols-3 gap-2 rounded-sm border border-stroke p-2 text-center dark:border-strokedark">
                        <div className="p-1">
                          <h5 className="text-sm font-medium text-black dark:text-white">Projects</h5>
                          <p className="text-lg font-semibold text-primary">
                            {getProjectCount(team)}
                          </p>
                        </div>
                        <div className="p-1">
                          <h5 className="text-sm font-medium text-black dark:text-white">Tasks</h5>
                          <p className="text-lg font-semibold text-primary">
                            {getTaskCount(team)}
                          </p>
                        </div>
                        <div className="p-1">
                          <h5 className="text-sm font-medium text-black dark:text-white">Posts</h5>
                          <p className="text-lg font-semibold text-primary">
                            {getPostCount(team)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created {moment(team.createdAt || team.datecreation).format("MMM D, YYYY")}
                        </div>
                        
                        <div className="flex items-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <svg
                              className="h-4 w-4 text-primary"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create Team Modal */}
        {showCreateModal && (
          <CreateTeamUser
            setShowModal={setShowCreateModal}
            onSuccess={() => {
              dispatch(GetUserTeamsAction());
              setStatsFetched(false); // Reset stats fetched flag to trigger a re-fetch
            }}
          />
        )}
      </div>
    </DefaultLayout>
  );
};

export default UserTeamsOverview;