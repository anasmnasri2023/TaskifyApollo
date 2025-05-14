// redux/actions/smartAssign.js
import axios from "axios";

// Action Types
export const SMART_ASSIGN_LOADING = "SMART_ASSIGN_LOADING";
export const SMART_ASSIGN_ERROR = "SMART_ASSIGN_ERROR";
export const DETECT_SKILLS_SUCCESS = "DETECT_SKILLS_SUCCESS";
export const FIND_MATCHING_USERS_SUCCESS = "FIND_MATCHING_USERS_SUCCESS";
export const CLEAR_SMART_ASSIGN = "CLEAR_SMART_ASSIGN";

/**
 * Detect skills from a task description
 * @param {string} description - The task description
 * @returns {Promise} - Redux thunk action
 */
export const DetectSkillsAction = (description) => {
  return async (dispatch) => {
    dispatch({ type: SMART_ASSIGN_LOADING, payload: true });
    
    try {
      const response = await axios.post(
        "/api/smart-assign/predict-skills",
        { description },
        { withCredentials: true }
      );
      
      dispatch({
        type: DETECT_SKILLS_SUCCESS,
        payload: response.data.skills
      });
      
      return response.data.skills;
    } catch (error) {
      console.error("Error detecting skills:", error);
      
      dispatch({
        type: SMART_ASSIGN_ERROR,
        payload: error.response?.data?.msg || "Failed to detect skills"
      });
      
      throw error;
    } finally {
      dispatch({ type: SMART_ASSIGN_LOADING, payload: false });
    }
  };
};

/**
 * Find users matching skills
 * @param {Array} skills - Array of skill objects with value and label
 * @returns {Promise} - Redux thunk action
 */
export const FindMatchingUsersAction = (skills) => {
  return async (dispatch) => {
    dispatch({ type: SMART_ASSIGN_LOADING, payload: true });
    
    try {
      const response = await axios.post(
        "/api/smart-assign/find-matching-users",
        { skills },
        { withCredentials: true }
      );
      
      dispatch({
        type: FIND_MATCHING_USERS_SUCCESS,
        payload: response.data.recommendedUsers
      });
      
      return response.data.recommendedUsers;
    } catch (error) {
      console.error("Error finding matching users:", error);
      
      dispatch({
        type: SMART_ASSIGN_ERROR,
        payload: error.response?.data?.msg || "Failed to find matching users"
      });
      
      throw error;
    } finally {
      dispatch({ type: SMART_ASSIGN_LOADING, payload: false });
    }
  };
};

/**
 * Clear smart assign state
 * @returns {Object} - Redux action
 */
export const ClearSmartAssignAction = () => ({
  type: CLEAR_SMART_ASSIGN
});