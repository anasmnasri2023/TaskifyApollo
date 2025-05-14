const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: {
    // Existing permissions
    createTask: {
      type: Boolean,
      default: false
    },
    viewTasks: {
      type: Boolean,
      default: false
    },
    editTasks: {
      type: Boolean,
      default: false
    },
    deleteTasks: {
      type: Boolean,
      default: false
    },
    manageUsers: {
      type: Boolean,
      default: false
    },
    viewReports: {
      type: Boolean,
      default: false
    },
    manageProjects: {
      type: Boolean,
      default: false
    },
    
    // Chat Room permissions
    manageChatRoom: {
      type: Boolean,
      default: false
    },
    manageMessages: {
      type: Boolean,
      default: false
    },
    manageChatMembers: {
      type: Boolean,
      default: false
    },
    
    // Video Call permissions
    manageVideoCalls: {
      type: Boolean,
      default: false
    },
    
    // Analytics & Dashboard permissions
    accessCharts: {
      type: Boolean,
      default: false
    },
    accessAnalytics: {
      type: Boolean,
      default: false
    },
    accessActivityTables: {
      type: Boolean,
      default: false
    },
    
    // Profile permissions
    manageProfile: {
      type: Boolean,
      default: false
    },
    
    // Chatbot permissions
    accessChatbot: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Role', roleSchema);