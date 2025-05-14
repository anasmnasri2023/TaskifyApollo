const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isDirectMessage: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  }
});

// Index for faster lookup
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ createdAt: -1 });
chatRoomSchema.index({ isDirectMessage: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);