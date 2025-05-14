const express = require("express");
const Router = express.Router(); // Fix: Use express.Router() instead of express()
const Controllers = require("../controllers/comments");
const passport = require("passport");

// Add comment to a task
Router.post(
  "/tasks/:id/comments",
  passport.authenticate("jwt", { session: false }),
  Controllers.AddComment
);

// Get comments for a task
Router.get(
  "/tasks/:id/comments", 
  passport.authenticate("jwt", { session: false }), 
  Controllers.GetComments
);

// Delete a comment
Router.delete(
  "/tasks/:id/comments/:c_id",
  passport.authenticate("jwt", { session: false }),
  Controllers.DeleteComment
);

module.exports = Router;