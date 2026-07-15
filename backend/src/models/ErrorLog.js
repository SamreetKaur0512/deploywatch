const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    errorType: {
      type: String,
      enum: ['down', 'slow_response', 'timeout', 'server_error', 'custom'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number, // ms
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

errorLogSchema.index({ project: 1, createdAt: -1 });
errorLogSchema.index({ owner: 1, isResolved: 1 });

module.exports = mongoose.model('ErrorLog', errorLogSchema);
