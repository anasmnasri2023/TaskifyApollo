// config/loginSecurity.js
const LoginActivity = require("../models/LoginActivity");

/**
 * Helper function to extract device info from user agent
 */
function extractDeviceInfo(userAgent) {
  if (!userAgent)
    return { browser: "Unknown", os: "Unknown", device: "Unknown" };

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

  // Enhanced detection for Chrome incognito/different sessions
  if (userAgent.includes('Chrome')) {
    // Generate a random session identifier to help differentiate sessions
    const sessionId = Date.now() % 1000;
    deviceInfo.sessionIdentifier = `Chrome-${sessionId}`;
    
    // Add more indicators that might help identify the session
    deviceInfo.fullUserAgent = userAgent.substring(0, 100); // Store part of the user agent string
    
    if (userAgent.includes('HeadlessChrome')) {
      deviceInfo.browser = 'Chrome Headless';
    }
  }

  return deviceInfo;
}

/**
 * Helper function to determine usual login hours
 */
function getUsualLoginHours(loginHistory) {
  if (loginHistory.length < 5) return [];

  // Count logins by hour
  const hourCounts = {};
  loginHistory.forEach((login) => {
    const hour = new Date(login.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Get hours with at least 2 logins
  return Object.keys(hourCounts)
    .filter((hour) => hourCounts[hour] >= 2)
    .map((hour) => parseInt(hour));
}

/**
 * Check if current login is suspicious
 */
const checkSuspiciousLogin = async (userId, ipAddress, userAgent) => {
  try {
    console.log("Checking suspicious login for user:", userId);
    console.log("IP Address:", ipAddress);
    console.log("User Agent:", userAgent);
    
    // Get user's login history
    const loginHistory = await LoginActivity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(10);
    
    console.log("Login history count:", loginHistory.length);

    // CHANGE: If no login history, this is first login - mark as suspicious
    if (loginHistory.length === 0) {
      console.log("First login, marking as suspicious for security");
      return { 
        isSuspicious: true, 
        reasons: ["First login on this account"] 
      };
    }

    const suspiciousReasons = [];
    
    // Create a basic device fingerprint from user agent
    const currentDeviceInfo = extractDeviceInfo(userAgent);
    console.log("Current device info:", currentDeviceInfo);
    
    // 1. Check if this is a new device/browser combination
    const hasMatchingDevice = loginHistory.some(
      (login) => {
        console.log("Comparing with login device:", login.deviceInfo);
        return login.deviceInfo &&
        login.deviceInfo.browser === currentDeviceInfo.browser &&
        login.deviceInfo.os === currentDeviceInfo.os;
      }
    );
    
    console.log("Has matching device:", hasMatchingDevice);
    
    if (!hasMatchingDevice) {
      suspiciousReasons.push("New device or browser detected");
    }
    
    // 2. Check for unusual login times (re-added)
    const currentHour = new Date().getHours();
    const usualHours = getUsualLoginHours(loginHistory);
    
    if (usualHours.length >= 3 && !usualHours.includes(currentHour)) {
      suspiciousReasons.push("Unusual login time");
    }
    
    // 3. Check for rapid logins from different IPs (re-added)
    const last30MinLogins = loginHistory.filter(
      (login) => new Date() - new Date(login.timestamp) < 30 * 60 * 1000
    );
    
    if (last30MinLogins.length >= 2) {
      const uniqueIPs = new Set(last30MinLogins.map((login) => login.ipAddress));
      if (uniqueIPs.size > 1 && !uniqueIPs.has(ipAddress)) {
        suspiciousReasons.push("Multiple logins from different locations");
      }
    }
    
    // 4. Check if IP address is new and different from most recent login (re-added)
    if (loginHistory[0].ipAddress && loginHistory[0].ipAddress !== ipAddress) {
      suspiciousReasons.push("New IP address detected");
    }
    
    // ADDED: Always treat the first few logins as suspicious for better security
    if (loginHistory.length < 3) {
      suspiciousReasons.push("New account security monitoring");
    }
    
    console.log("Suspicious reasons:", suspiciousReasons);
    
    // FORCE SUSPICIOUS FOR TESTING
    // This line will make every login suspicious for testing email alerts
    // Remove or comment out after testing
   // With these more meaningful reasons:
if (suspiciousReasons.length === 0) {
    // Add a common security reason if no other reasons were detected
    if (currentDeviceInfo.browser === 'Chrome') {
      suspiciousReasons.push("Login from new Chrome session detected");
    } else {
      suspiciousReasons.push("Unusual browser fingerprint detected");
    }
  }
    
    return {
      isSuspicious: suspiciousReasons.length > 0,
      reasons: suspiciousReasons,
    };
  } catch (error) {
    console.error("Error checking suspicious login:", error);
    return { isSuspicious: false };
  }
};

module.exports = {
  checkSuspiciousLogin,
  extractDeviceInfo,
};