import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  posts: [],
  loading: false,
  error: null
};

export const teamPostsSlice = createSlice({
  name: "teamPosts",
  initialState,
  reducers: {
    _SetTeamPosts: (state, action) => {
      state.posts = action.payload;
    },
    _AddTeamPost: (state, action) => {
      state.posts = [action.payload, ...state.posts];
    },
    _UpdateTeamPost: (state, action) => {
      state.posts = state.posts.map(post => 
        post._id === action.payload._id ? action.payload : post
      );
    },
    _DeleteTeamPost: (state, action) => {
      state.posts = state.posts.filter(post => post._id !== action.payload);
    },
    _AddComment: (state, action) => {
      // Replace the post with the updated one that includes the new comment
      state.posts = state.posts.map(post => 
        post._id === action.payload._id ? action.payload : post
      );
    },
    _ToggleLike: (state, action) => {
      // Replace the post with the updated one that includes the updated likes
      state.posts = state.posts.map(post => 
        post._id === action.payload._id ? action.payload : post
      );
    }
  }
});

export const {
  _SetTeamPosts,
  _AddTeamPost,
  _UpdateTeamPost,
  _DeleteTeamPost,
  _AddComment,
  _ToggleLike
} = teamPostsSlice.actions;

export default teamPostsSlice.reducer;