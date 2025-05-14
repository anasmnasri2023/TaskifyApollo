// routes/loginActivity.js
const express = require("express");
const router = express.Router();
const LoginActivity = require("../models/LoginActivity");

// Get user's login activity - without auth middleware for now
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }
    
    const loginActivity = await LoginActivity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: loginActivity
    });
  } catch (error) {
    console.error("Error fetching login activity:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to retrieve login activity"
    });
  }
});

module.exports = router;