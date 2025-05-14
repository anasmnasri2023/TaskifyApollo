const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const { MOCK_PRIORITY, MOCK_STATUS, MOCK_TYPE, MOCK_DATA } = require('../constants/MOCK_TYPE');

// Helper to get a random element from an array
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Helper to generate a random date within the last 7 days
const getRandomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 7); // 0 to 6 days
  const hoursAgo = Math.floor(Math.random() * 24); // 0 to 23 hours
  return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
};

// Create a batch of diverse sample activities for a user
router.post('/seed-activities/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Seeding activities for user:", userId);

    // Validate userId as a MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Generate 10 diverse activities
    const sampleActivities = [];

    // 1. Task Created - Cybersecurity Assessment
    sampleActivities.push({
      user: userId,
      action: "Created Task",
      actionType: "task_created",
      details: `Created task: Conduct Cybersecurity Assessment for ${MOCK_DATA[0].project_name}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "Cybersecurity Assessment").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 2. Task Updated - Cloud Migration
    const cloudMigrationPriority = getRandomElement(MOCK_PRIORITY);
    sampleActivities.push({
      user: userId,
      action: "Updated Task",
      actionType: "task_updated",
      details: `Updated task: Cloud Migration for ${MOCK_DATA[0].client_name} - Priority set to ${cloudMigrationPriority.label}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "Cloud Migration").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 3. Task Completed - Network Configuration
    const networkStatus = MOCK_STATUS.find(status => status.label === "completed");
    sampleActivities.push({
      user: userId,
      action: "Completed Task",
      actionType: "task_completed",
      details: `Completed task: Network Configuration with status ${networkStatus.label}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "Network Configuration").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 4. Comment Added - DevOps Pipeline Setup
    sampleActivities.push({
      user: userId,
      action: "Added Comment",
      actionType: "comment_added",
      details: `Added comment on task: DevOps Pipeline Setup for ${MOCK_DATA[0].project_name}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "DevOps Pipeline Setup").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 5. Task Created - System Design
    const systemDesignPriority = getRandomElement(MOCK_PRIORITY);
    sampleActivities.push({
      user: userId,
      action: "Created Task",
      actionType: "task_created",
      details: `Created task: System Design for ${MOCK_DATA[0].client_name} with priority ${systemDesignPriority.label}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "System Design").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 6. Task Updated - Infrastructure Maintenance
    const infraStatus = getRandomElement(MOCK_STATUS);
    sampleActivities.push({
      user: userId,
      action: "Updated Task",
      actionType: "task_updated",
      details: `Updated task: Infrastructure Maintenance - Status changed to ${infraStatus.label}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "Infrastructure Maintenance").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 7. Task Completed - Data Center Optimization
    sampleActivities.push({
      user: userId,
      action: "Completed Task",
      actionType: "task_completed",
      details: `Completed task: Data Center Optimization for ${MOCK_DATA[0].project_name}`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "Data Center Optimization").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 8. Comment Added - Authorization
    sampleActivities.push({
      user: userId,
      action: "Added Comment",
      actionType: "comment_added",
      details: `Added comment on task: Authorization setup with ${MOCK_TYPE.find(type => type.label === "Authorization").accessLevel} access`,
      timestamp: getRandomDate(),
      taskCategory: MOCK_TYPE.find(type => type.label === "Authorization").category,
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 9. Project Created
    sampleActivities.push({
      user: userId,
      action: "Created Project",
      actionType: "project_created",
      details: `Created project: ${MOCK_DATA[0].project_name} for client ${MOCK_DATA[0].client_name}`,
      timestamp: getRandomDate(),
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // 10. Login Successful
    sampleActivities.push({
      user: userId,
      action: "Login Successful",
      actionType: "login",
      details: "Login from Chrome on Windows",
      timestamp: getRandomDate(),
      ipAddress: '127.0.0.1',
      deviceInfo: { browser: 'Chrome', os: 'Windows', device: 'Desktop' }
    });

    // Save all activities to database
    const result = await Activity.insertMany(sampleActivities);

    res.status(200).json({
      success: true,
      message: `Created ${result.length} sample activities`,
      activities: result
    });
  } catch (error) {
    console.error("Error seeding activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed activities",
      error: error.message
    });
  }
});

module.exports = router;