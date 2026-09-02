import mongoose from 'mongoose';

const transformationSchema = new mongoose.Schema({
  sourceField: { type: String, required: true },
  targetField: { type: String, required: true },
  code: { type: String, required: true }
}, { _id: false });

const pipelineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  sourceFormat: { 
    type: String, 
    required: true, 
    enum: ['CSV', 'JSON', 'NDJSON'], 
    default: 'CSV' 
  },
  destinationCollection: { type: String, required: true, trim: true },
  mapping: { 
    type: Map, 
    of: String, 
    default: {} 
  },
  transformations: [transformationSchema],
  validationRules: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }
}, {
  timestamps: true
});

export const Pipeline = mongoose.model('Pipeline', pipelineSchema);
