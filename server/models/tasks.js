// models/tasks.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Enum constants for better maintainability
const PRIORITY_LEVELS = ['1', '2', '3', '4'];
const STATUS_LEVELS = ['1', '2', '3', '4'];
const TASK_TYPES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const tasksSchema = new Schema(
  {
    project: {
      type: String,
      required: [true, 'Project is required'],
      trim: true
    },
    assigns: [
      {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: [true, 'At least one assignee is required']
      }
    ],
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long']
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true
    },
    start_date: {
      type: Date,
      default: null
    },
    end_date: {
      type: Date,
      default: null,
      validate: {
        validator: function(v) {
          return !this.start_date || v >= this.start_date;
        },
        message: 'End date must be after start date'
      }
    },
    // New field: Store full day events separately
    is_all_day: {
      type: Boolean,
      default: true
    },
    // New field: For recurring tasks (optional enhancement)
    recurrence: {
      type: Object,
      default: null
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_LEVELS,
        message: '{VALUE} is not a valid priority level'
      },
      default: '2' // Default to medium priority
    },
    status: {
      type: String,
      enum: {
        values: STATUS_LEVELS,
        message: '{VALUE} is not a valid status'
      },
      default: '1' // Default to first status (e.g., TODO)
    },
    type: {
      type: String,
      enum: {
        values: TASK_TYPES,
        message: '{VALUE} is not a valid task type'
      },
      default: '1'
    },
    attachment: {
      filename: {
        type: String,
        default: null
      },
      originalname: {
        type: String,
        default: null
      },
      path: {
        type: String,
        default: null
      },
      mimetype: {
        type: String,
        default: null
      },
      size: {
        type: Number,
        default: null
      }
    },
    comments: [
      {
        content: {
          type: String,
          trim: true
        },
        by: {
          type: Schema.Types.ObjectId,
          ref: "users"
        },
        image: {
          type: String,
          default: null
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to get task age
tasksSchema.virtual('taskAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual to get task duration in minutes
tasksSchema.virtual('durationMinutes').get(function() {
  if (!this.start_date || !this.end_date) return 0;
  return Math.floor((this.end_date - this.start_date) / (1000 * 60));
});

// Middleware to validate dates before save
tasksSchema.pre('save', function(next) {
  if (this.start_date && this.end_date && this.end_date < this.start_date) {
    next(new Error('End date cannot be before start date'));
  }
  next();
});

module.exports = mongoose.model('Task', tasksSchema);