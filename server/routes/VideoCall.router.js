const express = require("express");
const router = express.Router();
const videoCallController = require("../controllers/VideoCallController");

// FIXED: Removed redundant authentication middleware since it's applied at app level
// router.use(passport.authenticate("jwt", { session: false }));

// Create a new scheduled video call
router.post("/", videoCallController.createVideoCall);

// Get all scheduled video calls
router.get("/", videoCallController.getAllCalls);

// Get upcoming scheduled video calls
router.get("/upcoming", videoCallController.getUpcomingCalls);

// Get calls for a specific participant by ID
router.get("/participant/:userId", videoCallController.getCallsByParticipantId);

// Get a specific scheduled video call by ID
router.get("/:id", videoCallController.getCallById);

// Update a scheduled video call
router.put("/:id", videoCallController.updateCall);

// Delete a scheduled video call
router.delete("/:id", videoCallController.deleteCall);

// Mark a call as started
router.put("/:id/start", videoCallController.startCall);

// Mark a call as ended
router.put("/:id/end", videoCallController.endCall);

// Track user joining a call
router.post("/:id/join", videoCallController.joinCall);

// Track user leaving a call
router.post("/:id/leave", videoCallController.leaveCall);

module.exports = router;