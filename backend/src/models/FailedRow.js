import mongoose from 'mongoose';

const failedRowSchema = new mongoose.Schema({
  jobId: { type: String, required: true, index: true },
  rowNumber: { type: Number, required: true },
  originalData: { type: mongoose.Schema.Types.Mixed },
  error: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

failedRowSchema.index({ jobId: 1, rowNumber: 1 });

export const FailedRow = mongoose.model('FailedRow', failedRowSchema);
