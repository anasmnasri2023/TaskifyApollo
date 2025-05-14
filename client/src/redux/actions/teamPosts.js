import axios from "axios";
import swal from "sweetalert";
import { setRefresh } from "../reducers/commons";
import { setErrors } from "../reducers/errors";
import {
  _SetTeamPosts,
  _AddTeamPost,
  _UpdateTeamPost,
  _DeleteTeamPost,
  _AddComment,
  _ToggleLike
} from "../reducers/teamPosts";

// Get all posts for a team
export const GetTeamPostsAction = (teamId) => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.get(`/api/teams/${teamId}/posts`);
    dispatch(_SetTeamPosts(res.data.data));
    dispatch(setRefresh(false));
    return true;
  } catch (error) {
    console.error("Error fetching team posts:", error);
    dispatch(setErrors(error.response?.data || { message: "Failed to load posts" }));
    dispatch(setRefresh(false));
    return false;
  }
};

// Create a new post in a team
export const CreateTeamPostAction = (teamId, postData) => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.post(`/api/teams/${teamId}/posts`, postData);
    dispatch(_AddTeamPost(res.data.data));
    dispatch(setRefresh(false));
    return true;
  } catch (error) {
    console.error("Error creating post:", error);
    dispatch(setErrors(error.response?.data || { message: "Failed to create post" }));
    dispatch(setRefresh(false));
    swal("Error", "Failed to create post. Please try again.", "error");
    return false;
  }
};

// Add a comment to a post
export const AddCommentAction = (postId, content) => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.post(`/api/posts/${postId}/comments`, { content });
    dispatch(_AddComment(res.data.data));
    dispatch(setRefresh(false));
    return true;
  } catch (error) {
    console.error("Error adding comment:", error);
    dispatch(setErrors(error.response?.data || { message: "Failed to add comment" }));
    dispatch(setRefresh(false));
    return false;
  }
};

// Like or unlike a post
export const ToggleLikeAction = (postId) => async (dispatch) => {
  try {
    const res = await axios.put(`/api/posts/${postId}/like`);
    dispatch(_ToggleLike(res.data.data));
    return true;
  } catch (error) {
    console.error("Error toggling like:", error);
    dispatch(setErrors(error.response?.data || { message: "Failed to like/unlike post" }));
    return false;
  }
};

// Delete a post
export const DeletePostAction = (postId) => async (dispatch) => {
  try {
    await axios.delete(`/api/posts/${postId}`);
    dispatch(_DeleteTeamPost(postId));
    swal("Success", "Post deleted successfully", "success");
    return true;
  } catch (error) {
    console.error("Error deleting post:", error);
    dispatch(setErrors(error.response?.data || { message: "Failed to delete post" }));
    swal("Error", "Failed to delete post", "error");
    return false;
  }
};