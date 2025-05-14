import axios from 'axios';

export const GetProjectsAction = () => async (dispatch) => {
  try {
    // Get the authentication token from local storage
    const token = localStorage.getItem('token');

    // Fetch projects with authentication
    const response = await axios.get('/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Dispatch success action with the fetched projects
    dispatch({
      type: 'GET_PROJECTS_SUCCESS',
      payload: response.data.data // Adjust based on your backend response structure
    });
  } catch (error) {
    // Dispatch failure action if fetching projects fails
    dispatch({
      type: 'GET_PROJECTS_FAIL',
      payload: error.response?.data || { message: 'Failed to fetch projects' }
    });
  }
};