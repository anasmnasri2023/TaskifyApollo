const express = require("express");
const Router = express();
const passport = require("passport");
const { sendOTPEmail, verifyOTP, check2FAStatus, toggle2FA } = require("../controllers/auth/TwoFactorAuth");

// Public routes
Router.post("/send-email-code", sendOTPEmail);
Router.post("/verify-email-code", verifyOTP);

// Protected routes (require authentication)
Router.get(
  "/check",
  passport.authenticate("jwt", { session: false }),
  check2FAStatus
);

Router.post(
  "/toggle",
  passport.authenticate("jwt", { session: false }),
  toggle2FA
);

module.exports = Router;
