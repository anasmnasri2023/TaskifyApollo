const express = require("express");
const Router = express.Router();
const Controllers = require("../controllers/tasks");
const passport = require("passport");
const upload = require('../middlewares/fileUpload');

// Create task with file upload
Router.post(
  "/tasks", 
  passport.authenticate("jwt", { session: false }),
  upload.single('attachment'),
  Controllers.Add
);

// Add task from suggestion
Router.post(
  "/tasks/addFromSuggestion",
  passport.authenticate("jwt", { session: false }),
  Controllers.AddFromSuggestion
);

// Get all tasks
Router.get(
  "/tasks",
  passport.authenticate("jwt", { session: false }),
  Controllers.GetAll
);

// Get single task
Router.get(
  "/tasks/:id",
  passport.authenticate("jwt", { session: false }),
  Controllers.GetOne
);

// Update task with file upload
Router.put(
  "/tasks/:id",
  passport.authenticate("jwt", { session: false }),
  upload.single('attachment'),
  Controllers.UpdateOne
);

// Delete task
Router.delete(
  "/tasks/:id",
  passport.authenticate("jwt", { session: false }),
  Controllers.DeleteOne
);

// Download attachment
Router.get(
  "/tasks/:id/attachment",
  passport.authenticate("jwt", { session: false }),
  Controllers.DownloadAttachment
);

// Delete attachment
Router.delete(
  "/tasks/:id/attachment",
  passport.authenticate("jwt", { session: false }),
  Controllers.DeleteAttachment
);

// Reschedule task (update date via drag and drop)
Router.patch(
  "/tasks/:id/reschedule",
  passport.authenticate("jwt", { session: false }),
  Controllers.RescheduleTask
);

module.exports = Router;