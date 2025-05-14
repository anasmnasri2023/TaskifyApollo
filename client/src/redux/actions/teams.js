import axios from "axios";
import swal from "sweetalert";
import { setRefresh } from "../reducers/commons";
import { setErrors } from "../reducers/errors";
import {
  _AddTeam,
  _DeleteTeam,
  _FindOneTeam,
  _FindTeams,
  _UpdateTeam,
  _AddTeamMember,
  _RemoveTeamMember,
  _UpdateMemberRole,
  _SetUserTeams,
  _ResetCurrentTeam   // Add this action to reset the current team
} from "../reducers/teams";

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

// Add this action to reset the current team
export const ResetCurrentTeamAction = () => (dispatch) => {
  dispatch(_ResetCurrentTeam());
};

export const CreateTeamAction = (form) => async (dispatch) => {
    dispatch(setRefresh(true));
    
    try {
      let pictureprofile = "";
      if (form.pictureprofile && form.pictureprofile instanceof File) {
        pictureprofile = (await toBase64(form.pictureprofile)).replace(
          "data:image/png;base64,",
          ""
        );
      }
  
      // Properly extract member IDs from the form data
      const members = [];
      if (Array.isArray(form.members)) {
        form.members.forEach(member => {
          // Handle both object format and direct ID string format
          const userId = typeof member === 'object' ? member.user : member;
          if (userId && typeof userId === 'string') {
            members.push(userId);
          }
        });
      }
  
      const payload = {
        Name: form.Name,
        description: form.description,
        members: members, // Use the properly extracted members array
        pictureprofile: pictureprofile || ''
      };
      
      console.log("Final payload:", payload);
  
      const res = await axios.post("/api/teams", payload);
      dispatch(_AddTeam(res.data.data));
      dispatch(setRefresh(false));
      dispatch(setErrors({}));
      swal("Success", "Team created successfully", "success");
      return true;
    } catch (error) {
      console.error("Full error:", error.response?.data || error);
      dispatch(setErrors(error.response?.data || { 
        message: error.message || "An error occurred" 
      }));
      dispatch(setRefresh(false));
      return false;
    }
};

export const UpdateTeamAction = (id, form, callback) => async (dispatch) => {
    dispatch(setRefresh(true));
    
    try {
      let pictureprofile = form.pictureprofile;
      if (form.pictureprofile instanceof File) {
        pictureprofile = (await toBase64(form.pictureprofile)).replace(
          "data:image/png;base64,",
          ""
        );
      }
  
      // Make sure members is an array of user IDs
      let members = [];
      if (Array.isArray(form.members)) {
        // If members is already an array of IDs
        members = form.members.map(member => 
          typeof member === 'object' ? (member.value || member.user || member._id) : member
        );
      } else if (form.members && typeof form.members === 'object') {
        // If members is an object from react-select
        members = form.members.map(member => member.value || member._id || member.user || member);
      }
  
      const payload = {
        Name: form.Name,
        description: form.description,
        members: members,  // Ensure members is properly formatted
        pictureprofile: pictureprofile || undefined
      };
  
      console.log("Updating team with payload:", payload);
  
      const res = await axios.put(`/api/teams/${id}`, payload);
      dispatch(_UpdateTeam({ id, updates: res.data.data }));
      dispatch(setRefresh(false));
      dispatch(setErrors({}));
      swal("Success", "Team updated successfully", "success");
      
      if (typeof callback === 'function') {
        callback(); // Execute the callback function if provided
      }
      
      return true; // Return success value
    } catch (error) {
      console.error("Error updating team:", error);
      dispatch(setErrors(error.response?.data || { message: "An error occurred" }));
      dispatch(setRefresh(false));
      return false; // Return failure
    }
  };

export const GetAllTeamsAction = () => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.get("/api/teams");
    dispatch(_FindTeams(res.data.data));
    dispatch(setRefresh(false));
  } catch (error) {
    console.error("Error fetching teams:", error);
    dispatch(setErrors(error.response?.data || { message: "An error occurred" }));
    dispatch(setRefresh(false));
  }
};

export const GetUserTeamsAction = () => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.get("/api/teams/user");
    dispatch(_SetUserTeams(res.data.data));
    dispatch(setRefresh(false));
  } catch (error) {
    dispatch(setErrors(error.response?.data || { message: "An error occurred" }));
    dispatch(setRefresh(false));
  }
};

// Debug version to help find the correct action types
// Replace your GetTeamAction with this temporarily to see what's in your store:

// Updated GetTeamAction with proper Redux integration
export const GetTeamAction = (teamId) => async (dispatch, getState) => {
  try {
    console.log('GetTeamAction called with teamId:', teamId);
    
    // Don't set loading directly, use your reducer action
    dispatch({ type: 'teams/loading', payload: true });
    
    // Make the API call
    const res = await axios.get(`/api/teams/${teamId}`);
    
    console.log('API Response:', res.data);
    
    if (res.data) {
      // Handle different API response formats
      let team;
      if (res.data.team) {
        team = res.data.team;
      } else if (res.data.data) {
        team = res.data.data;
      } else {
        team = res.data;
      }
      
      // Use your existing reducer action to store the team
      dispatch(_FindOneTeam(team));
      
      return { team };
    } else {
      throw new Error('No team data in response');
    }
  } catch (err) {
    console.error('Error fetching team:', err);
    const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch team';
    
    // Dispatch error using your existing error action
    dispatch(setErrors({ message: errorMsg }));
    
    throw new Error(errorMsg);
  } finally {
    dispatch({ type: 'teams/loading', payload: false });
  }
};

export const DeleteTeamAction = (id) => async (dispatch) => {
  try {
    await axios.delete(`/api/teams/${id}`);
    dispatch(_DeleteTeam(id));
    swal("Success", "Team deleted successfully", "success");
    return true;
  } catch (error) {
    console.error("Error deleting team:", error);
    dispatch(setErrors(error.response?.data || { message: "Delete failed" }));
    return false;
  }
};

export const AddMemberAction = (teamId, userId, role = "ENGINEER") => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.post(`/api/teams/${teamId}/members`, { userId, role });
    dispatch(_AddTeamMember({ teamId, member: res.data.member }));
    dispatch(setRefresh(false));
    swal("Success", "Member added successfully", "success");
    return true;
  } catch (error) {
    console.error("Error adding member:", error);
    dispatch(setErrors(error.response?.data || { message: "An error occurred" }));
    dispatch(setRefresh(false));
    return false;
  }
};

export const RemoveMemberAction = (teamId, userId) => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    await axios.delete(`/api/teams/${teamId}/members`, { data: { userId } });
    dispatch(_RemoveTeamMember({ teamId, userId }));
    dispatch(setRefresh(false));
    swal("Success", "Member removed successfully", "success");
    return true;
  } catch (error) {
    console.error("Error removing member:", error);
    dispatch(setErrors(error.response?.data || { message: "An error occurred" }));
    dispatch(setRefresh(false));
    return false;
  }
};

export const UpdateMemberRoleAction = (teamId, userId, role) => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    await axios.put(`/api/teams/${teamId}/members/role`, { userId, role });
    dispatch(_UpdateMemberRole({ teamId, userId, role }));
    dispatch(setRefresh(false));
    swal("Success", "Member role updated successfully", "success");
    return true;
  } catch (error) {
    console.error("Error updating member role:", error);
    dispatch(setErrors(error.response?.data || { message: "An error occurred" }));
    dispatch(setRefresh(false));
    return false;
  }
};

// redux/actions/teams.js - Add these new actions

// Get team statistics
// Improved GetTeamStatsAction function that properly handles both API formats
// Updated GetTeamStatsAction to include post count from team posts API
// Optimized GetTeamStatsAction with better performance
export const GetTeamStatsAction = (teamId) => async (dispatch) => {
  dispatch(setRefresh(true));
  
  try {
    // Make both API calls concurrently instead of sequentially
    const [statsRes, postsRes] = await Promise.all([
      axios.get(`/api/teams/${teamId}/stats`),
      axios.get(`/api/teams/${teamId}/posts`)
    ]);
    
    let statsObj = {};
    if (statsRes.data && statsRes.data.data) {
      statsObj = statsRes.data.data;
    }
    
    // Get posts count
    const postsCount = postsRes.data.count || postsRes.data.data?.length || 0;
    
    // Combine stats with post count
    const combinedStats = {
      ...statsObj,
      // Add properties for TeamHome.jsx
      posts: {
        total: postsCount
      },
      // Add properties for UserTeamsOverview.jsx
      projectCount: statsObj.projects?.total || 0,
      taskCount: statsObj.tasks?.total || 0,
      postCount: postsCount
    };
    
    dispatch(setRefresh(false));
    return combinedStats;
  } catch (error) {
    console.error("Error fetching team stats:", error);
    
    try {
      // Fallback - try to get team details and check if we at least have posts data
      let teamData = null;
      let postsCount = 0;
      
      // Try to get team data
      try {
        const teamRes = await axios.get(`/api/teams/${teamId}`);
        teamData = teamRes.data.data || teamRes.data;
      } catch (teamError) {
        console.warn("Could not fetch team data:", teamError);
      }
      
      // Try to get posts count
      try {
        const postsRes = await axios.get(`/api/teams/${teamId}/posts`);
        postsCount = postsRes.data.count || postsRes.data.data?.length || 0;
      } catch (postsError) {
        console.warn("Could not fetch posts:", postsError);
      }
      
      const stats = {
        projectCount: teamData?.projects?.length || 0,
        taskCount: teamData?.tasks?.length || 0,
        postCount: postsCount
      };
      
      dispatch(setRefresh(false));
      return stats;
    } catch (fallbackError) {
      console.error("All fallback attempts failed:", fallbackError);
      dispatch(setRefresh(false));
      dispatch(setErrors({ message: "Failed to fetch team stats" }));
      
      return {
        projectCount: 0,
        taskCount: 0,
        postCount: 0
      };
    }
  }
};

// Format relative time
export const formatRelativeTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now - targetDate) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return targetDate.toLocaleDateString();
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Get status color class
export const getStatusColorClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'bg-success text-white';
    case 'in progress':
      return 'bg-primary text-white';
    case 'to do':
      return 'bg-gray-500 text-white';
    case 'planning':
    case 'review':
      return 'bg-info text-white';
    case 'overdue':
    case 'on hold':
      return 'bg-danger text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

// Get priority color class
export const getPriorityColorClass = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high':
    case 'critical':
      return 'text-danger';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-success';
    default:
      return 'text-gray-500';
  }
};

// Convert status codes to labels
export const getStatusLabel = (statusCode) => {
  switch (statusCode) {
    case '1': return 'To Do';
    case '2': return 'In Progress';
    case '3': return 'Review';
    case '4': return 'Completed';
    default: return 'Unknown';
  }
};

// Convert priority codes to labels  
export const getPriorityLabel = (priorityCode) => {
  switch (priorityCode) {
    case '1': return 'Low';
    case '2': return 'Medium';
    case '3': return 'High';
    case '4': return 'Critical';
    default: return 'Medium';
  }
};

// Check if task is overdue
export const isOverdue = (dueDate) => {
  return dueDate && new Date(dueDate) < new Date();
};

// Calculate project progress
export const calculateProgress = (project) => {
  if (!project) return 0;
  
  if (project.status === 'completed') return 100;
  if (project.status === 'on hold') return 50;
  
  const start = new Date(project.start_date);
  const end = new Date(project.end_date);
  const now = new Date();
  
  if (now < start) return 0;
  if (now > end) return 95;
  
  const totalDuration = end - start;
  const elapsedDuration = now - start;
  return Math.min(Math.floor((elapsedDuration / totalDuration) * 100), 95);
};