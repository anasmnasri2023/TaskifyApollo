// routes/images.router.js
const express = require("express");
const Router = express.Router();
const passport = require("passport");
const { Upload, TestCloudinary } = require("../controllers/cloudinaryUpload");

// Test route to check Cloudinary connectivity
Router.get(
  "/test-cloudinary",
  TestCloudinary
);

// Image upload route with authentication
Router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  Upload  // This handles both the middleware and the upload
);

module.exports = Router;