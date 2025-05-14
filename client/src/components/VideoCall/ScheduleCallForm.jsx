import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createScheduledCall, updateScheduledCall, deleteScheduledCall } from "../../redux/actions/VideoCalls";
import { FindUsers } from "../../redux/actions/users";
import { GetUserTeamsAction, GetAllTeamsAction } from "../../redux/actions/teams";
import swal from "sweetalert";

const ScheduleCallForm = ({ onClose, initialData = null, mode = 'create' }) => {
  const dispatch = useDispatch();
  
  // Debug the entire teams state
  const teamsState = useSelector(state => state.teams);
  
  // Try multiple possible locations where teams might be stored in Redux
  const allTeams = useSelector(state => {
    // Check all possible paths where teams might be stored
    const teams = state.teams;
    
    if (teams?._ALL && Array.isArray(teams._ALL)) {
      return teams._ALL;
    }
    
    if (teams?._USER?.all && Array.isArray(teams._USER.all)) {
      return teams._USER.all;
    }
    
    if (teams?.all && Array.isArray(teams.all)) {
      return teams.all;
    }
    
    // If we can't find teams in a standard location, look for any array in the state
    // that might contain team objects
    const findPossibleTeams = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      
      // If it's an array with team-like objects, return it
      if (Array.isArray(obj) && obj.length > 0 && 
          obj[0] && typeof obj[0] === 'object' && 
          (obj[0].Name || obj[0].name || obj[0].team_name)) {
        return obj;
      }
      
      // Otherwise search recursively
      for (const key in obj) {
        const result = findPossibleTeams(obj[key]);
        if (result) return result;
      }
      
      return null;
    };
    
    return findPossibleTeams(teams) || [];
  });
  
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(true);
  const { _ALL: allUsers = [] } = useSelector((state) => state.users);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    call_name: initialData?.call_name || "",
    description: initialData?.description || "",
    start_time: initialData?.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : "",
    duration: initialData?.duration || 30,
    is_recurring: initialData?.is_recurring || false,
    recurrence_pattern: initialData?.recurrence_pattern || "weekly",
    recurrence_end_date: initialData?.recurrence_end_date ? new Date(initialData.recurrence_end_date).toISOString().slice(0, 10) : "",
  });

  // Log all Redux state on mount
  useEffect(() => {
    console.log("Complete teams state:", teamsState);
    console.log("Extracted teams array:", allTeams);
  }, [teamsState, allTeams]);

  // Fetch user and team data when the component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch users if not available
        if (!allUsers || allUsers.length === 0) {
          console.log("Fetching users data for video call form");
          await dispatch(FindUsers());
        }
        
        // Fetch teams - try both methods since we're not sure which endpoint is implemented
        console.log("Fetching teams data for video call form");
        try {
          await dispatch(GetUserTeamsAction());
          console.log("GetUserTeamsAction completed");
        } catch (error) {
          console.warn("GetUserTeamsAction failed, trying GetAllTeamsAction", error);
        }
        
        try {
          await dispatch(GetAllTeamsAction());
          console.log("GetAllTeamsAction completed");
        } catch (error) {
          console.warn("GetAllTeamsAction failed", error);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dispatch, allUsers.length]);

  // Set initial selections if editing
  useEffect(() => {
    if (initialData && mode === 'edit') {
      console.log("Setting initial data for editing call:", initialData);
      
      if (initialData.team_id) {
        setShowTeamSelector(true);
        setShowUserSelector(false);
        
        // Find the team by ID
        const team = allTeams.find(t => t._id === initialData.team_id);
        if (team) {
          console.log("Found matching team:", team.Name || team.name);
          setSelectedTeam(team);
        } else {
          console.log("Team not found, creating placeholder with ID:", initialData.team_id);
          // Create a placeholder team if not found
          setSelectedTeam({ 
            _id: initialData.team_id, 
            Name: initialData.team?.Name || initialData.team?.name || "Loading...",
            members: initialData.team?.members || []
          });
        }
      } else if (initialData.participants && initialData.participants.length > 0) {
        console.log("Setting up participants:", initialData.participants);
        
        // Map participants to user objects or placeholders
        const participants = initialData.participants.map(id => {
          const user = allUsers.find(user => user._id === id);
          
          if (user) {
            return user;
          } else {
            console.log("Creating placeholder for user ID:", id);
            // Create placeholder for missing user
            return { 
              _id: id, 
              fullName: "User", 
              picture: null 
            };
          }
        });
        
        setSelectedUsers(participants);
      }
    }
  }, [initialData, allUsers, allTeams, mode]);

  // Toggle between team and individual user selection
  const toggleSelectionMode = () => {
    setShowTeamSelector(!showTeamSelector);
    setShowUserSelector(!showUserSelector);
    // Reset selections when toggling
    if (!showTeamSelector) {
      setSelectedUsers([]);
    } else {
      setSelectedTeam(null);
    }
  };

  // Filter users based on search term with better error handling
  const filteredUsers = React.useMemo(() => {
    try {
      if (!Array.isArray(allUsers)) {
        console.warn("allUsers is not an array:", allUsers);
        return [];
      }
      
      return allUsers.filter(user => {
        if (!user) return false;
        
        const nameMatch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        const emailMatch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        
        return nameMatch || emailMatch;
      });
    } catch (error) {
      console.error("Error filtering users:", error);
      return [];
    }
  }, [allUsers, searchTerm]);

  // Filter teams based on search term with better error handling
  const filteredTeams = React.useMemo(() => {
    try {
      if (!Array.isArray(allTeams)) {
        console.warn("allTeams is not an array:", allTeams);
        return [];
      }
      
      return allTeams.filter(team => {
        if (!team) return false;
        
        // Handle teams with different property naming
        const teamName = team.Name || team.name || "";
        return teamName.toLowerCase().includes(teamSearchTerm.toLowerCase());
      });
    } catch (error) {
      console.error("Error filtering teams:", error);
      return [];
    }
  }, [allTeams, teamSearchTerm]);

  // Normalize team object to handle different property naming conventions
  const normalizeTeam = (team) => {
    if (!team) return null;
    
    return {
      ...team,
      Name: team.Name || team.name || "Unnamed Team",
      members: team.members || []
    };
  };

  // Select a user
  const handleSelectUser = (user) => {
    try {
      // Check if user is already selected
      if (!selectedUsers.some(u => u._id === user._id)) {
        setSelectedUsers([...selectedUsers, user]);
        console.log("User selected:", user.fullName);
      }
      setShowUserDropdown(false);
      setSearchTerm("");
    } catch (error) {
      console.error("Error selecting user:", error);
    }
  };

  // Remove a selected user
  const handleRemoveUser = (userId) => {
    try {
      setSelectedUsers(selectedUsers.filter(user => user._id !== userId));
      console.log("User removed:", userId);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  };

  // Select a team
  const handleSelectTeam = (team) => {
    try {
      const normalizedTeam = normalizeTeam(team);
      setSelectedTeam(normalizedTeam);
      console.log("Team selected:", normalizedTeam.Name);
      setShowTeamDropdown(false);
      setTeamSearchTerm("");
    } catch (error) {
      console.error("Error selecting team:", error);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    try {
      const { name, value, type, checked } = e.target;
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value
      });
    } catch (error) {
      console.error("Error handling input change:", error);
    }
  };

  // Generate a default image for users or teams
  const getDefaultImage = (name, isTeam = false) => {
    if (!name) return null;
    
    const initial = name.charAt(0).toUpperCase();
    const color = isTeam ? '#6366f1' : '#3c50e0';
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='%23ffffff' stroke='none'%3E%3Crect width='24' height='24' fill='${color.replace('#', '%23')}'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='12' font-weight='bold' text-anchor='middle' dy='.3em'%3E${initial}%3C/text%3E%3C/svg%3E`;
  };

  // Get proper image URL with fallback
  const getImageUrl = (item, isTeam = false) => {
    if (!item) return getDefaultImage("User", isTeam);
    
    const name = isTeam ? (item.Name || item.name) : item.fullName;
    const picture = item.picture || item.pictureprofile;
    
    if (!picture) return getDefaultImage(name, isTeam);
    
    // Support both absolute and relative URLs
    if (picture.includes('https://')) {
      return picture;
    } else {
      // Use relative URL for better portability
      return `/images/${picture}`;
    }
  };

  // Handle delete call
  const handleDelete = async () => {
    if (!initialData?._id) return;
    
    swal({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this scheduled call!",
      icon: "warning",
      buttons: ["Cancel", "Delete"],
      dangerMode: true,
    }).then(async (willDelete) => {
      if (willDelete) {
        try {
          setIsDeleting(true);
          const result = await dispatch(deleteScheduledCall(initialData._id));
          
          if (result) {
            swal("Success", "Call has been deleted!", "success");
            onClose();
          }
        } catch (error) {
          console.error("Error deleting call:", error);
          swal("Error", "Failed to delete call", "error");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!formData.call_name) {
        swal("Error", "Please enter a call name", "error");
        return;
      }
      
      if (!formData.start_time) {
        swal("Error", "Please select a start time", "error");
        return;
      }
      
      if (showTeamSelector && !selectedTeam) {
        swal("Error", "Please select a team", "error");
        return;
      }
      
      if (showUserSelector && selectedUsers.length === 0) {
        swal("Error", "Please select at least one participant", "error");
        return;
      }

      // Calculate end time based on duration
      const startTime = new Date(formData.start_time);
      const endTime = new Date(startTime.getTime() + parseInt(formData.duration) * 60000);
      
      // Validate dates
      if (isNaN(startTime.getTime())) {
        swal("Error", "Invalid start time", "error");
        return;
      }
      
      if (isNaN(endTime.getTime())) {
        swal("Error", "Invalid end time based on duration", "error");
        return;
      }
      
      if (startTime < new Date() && !initialData) { // Only check for new calls
        swal("Warning", "You are scheduling a call in the past", "warning");
      }
      
      // Prepare call data
      const callData = {
        call_name: formData.call_name,
        description: formData.description || '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: parseInt(formData.duration),
        is_recurring: formData.is_recurring,
      };
      
      // Add recurring fields if needed
      if (formData.is_recurring) {
        callData.recurrence_pattern = formData.recurrence_pattern;
        if (formData.recurrence_end_date) {
          callData.recurrence_end_date = new Date(formData.recurrence_end_date).toISOString();
        }
      }
      
      // Add participants or team
      if (showTeamSelector && selectedTeam) {
        callData.team_id = selectedTeam._id;
      } else if (showUserSelector) {
        callData.participants = selectedUsers.map(user => user._id);
      }
      
      console.log("Submitting call data:", callData);
      setIsLoading(true);
      
      try {
        let result;
        if (initialData?._id) {
          console.log("Updating existing call:", initialData._id);
          result = await dispatch(updateScheduledCall(initialData._id, callData));
        } else {
          console.log("Creating new call");
          result = await dispatch(createScheduledCall(callData));
        }
        
        swal("Success", initialData ? "Call updated successfully" : "Call scheduled successfully", "success");
        onClose();
      } catch (error) {
        console.error("API Error:", error);
        
        // Better error handling with specific messages
        let errorMessage = "Failed to save call";
        if (error.response) {
          if (error.response.status === 500) {
            errorMessage = "Server error. Please check your data and try again.";
          } else if (error.response.status === 400) {
            errorMessage = error.response.data?.message || "Invalid data submitted.";
          } else if (error.response.status === 404) {
            errorMessage = "Call not found. It may have been deleted.";
          } else {
            errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
          }
        } else if (error.request) {
          errorMessage = "No response from server. Please check your connection.";
        } else {
          errorMessage = error.message || "Unknown error occurred";
        }
        
        swal("Error", errorMessage, "error");
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      swal("Error", `Form validation error: ${error.message || "Unknown error"}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-boxdark p-6 rounded-lg shadow-lg flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-boxdark p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
        {mode === 'edit' ? "Edit Scheduled Call" : "Schedule a Video Call"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Call Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Call Name *
          </label>
          <input
            type="text"
            name="call_name"
            value={formData.call_name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
            placeholder="Team Standup"
            required
          />
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
            placeholder="Weekly team check-in"
            rows="2"
          />
        </div>
        
        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Time *
          </label>
          <input
            type="datetime-local"
            name="start_time"
            value={formData.start_time}
            onChange={handleInputChange}
            className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
            required
          />
        </div>
        
        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Duration (minutes) *
          </label>
          <select
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
            required
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>
        
        {/* Recurring Meetings */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_recurring"
            name="is_recurring"
            checked={formData.is_recurring}
            onChange={handleInputChange}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="is_recurring" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Recurring meeting
          </label>
        </div>
        
        {/* Recurrence Options (conditionally rendered) */}
        {formData.is_recurring && (
          <div className="space-y-4 pl-6 border-l-2 border-primary mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recurrence Pattern
              </label>
              <select
                name="recurrence_pattern"
                value={formData.recurrence_pattern}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recurrence End Date
              </label>
              <input
                type="date"
                name="recurrence_end_date"
                value={formData.recurrence_end_date}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>
          </div>
        )}
        
        {/* Toggle between Team and Participants */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select participants for this call
          </span>
          
          <div className="flex items-center">
            <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
              {showTeamSelector ? "Select a team" : "Select individuals"}
            </span>
            <button
              type="button"
              onClick={toggleSelectionMode}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-meta-4 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Switch to {showTeamSelector ? "individuals" : "team"}
            </button>
          </div>
        </div>
        
        {/* Team Selection (conditionally rendered) */}
        {showTeamSelector && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Team * ({filteredTeams.length} teams available)
            </label>
            
            <div className="flex items-center w-full border rounded dark:border-strokedark">
              <input
                type="text"
                placeholder="Search teams..."
                value={selectedTeam ? (selectedTeam.Name || selectedTeam.name) : teamSearchTerm}
                onChange={(e) => {
                  setTeamSearchTerm(e.target.value);
                  setSelectedTeam(null);
                  setShowTeamDropdown(true);
                }}
                onClick={() => setShowTeamDropdown(true)}
                className="w-full p-2 rounded-l border-none focus:outline-none dark:bg-meta-4 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                className="px-4 py-2 bg-gray-100 dark:bg-meta-4 text-gray-500 dark:text-white rounded-r"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  {showTeamDropdown ? (
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  )}
                </svg>
              </button>
            </div>
            
            {/* Team dropdown */}
            {showTeamDropdown && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="sticky top-0 border-b border-stroke dark:border-strokedark">
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value)}
                    className="w-full p-2 focus:outline-none dark:bg-meta-4 dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Debug info for teams */}
                <div className="px-4 py-2 border-b border-stroke dark:border-strokedark">
                  <p className="text-xs text-gray-500">
                    Found {filteredTeams.length} team(s) {teamSearchTerm ? "matching search" : ""}
                  </p>
                </div>
                
                {filteredTeams.length > 0 ? (
                  filteredTeams.map(team => {
                    const normalizedTeam = normalizeTeam(team);
                    return (
                      <div
                        key={team._id}
                        onClick={() => handleSelectTeam(team)}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden bg-primary text-white">
                          <img 
                            src={getImageUrl(normalizedTeam, true)}
                            className="h-full w-full object-cover"
                            alt={normalizedTeam.Name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getDefaultImage(normalizedTeam.Name, true);
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-black dark:text-white">{normalizedTeam.Name}</p>
                          <p className="text-xs text-body-color">{normalizedTeam.members?.length || 0} members</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-center text-body-color">
                    {teamSearchTerm 
                      ? "No teams found matching your search"
                      : allTeams.length > 0 
                        ? "No teams available"
                        : "Unable to load teams. Please try again later."}
                  </div>
                )}
              </div>
            )}
            
            {/* Selected Team Display */}
            {selectedTeam && (
              <div className="mt-2 bg-gray-50 dark:bg-meta-4 p-2 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center overflow-hidden bg-primary text-white">
                    <img 
                      src={getImageUrl(selectedTeam, true)}
                      className="h-full w-full object-cover"
                      alt={selectedTeam.Name || selectedTeam.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getDefaultImage(selectedTeam.Name || selectedTeam.name, true);
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{selectedTeam.Name || selectedTeam.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* User Selection (conditionally rendered) */}
        {showUserSelector && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Participants *
            </label>
            
            <div className="relative">
              <div className="flex items-center w-full border rounded dark:border-strokedark">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onClick={() => setShowUserDropdown(true)}
                  className="w-full p-2 rounded-l border-none focus:outline-none dark:bg-meta-4 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="px-4 py-2 bg-gray-100 dark:bg-meta-4 text-gray-500 dark:text-white rounded-r"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    {showUserDropdown ? (
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    )}
                  </svg>
                </button>
              </div>
              
              {/* User dropdown */}
              {showUserDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                  <div className="sticky top-0 border-b border-stroke dark:border-strokedark">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 focus:outline-none dark:bg-meta-4 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {filteredUsers.length > 0 ? (
                    filteredUsers
                      // Don't show already selected users
                      .filter(user => !selectedUsers.some(u => u._id === user._id))
                      .map(user => (
                        <div
                          key={user._id}
                          onClick={() => handleSelectUser(user)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden bg-primary text-white">
                            <img 
                              src={getImageUrl(user)}
                              className="h-full w-full object-cover"
                              alt={user.fullName}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getDefaultImage(user.fullName);
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-black dark:text-white">{user.fullName || "User"}</p>
                            {user.email && <p className="text-xs text-body-color">{user.email}</p>}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="px-4 py-3 text-center text-body-color">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {selectedUsers.length} participant{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <div key={user._id} className="bg-gray-50 dark:bg-meta-4 px-2 py-1 rounded-full flex items-center gap-1">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center overflow-hidden bg-primary text-white text-xs">
                        <img 
                          src={getImageUrl(user)}
                          className="h-full w-full object-cover"
                          alt={user.fullName || "User"}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getDefaultImage(user.fullName || "User");
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">{user.fullName || "User"}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user._id)}
                        className="text-gray-500 hover:text-red-500 ml-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center gap-4 mt-6">
          <div>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete Call'
                )}
              </button>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                mode === 'edit' ? "Update Call" : "Schedule Call"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ScheduleCallForm;