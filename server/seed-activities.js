// seed-activities.js
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB for seeding"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Define Activity Schema (simplified version of your model)
const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: String,
  actionType: String,
  details: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  taskCategory: String
});

const Activity = mongoose.model('Activity', activitySchema);

// Replace with your actual admin user ID
const adminUserId = '64662c1b19870ad0bd04778c'; // This appears to be your user ID from the screenshot

// Sample activities
const activities = [
  {
    user: adminUserId,
    action: "Created Task",
    actionType: "task_created",
    details: "Created task: Security Audit Plan",
    timestamp: new Date(),
    taskCategory: "security"
  },
  {
    user: adminUserId,
    action: "Updated Task",
    actionType: "task_updated",
    details: "Updated task: API Development",
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    taskCategory: "development"
  },
  {
    user: adminUserId,
    action: "Completed Task",
    actionType: "task_completed",
    details: "Completed task: Database Migration",
    timestamp: new Date(Date.now() - 7200000), // 2 hours ago
    taskCategory: "infrastructure"
  },
  {
    user: adminUserId,
    action: "Login Successful",
    actionType: "login",
    details: "Login from Chrome on Windows",
    timestamp: new Date(Date.now() - 86400000) // 1 day ago
  },
  {
    user: adminUserId,
    action: "Added Comment",
    actionType: "comment_added",
    details: "Added comment on task: Network Configuration",
    timestamp: new Date(Date.now() - 172800000), // 2 days ago
    taskCategory: "networking"
  }
];

// Insert activities
async function seedActivities() {
  try {
    // Clear existing activities (optional)
    await Activity.deleteMany({});
    
    // Insert new activities
    const result = await Activity.insertMany(activities);
    console.log(`Successfully inserted ${result.length} activities`);
    
    // Verify they exist
    const count = await Activity.countDocuments();
    console.log(`Total activities in collection: ${count}`);
    
    // Display the first one
    const sample = await Activity.findOne({});
    console.log("Sample activity:", sample);
    
    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding activities:", error);
    mongoose.connection.close();
  }
}

seedActivities();