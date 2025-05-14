const express = require("express");
const router = express.Router();
const passport = require("passport");

// Import TeamPosts controller
const {
  getTeamPosts,
  createTeamPost,
  addComment,
  toggleLike,
  deletePost
} = require("../controllers/teamPosts");

// Protect all routes with authentication
const authMiddleware = passport.authenticate("jwt", { session: false });

// GET - Get all posts for a team
router.get("/teams/:teamId/posts", authMiddleware, getTeamPosts);

// POST - Create a new post in a team
router.post("/teams/:teamId/posts", authMiddleware, createTeamPost);

// POST - Add a comment to a post
router.post("/posts/:postId/comments", authMiddleware, addComment);

// PUT - Like or unlike a post
router.put("/posts/:postId/like", authMiddleware, toggleLike);

// DELETE - Delete a post
router.delete("/posts/:postId", authMiddleware, deletePost);

module.exports = router;