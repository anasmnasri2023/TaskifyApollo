const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  project_name: { type: String, required: true },
  project_description: { type: String },
  project_manager: { 
    type: String, 
    required: true 
  },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  budget: { type: String },
  status: { type: String, enum: ["on hold", "in progress", "completed"], default: "in progress" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  client_name: { type: String },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'teams'
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Project", ProjectSchema);