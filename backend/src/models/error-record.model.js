const mongoose = require('mongoose');

const errorRecordSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  rowNumber: {
    type: Number,
    required: true
  },
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  errorMessage: {
    type: String,
    required: true
  },
  stage: {
    type: String,
    enum: ['parsing', 'mapping', 'transformation', 'validation', 'database'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ErrorRecord', errorRecordSchema);
