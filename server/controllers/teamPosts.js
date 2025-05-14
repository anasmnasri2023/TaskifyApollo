const teamsModel = require("../models/teams");
const TeamPostModel = require("../models/teamposts");
const mongoose = require("mongoose");
const socket = require("../socket");
const { addNotification } = require("./notifications");

// Get all posts for a team
const getTeamPosts = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // First check if the team exists and if the user is a member
    const team = await teamsModel.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Check if user is a member of the team
    const isMember = team.members.some(
      member => member.user.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }
    
    // Get all posts for the team with populated data
    const posts = await TeamPostModel.find({ team: teamId })
      .populate('author', '-password')
      .populate('comments.author', '-password')
      .populate('likes', '-password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error("Error getting team posts:", error);
    res.status(500).json({ 
      success: false,
      message: "Error retrieving team posts",
      error: error.message 
    });
  }
};

// Create a new post in a team
const createTeamPost = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { content } = req.body;
    
    // Validate request
    if (!content) {
      return res.status(400).json({ message: "Post content is required" });
    }
    
    // Check if team exists and user is a member
    const team = await teamsModel.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    const isMember = team.members.some(
      member => member.user.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }
    
    // Create the post
    const newPost = new TeamPostModel({
      team: teamId,
      content,
      author: req.user._id,
      attachments: req.body.attachments || []
    });
    
    await newPost.save();
    
    // Populate the author field for the response
    const populatedPost = await TeamPostModel.findById(newPost._id)
      .populate('author', '-password');
    
    // Notify team members
    const memberIds = team.members
      .filter(member => member.user.toString() !== req.user._id.toString())
      .map(member => member.user);
    
    if (memberIds.length > 0) {
      // Notify team members one by one
      for (const memberId of memberIds) {
        const notification = await addNotification({
          receiver: memberId,  // Changed from 'receivers' to 'receiver'
          link: `/teams/${teamId}/posts`,
          text: `${req.user.fullName} posted in team ${team.Name}`
        });
        
        // Send notification to this specific user
        const userSockets = socket.methods.getUserSockets(memberId);
        if (userSockets.length > 0) {
          socket.io.to(userSockets).emit("notification", notification);
        }
      }
      
      // NOTE: Removed the duplicate notification emit code that was here
      // as we're already sending notifications to each user in the loop above
    }
    
    res.status(201).json({
      success: true,
      data: populatedPost
    });
  } catch (error) {
    console.error("Error creating team post:", error);
    res.status(500).json({
      success: false,
      message: "Error creating team post",
      error: error.message
    });
  }
};

// Add a comment to a post
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }
    
    // Find the post
    const post = await TeamPostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user is a member of the team
    const team = await teamsModel.findById(post.team);
    const isMember = team.members.some(
      member => member.user.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }
    
    // Add the comment
    const newComment = {
      content,
      author: req.user._id,
      createdAt: new Date()
    };
    
    post.comments.push(newComment);
    await post.save();
    
    // Populate the updated post
    const updatedPost = await TeamPostModel.findById(postId)
      .populate('author', '-password')
      .populate('comments.author', '-password')
      .populate('likes', '-password');
    
    // Notify the post author if it's not the same as the commenter
    if (post.author.toString() !== req.user._id.toString()) {
      const notification = await addNotification({
        receiver: post.author,
        link: `/teams/${post.team}/posts`,
        text: `${req.user.fullName} commented on your post in team ${team.Name}`
      });
      
      const authorSockets = socket.methods.getUserSockets(post.author);
      if (authorSockets.length > 0) {
        socket.io.to(authorSockets).emit("notification", notification);
      }
    }
    
    res.status(200).json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message
    });
  }
};

// Like/unlike a post
const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Find the post
    const post = await TeamPostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user is a member of the team
    const team = await teamsModel.findById(post.team);
    const isMember = team.members.some(
      member => member.user.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }
    
    // Check if user already liked the post
    const likeIndex = post.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      // User already liked, so unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // User hasn't liked, so add like
      post.likes.push(req.user._id);
      
      // Notify the post author if it's not the same as the liker
      if (post.author.toString() !== req.user._id.toString()) {
        const notification = await addNotification({
          receiver: post.author,
          link: `/teams/${post.team}/posts`,
          text: `${req.user.fullName} liked your post in team ${team.Name}`
        });
        
        const authorSockets = socket.methods.getUserSockets(post.author);
        if (authorSockets.length > 0) {
          socket.io.to(authorSockets).emit("notification", notification);
        }
      }
    }
    
    await post.save();
    
    // Populate the updated post
    const updatedPost = await TeamPostModel.findById(postId)
      .populate('author', '-password')
      .populate('comments.author', '-password')
      .populate('likes', '-password');
    
    res.status(200).json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling like",
      error: error.message
    });
  }
};

// Delete a post (only author or team admin can delete)
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Find the post
    const post = await TeamPostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user is post author or team admin
    const team = await teamsModel.findById(post.team);
    
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = team.members.some(
      member => member.user.toString() === req.user._id.toString() && member.role === "ADMIN"
    );
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ 
        message: "You don't have permission to delete this post" 
      });
    }
    
    // Delete the post
    await TeamPostModel.findByIdAndDelete(postId);
    
    res.status(200).json({
      success: true,
      message: "Post deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message
    });
  }
};

module.exports = {
  getTeamPosts,
  createTeamPost,
  addComment,
  toggleLike,
  deletePost
};