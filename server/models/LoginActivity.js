// models/LoginActivity.js
const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Make sure this matches your User model name
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
  },
  successful: {
    type: Boolean,
    default: true,
  },
  isSuspicious: {
    type: Boolean,
    default: false,
  },
  suspiciousReason: [String],
  twoFactorRequired: {
    type: Boolean,
    default: false,
  },
});

// Pre-process user agent to extract device info
loginActivitySchema.pre("save", function (next) {
  const userAgent = this.userAgent;
  if (!userAgent) return next();

  // Extract device info
  const deviceInfo = {
    browser: "Unknown",
    os: "Unknown",
    device: "Unknown",
  };

  // Basic OS detection
  if (userAgent.includes("Windows")) deviceInfo.os = "Windows";
  else if (userAgent.includes("Mac")) deviceInfo.os = "Mac";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad"))
    deviceInfo.os = "iOS";
  else if (userAgent.includes("Android")) deviceInfo.os = "Android";
  else if (userAgent.includes("Linux")) deviceInfo.os = "Linux";

  // Basic browser detection
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg"))
    deviceInfo.browser = "Chrome";
  else if (userAgent.includes("Firefox")) deviceInfo.browser = "Firefox";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    deviceInfo.browser = "Safari";
  else if (userAgent.includes("Edg")) deviceInfo.browser = "Edge";

  // Basic device type
  if (userAgent.includes("Mobile")) deviceInfo.device = "Mobile";
  else if (userAgent.includes("Tablet")) deviceInfo.device = "Tablet";
  else deviceInfo.device = "Desktop";

  this.deviceInfo = deviceInfo;
  next();
});

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);
module.exports = LoginActivity;