// lib/setAuthToken.js - Enhanced version that includes debugging

import axios from "axios";

export const setAuthToken = (token) => {
  if (token) {
    // Apply to every request
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    console.log("[Auth] Token applied to axios headers");
  } else {
    // Delete auth header
    delete axios.defaults.headers.common["Authorization"];
    console.log("[Auth] Token removed from axios headers");
  }
};

// Add this function to your existing file
export const checkAuthHeaders = () => {
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