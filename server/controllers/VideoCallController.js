const VideoCall = require("../models/VideoCall");
const User = require("../models/users");
const Team = require("../models/teams");
const mongoose = require("mongoose");
const { catchAsync } = require("../utils/catchAsync");

// Helper function to populate call data
const populateCallData = async (call) => {
  // If it's a team call, populate team information
  if (call.team_id) {
    await call.populate({
      path: "team_id",
      select: "_id Name members pictureprofile",
      model: Team
    });
  }
  
  // If it has participants, populate user information
  if (call.participants && call.participants.length > 0) {
    await call.populate({
      path: "participants",
      select: "_id fullName email picture",
      model: User
    });
  }
  
  // Always populate creator information
  await call.populate({
    path: "created_by",
    select: "_id fullName email picture",
    model: User
  });
  
  return call;
};

// Create a new scheduled video call
exports.createVideoCall = catchAsync(async (req, res) => {
  const {
    call_name,
    description,
    start_time,
    end_time,
    duration,
    is_recurring,
    recurrence_pattern,
    recurrence_end_date,
    participants,
    team_id
  } = req.body;
  
  // Create the call
  const videoCall = new VideoCall({
    call_name,
    description,
    start_time,
    end_time,
    duration: duration || Math.ceil((new Date(end_time) - new Date(start_time)) / (1000 * 60)),
    is_recurring,
    recurrence_pattern,
    recurrence_end_date,
    participants: participants || [],
    team_id: team_id || null,
    created_by: req.user._id
  });
  
  // Save the call
  await videoCall.save();
  
  // Populate related data
  await populateCallData(videoCall);
  
  // Send response
  res.status(201).json({
    success: true,
    data: videoCall
  });
});

// Get all scheduled video calls
exports.getAllCalls = catchAsync(async (req, res) => {
  // Get query parameters
  const { start_date, end_date, team_id } = req.query;
  
  // Build query
  const query = {};
  
  // Filter by date range if provided
  if (start_date || end_date) {
    query.start_time = {};
    if (start_date) {
      query.start_time.$gte = new Date(start_date);
    }
    if (end_date) {
      query.start_time.$lte = new Date(end_date);
    }
  }
  
  // Filter by team if provided
  if (team_id) {
    query.team_id = new mongoose.Types.ObjectId(team_id);
  }
  
  // Find calls that:
  // 1. User has created
  // 2. User is a participant in
  // 3. User is a member of the team
  const userTeams = await Team.find({
    "members.user": req.user._id
  }).select("_id");
  
  const teamIds = userTeams.map(team => team._id);
  
  const userRelatedQuery = {
    $or: [
      { created_by: req.user._id },
      { participants: req.user._id },
      { team_id: { $in: teamIds } }
    ]
  };
  
  // Combine the queries
  const combinedQuery = {
    ...query,
    ...userRelatedQuery
  };
  
  // Find all calls
  const videoCalls = await VideoCall.find(combinedQuery)
    .populate({
      path: "team_id",
      select: "_id Name members pictureprofile",
      model: Team
    })
    .populate({
      path: "participants",
      select: "_id fullName email picture",
      model: User
    })
    .populate({
      path: "created_by",
      select: "_id fullName email picture",
      model: User
    })
    .sort({ start_time: 1 });
  
  // Send response
  res.status(200).json({
    success: true,
    data: videoCalls
  });
});
// Get calls for a specific participant by ID
exports.getCallsByParticipantId = catchAsync(async (req, res) => {
  const participantId = req.params.userId;
  
  // Validate participant ID
  if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid participant ID"
    });
  }
  
  console.log(`Fetching calls for participant ID: ${participantId}`);
  
  try {
    // Get user's teams
    const userTeams = await Team.find({
      "members.user": new mongoose.Types.ObjectId(participantId)
    }).select("_id");
    
    const teamIds = userTeams.map(team => team._id.toString());
    console.log(`User belongs to ${teamIds.length} teams`);
    
    // Get all calls and populate them
    const allCalls = await VideoCall.find()
      .populate({
        path: "team_id",
        select: "_id Name members pictureprofile",
        model: Team
      })
      .populate({
        path: "participants",
        select: "_id fullName email picture",
        model: User
      })
      .populate({
        path: "created_by",
        select: "_id fullName email picture",
        model: User
      })
      .sort({ start_time: 1 });
    
    console.log(`Total calls in database: ${allCalls.length}`);
    
    // Filter calls - ONLY include calls where user is a participant OR team member
    // Exclude calls where user is ONLY the creator
    const userCalls = allCalls.filter(call => {
      // Check if user is a direct participant
      const isParticipant = call.participants.some(p => {
        const pId = p._id ? p._id.toString() : p.toString();
        return pId === participantId;
      });
      
      // Check if call is for a team the user belongs to
      const isTeamMember = call.team_id && teamIds.includes(
        call.team_id._id ? call.team_id._id.toString() : call.team_id.toString()
      );
      
      // Include the call if user is a participant or team member
      // Do NOT include calls where user is just the creator
      const shouldInclude = isParticipant || isTeamMember;
      
      // Log for debugging
      if (shouldInclude) {
        console.log(`Including call "${call.call_name}" (${call._id}) - Participant: ${isParticipant}, Team Member: ${isTeamMember}`);
      }
      
      return shouldInclude;
    });
    
    console.log(`Found ${userCalls.length} calls where user ${participantId} is a participant or team member`);
    
    // Return only the filtered calls
    res.status(200).json({
      success: true,
      data: userCalls
    });
  } catch (error) {
    console.error("Error in getCallsByParticipantId:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching participant calls",
      error: error.message
    });
  }
});

// Get upcoming scheduled video calls
exports.getUpcomingCalls = catchAsync(async (req, res) => {
  // Get the current time
  const now = new Date();
  
  // Find calls where:
  // 1. User has created them
  // 2. User is a participant in them
  // 3. User is a member of the team
  // 4. Start time is in the future
  const userTeams = await Team.find({
    "members.user": req.user._id
  }).select("_id");
  
  const teamIds = userTeams.map(team => team._id);
  
  const query = {
    start_time: { $gte: now },
    status: { $ne: "cancelled" },
    $or: [
      { created_by: req.user._id },
      { participants: req.user._id },
      { team_id: { $in: teamIds } }
    ]
  };
  
  // Find upcoming calls
  const upcomingCalls = await VideoCall.find(query)
    .populate({
      path: "team_id",
      select: "_id Name members pictureprofile",
      model: Team
    })
    .populate({
      path: "participants",
      select: "_id fullName email picture",
      model: User
    })
    .populate({
      path: "created_by",
      select: "_id fullName email picture",
      model: User
    })
    .sort({ start_time: 1 })
    .limit(10); // Limit to 10 upcoming calls
  
  // Send response
  res.status(200).json({
    success: true,
    data: upcomingCalls
  });
});

// Get a specific scheduled video call by ID
exports.getCallById = catchAsync(async (req, res) => {
  const callId = req.params.id;
  
  // Find the call
  const videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Populate related data
  await populateCallData(videoCall);
  
  // Send response
  res.status(200).json({
    success: true,
    data: videoCall
  });
});

// Update a scheduled video call
exports.updateCall = catchAsync(async (req, res) => {
  const callId = req.params.id;
  const updateData = req.body;
  
  // Find the call
  let videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Check if user is allowed to update (creator or admin)
  const isCreator = videoCall.created_by.toString() === req.user._id.toString();
  const isAdmin = req.user.roles.includes("ADMIN");
  
  if (!isCreator && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this call"
    });
  }
  
  // Update the call
  videoCall = await VideoCall.findByIdAndUpdate(
    callId,
    updateData,
    { new: true, runValidators: true }
  );
  
  // Populate related data
  await populateCallData(videoCall);
  
  // Send response
  res.status(200).json({
    success: true,
    data: videoCall
  });
});

// Delete a scheduled video call
exports.deleteCall = catchAsync(async (req, res) => {
  const callId = req.params.id;
  
  // Find the call
  const videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Check if user is allowed to delete (creator or admin)
  const isCreator = videoCall.created_by.toString() === req.user._id.toString();
  const isAdmin = req.user.roles.includes("ADMIN");
  
  if (!isCreator && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this call"
    });
  }
  
  // Delete the call
  await VideoCall.findByIdAndDelete(callId);
  
  // Send response
  res.status(200).json({
    success: true,
    message: "Call deleted successfully"
  });
});

// Mark a call as started
exports.startCall = catchAsync(async (req, res) => {
  const callId = req.params.id;
  
  // Find the call
  const videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Update the call status
  videoCall.status = "active";
  await videoCall.save();
  
  // Send response
  res.status(200).json({
    success: true,
    data: {
      _id: videoCall._id,
      status: videoCall.status,
      updated_at: videoCall.updated_at
    }
  });
});

// Mark a call as ended
exports.endCall = catchAsync(async (req, res) => {
  const callId = req.params.id;
  
  // Find the call
  const videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Update the call status
  videoCall.status = "completed";
  await videoCall.save();
  
  // Send response
  res.status(200).json({
    success: true,
    data: {
      _id: videoCall._id,
      status: videoCall.status,
      updated_at: videoCall.updated_at
    }
  });
});

// Track user joining a call
exports.joinCall = catchAsync(async (req, res) => {
  const callId = req.params.id;
  const userId = req.user._id;
  
  // Find the call
  const videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Check if user is allowed to join
  if (!videoCall.isParticipant(userId) && videoCall.created_by.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to join this call"
    });
  }
  
  // Add participation record
  videoCall.participation.push({
    user_id: userId,
    joined_at: new Date(),
    left_at: null
  });
  
  // Update call status if it's the first join
  if (videoCall.status === "scheduled") {
    videoCall.status = "active";
  }
  
  await videoCall.save();
  
  // Send response
  res.status(200).json({
    success: true,
    data: {
      _id: videoCall._id,
      participation: videoCall.participation
    }
  });
});

// Track user leaving a call
exports.leaveCall = catchAsync(async (req, res) => {
  const callId = req.params.id;
  const userId = req.user._id;
  
  // Find the call
  const videoCall = await VideoCall.findById(callId);
  
  // Check if call exists
  if (!videoCall) {
    return res.status(404).json({
      success: false,
      message: "Call not found"
    });
  }
  
  // Find the user's active participation record (no left_at time)
  const participationIndex = videoCall.participation.findIndex(
    p => p.user_id.toString() === userId.toString() && !p.left_at
  );
  
  if (participationIndex !== -1) {
    // Update the left_at time
    videoCall.participation[participationIndex].left_at = new Date();
    await videoCall.save();
  }
  
  // Send response
  res.status(200).json({
    success: true,
    data: {
      _id: videoCall._id,
      participation: videoCall.participation
    }
  });
});