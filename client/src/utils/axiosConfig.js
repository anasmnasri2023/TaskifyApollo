// Create this file as 'src/utils/axiosConfig.js'
import axios from 'axios';

// Configure axios to include authentication token in all requests
const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(
    config => {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (token) {
        // Add Authorization header to all requests
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle common errors
  axios.interceptors.response.use(
    response => response,
    error => {
      // Handle 401 Unauthorized errors
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed. Please log in again.');
        // Optionally redirect to login page
        // window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;