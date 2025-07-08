const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'Task Added',
      'Task Updated',
      'Task Deleted',
      'Task Assigned',
      'Task Status Changed',
      'Task Priority Changed',
      'Task Description Changed',
      'Task Title Changed', 
      'Smart Assigned'
    ]
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  taskTitle: { 
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByEmail: { 
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: { 
    type: mongoose.Schema.Types.Mixed 
  }
});

activityLogSchema.index({ timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;