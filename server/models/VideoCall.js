const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the schema for participation tracking
const ParticipationSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId, 
    ref: "users",
    required: true,
  },
  joined_at: {
    type: Date,
    default: Date.now
  },
  left_at: {
    type: Date,
    default: null
  }
});

// Define the schema for the video call
const VideoCallSchema = new Schema(
  {
    call_name: {
      type: String,
      required: [true, "Call name is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    start_time: {
      type: Date,
      required: [true, "Start time is required"]
    },
    end_time: {
      type: Date,
      required: [true, "End time is required"]
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: 1,
      max: 1440 // Max 24 hours in minutes
    },
    is_recurring: {
      type: Boolean,
      default: false
    },
    recurrence_pattern: {
      type: String,
      enum: ["daily", "weekly", "biweekly", "monthly"],
      default: "weekly"
    },
    recurrence_end_date: {
      type: Date,
      default: null
    },
    // Only one of participants or team_id should be set
    participants: [{
      type: Schema.Types.ObjectId,
      ref: "users"
    }],
    team_id: {
      type: Schema.Types.ObjectId,
      ref: "teams",
      default: null
    },
    // Track who actually joined the call
    participation: [ParticipationSchema],
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled"
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Validate that either participants or team_id is provided, but not both
VideoCallSchema.pre("validate", function(next) {
  if (this.participants.length > 0 && this.team_id) {
    this.invalidate("participants", "Cannot specify both participants and team_id");
  }
  if (this.participants.length === 0 && !this.team_id) {
    this.invalidate("participants", "Must specify either participants or team_id");
  }
  next();
});

// Ensure end_time is after start_time
VideoCallSchema.pre("validate", function(next) {
  if (this.end_time <= this.start_time) {
    this.invalidate("end_time", "End time must be after start time");
  }
  next();
});

// Method to check if a user is a participant in this call
VideoCallSchema.methods.isParticipant = function(userId) {
  // Check direct participants
  if (this.participants.some(p => p.toString() === userId.toString())) {
    return true;
  }
  
  // If this is a team call, need to check team membership
  // Note: This would require populating the team and its members
  if (this.team_id && this.team && this.team.members) {
    return this.team.members.some(member => 
      member.user && member.user._id.toString() === userId.toString()
    );
  }
  
  return false;
};

// Create indexes
VideoCallSchema.index({ start_time: 1 });
VideoCallSchema.index({ end_time: 1 });
VideoCallSchema.index({ created_by: 1 });
VideoCallSchema.index({ team_id: 1 });
VideoCallSchema.index({ participants: 1 }); // Index for faster participant lookups
VideoCallSchema.index({ status: 1 });

// Export the model
module.exports = mongoose.model("VideoCall", VideoCallSchema);