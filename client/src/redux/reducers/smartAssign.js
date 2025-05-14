// redux/reducers/smartAssign.js
import {
  SMART_ASSIGN_LOADING,
  SMART_ASSIGN_ERROR,
  DETECT_SKILLS_SUCCESS,
  FIND_MATCHING_USERS_SUCCESS,
  CLEAR_SMART_ASSIGN
} from "../actions/smartAssign";

// Initial state
const initialState = {
  loading: false,
  error: null,
  detectedSkills: [],
  recommendedUsers: []
};

/**
 * Smart Assign reducer
 * @param {Object} state - Current state
 * @param {Object} action - Redux action
 * @returns {Object} - New state
 */
const smartAssignReducer = (state = initialState, action) => {
  switch (action.type) {
    case SMART_ASSIGN_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case SMART_ASSIGN_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
      
    case DETECT_SKILLS_SUCCESS:
      return {
        ...state,
        detectedSkills: action.payload,
        error: null
      };
      
    case FIND_MATCHING_USERS_SUCCESS:
      return {
        ...state,
        recommendedUsers: action.payload,
        error: null
      };
      
    case CLEAR_SMART_ASSIGN:
      return initialState;
      
    default:
      return state;
  }
};

export default smartAssignReducer;