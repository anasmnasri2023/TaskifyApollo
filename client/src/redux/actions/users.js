import axios from "axios";
import { setErrors } from "../reducers/errors";
import swal from "sweetalert";
import {
  _AddUser,
  _FilterUser,
  _FindOneUser,
  _FindUsers,
  _setCurrentUser,
  _FetchSkillsOfUsers
} from "../reducers/users";
import { setRefresh } from "../reducers/commons";
import { setAuthToken } from "../../lib/setAuthToken"; // Correct import path

// Add checkAuthHeaders function directly in this file to avoid import issues
const checkAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const currentHeader = axios.defaults.headers.common["Authorization"];
  
  console.log("[Auth] Current Authorization header:", currentHeader);
  console.log("[Auth] Token in localStorage:", token ? "Present" : "Missing");
  
  // If token exists but header doesn't match, reapply it
  if (token && (!currentHeader || currentHeader !== `Bearer ${token}`)) {
    console.log("[Auth] Reapplying token to headers");
    setAuthToken(token);
    return true;
  }
  
  return false;
};

// Debug logs
const logAction = (action, data) => {
  console.log(`[ACTION] ${action}`, data || '');
};

export const AddUser = (form, setPopupOpen) => async (dispatch) => {
  console.log('AddUser called with form data:', form);
  
  dispatch(setRefresh(true));
  
  try {
    // Make the API request
    const res = await axios.post("/api/users", form);
    console.log('AddUser API response:', res.data);
    
    // Show success message
    swal("Success", "User Added successfully", "success");
    
    // Update Redux store
    dispatch(_AddUser(res.data.data || res.data));
    
    // Close the popup
    if (typeof setPopupOpen === 'function') {
      setPopupOpen(false);
    }
    
    // Refresh the user list to show the new user
    dispatch(FindUsers());
    
    // Add a slight delay to ensure the UI updates
    setTimeout(() => {
      // Refresh the page to ensure everything is updated
      window.location.reload();
    }, 1000);
    
    dispatch(setRefresh(false));
  } catch (err) {
    console.error('AddUser API error:', err.response?.data || err.message);
    
    dispatch(setErrors(err?.response?.data || { message: "Error adding user" }));
    swal("Error", err?.response?.data?.message || "Failed to add user", "error");
    dispatch(setRefresh(false));
  }
};

export const FindUsers = () => async (dispatch) => {
  logAction('FindUsers');
  
  // Ensure auth headers are set correctly
  checkAuthHeaders();
  
  dispatch(setRefresh(true));
  
  try {
    const res = await axios.get("/api/users");
    logAction('FindUsers Success', res.data);
    
    const { data } = res.data;
    dispatch(_FindUsers(data || []));
    dispatch(setRefresh(false));
  } catch (err) {
    logAction('FindUsers Error', err);
    
    dispatch(setErrors(err?.response?.data || { message: "Error fetching users" }));
    dispatch(setRefresh(false));
  }
};

export const FindOneUser = (id) => async (dispatch) => {
  console.log('FindOneUser called with ID:', id);
  
  if (!id) {
    console.log('Empty ID provided, returning empty object');
    dispatch(_FindOneUser({}));
    return;
  }
  
  dispatch(setRefresh(true));
  
  try {
    const res = await axios.get(`/api/users/${id}`);
    console.log('FindOneUser API response:', res.data);
    
    const data = res.data;
    
    // Dispatch the action to store the user data
    dispatch(_FindOneUser(data));
    
    // Ensure the loading state is removed
    setTimeout(() => {
      dispatch(setRefresh(false));
    }, 500);
  } catch (err) {
    console.error('FindOneUser API error:', err.response?.data || err.message);
    dispatch(setErrors(err?.response?.data || { message: 'Failed to fetch user' }));
    dispatch(setRefresh(false));
  }
};

export const UpdateUser = (form, id, setPopupOpen) => async (dispatch) => {
  logAction('UpdateUser', { form, id });
  
  if (!id) {
    swal("Error", "User ID is missing", "error");
    return;
  }
  
  // Ensure auth headers are set correctly
  checkAuthHeaders();
  
  dispatch(setRefresh(true));
  
  try {
    const res = await axios.put(`/api/users/${id}`, form);
    logAction('UpdateUser Success', res.data);
    
    const { data } = res.data;
    swal("Success", "User Updated successfully", "success");
    dispatch(_FindOneUser(data));
    dispatch(FindUsers());
    
    setTimeout(() => {
      dispatch(setRefresh(false));
    }, 1000);
    
    if (typeof setPopupOpen === 'function') {
      setPopupOpen(false);
    }
  } catch (err) {
    logAction('UpdateUser Error', err);
    
    dispatch(setErrors(err?.response?.data || { message: "Error updating user" }));
    swal("Error", err?.response?.data?.message || "Failed to update user", "error");
    dispatch(setRefresh(false));
  }
};

export const DeleteUsers = (id) => async (dispatch) => {
  console.log('DeleteUsers called with ID:', id);
  
  if (!id) {
    console.log('Empty ID provided, cannot delete');
    return;
  }
  
  // Use window.confirm for the confirmation dialog
  if (window.confirm("Do you want to delete this user?")) {
    console.log('User confirmed deletion');
    dispatch(setRefresh(true));
    
    try {
      console.log('Making delete API call to:', `/api/users/${id}`);
      const res = await axios.delete(`/api/users/${id}`);
      console.log('DeleteUsers API response:', res.data);
      
      // Show success message
      swal("Success", "User deleted successfully", "success");
      
      // Update Redux state to remove the user
      dispatch(_FilterUser(id));
      
      // Refresh user list 
      dispatch(FindUsers());
      
      dispatch(setRefresh(false));
    } catch (err) {
      console.error('DeleteUsers API error:', err.response?.data || err.message);
      dispatch(setErrors(err?.response?.data || { message: 'Failed to delete user' }));
      
      // Show error message
      swal("Error", err?.response?.data?.message || "Failed to delete user", "error");
      
      dispatch(setRefresh(false));
    }
  } else {
    console.log('User cancelled deletion');
  }
};

export const UploadProfileImage = (formData) => async (dispatch) => {
  logAction('UploadProfileImage');
  
  // Ensure auth headers are set correctly
  checkAuthHeaders();
  
  dispatch(setRefresh(true));
  
  try {
    console.log('[ACTION] UploadProfileImage FormData contains picture:', 
      formData.has('picture') ? 'Yes' : 'No');
      
    const res = await axios.post("/api/images", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    logAction('UploadProfileImage Success', res.data);
    
    const { data } = res.data;
    swal("Success", "Profile image updated successfully", "success");
    dispatch(_setCurrentUser(data));
    dispatch(setRefresh(false));
    
    return data;
  } catch (err) {
    logAction('UploadProfileImage Error', err);
    
    // More detailed error message
    const errorDetail = err.response?.data?.message || err.message || "Unknown error";
    console.error('[ACTION] UploadProfileImage Error details:', errorDetail);
    
    dispatch(setErrors(err?.response?.data || { message: `Error uploading image: ${errorDetail}` }));
    swal("Error", `Failed to upload profile image: ${errorDetail}`, "error");
    dispatch(setRefresh(false));
    
    throw err;
  }
};

export const UpdateMyProfile = (form) => async (dispatch) => {
  logAction('UpdateMyProfile', form);
  
  // Ensure auth headers are set correctly
  checkAuthHeaders();
  
  dispatch(setRefresh(true));
  
  try {
    const response = await axios.put('/api/profile', form);
    logAction('UpdateMyProfile Success', response.data);
    
    const { data } = response.data;

    if (!data) {
      throw new Error('No user data returned');
    }
    
    swal("Success", "Profile Updated successfully", "success");
    dispatch(_setCurrentUser(data));
    dispatch(setRefresh(false));
    
    return data;
  } catch (err) {
    logAction('UpdateMyProfile Error', err);
    
    const errorMessage = err.response?.data?.message || 
                         err.message || 
                         "Failed to update profile";
    
    dispatch(setErrors(err.response?.data || { message: errorMessage }));
    swal("Error", errorMessage, "error");
    dispatch(setRefresh(false));
    
    throw err;
  }
};


export const FetchSkillsOfUsers = () => async (dispatch) => {
  logAction('FetchSkillsOfUsers');
  
  // Ensure auth headers are set correctly
  checkAuthHeaders();
  
  dispatch(setRefresh(true));
  
  try {
    const res = await axios.get("/api/users/calculateSkills");
    logAction('FetchSkillsOfUsers Success', res.data);
    
    const { data } = res;
    console.log("data from fetchskillof users",res)
    dispatch(_FetchSkillsOfUsers(data || []));
    dispatch(setRefresh(false));
  } catch (err) {
    logAction('FindUsers Error', err);
    
    dispatch(setErrors(err?.response?.data || { message: "Error fetching skills" }));
    dispatch(setRefresh(false));
  }
};