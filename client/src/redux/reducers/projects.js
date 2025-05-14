import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching projects
export const GetProjectsAction = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      // Get the authentication token from local storage
      const token = localStorage.getItem('token');

      // Fetch projects with authentication
      const response = await axios.get('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Return the projects data
      return response.data.data;
    } catch (error) {
      // Handle errors
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch projects' });
    }
  }
);

// Projects slice
export const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    projects: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(GetProjectsAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(GetProjectsAction.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
        state.error = null;
      })
      .addCase(GetProjectsAction.rejected, (state, action) => {
        state.loading = false;
        state.projects = [];
        state.error = action.payload;
      });
  }
});

export default projectsSlice.reducer;