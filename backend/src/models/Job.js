import mongoose from 'mongoose';

export const JOB_STATUS = {
  UPLOADING: 'UPLOADING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  pipelineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline', required: false },
  originalFileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true, enum: ['CSV', 'JSON', 'NDJSON'], default: 'CSV' },
  status: { 
    type: String, 
    required: true, 
    enum: Object.values(JOB_STATUS),
    default: JOB_STATUS.UPLOADING,
    index: true
  },
  totalRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  failedRows: { type: Number, default: 0 },
  rowsPerSecond: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  error: { type: String, default: null },
  cancelRequested: { type: Boolean, default: false }
}, {
  timestamps: true
});

export const Job = mongoose.model('Job', jobSchema);
