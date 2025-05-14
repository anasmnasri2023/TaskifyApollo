const mongoose = require("mongoose");


const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    enum: [
      "task_created",
      "task_updated",
      "task_completed",
      "task_deleted",
      "comment_added",
      "profile_updated",
      "team_action",
      "team_fetch", // Added for GET /api/teams
      "project_created", // Added for POST /api/projects
      "login",
      "logout",
      "other"
    ],
    required: true,
    index: true
  },
  details: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  relatedEntityId: mongoose.Schema.Types.ObjectId,
  relatedEntityType: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  taskCategory: String,
  taskPriority: String,
  deviceInfo: {
    browser: String,
    os: String,
    device: String
  },
  ipAddress: String
});

activitySchema.index({ user: 1, timestamp: -1 });
activitySchema.index({ user: 1, taskCategory: 1 });

activitySchema.pre("save", async function(next) {
  try {
    if (
      this.relatedEntityType === "Task" && 
      this.relatedEntityId && 
      !this.taskCategory
    ) {
      const Task = mongoose.model("tasks");
      const task = await Task.findById(this.relatedEntityId);
      
      if (task) {
        const taskType = global.MOCK_TYPE?.find(t => t.value === task.type);
        if (taskType && taskType.category) {
          this.taskCategory = taskType.category;
        }
        this.taskPriority = task.priority;
      }
    }
    next();
  } catch (error) {
    console.error("Error in Activity pre-save middleware:", error);
    next();
  }
});

activitySchema.statics.findRecentByType = function(userId, type, limit = 10) {
  return this.find({
    user: userId,
    actionType: type
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

activitySchema.statics.countByTaskCategory = function(userId, startDate = null) {
  const match = { user: userId, taskCategory: { $exists: true, $ne: null } };
  if (startDate) {
    match.timestamp = { $gte: startDate };
  }
  return this.aggregate([
    { $match: match },
    { $group: { _id: "$taskCategory", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

const Activity = mongoose.model("Activity", activitySchema);
module.exports = Activity;