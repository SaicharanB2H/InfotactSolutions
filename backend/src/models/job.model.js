const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  fileName: {
    type: String,
    required: true
  },
  pipelineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    required: true
  },
  totalRows: {
    type: Number,
    default: 0
  },
  processedRows: {
    type: Number,
    default: 0
  },
  failedRows: {
    type: Number,
    default: 0
  },
  rowsPerSecond: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  error: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
