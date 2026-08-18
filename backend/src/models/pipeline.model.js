const mongoose = require('mongoose');

const pipelineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mappings: [{
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true }
  }],
  transformations: [{
    field: { type: String, required: true, trim: true }, // The destination field name to apply JavaScript to
    code: { type: String, required: true }              // Custom user JavaScript code to run
  }],
  validationRules: [{
    field: { type: String, required: true, trim: true }, // Destination field name to validate
    required: { type: Boolean, default: false },
    type: { type: String, enum: ['string', 'number', 'boolean', 'date'] },
    min: { type: Number },
    max: { type: Number },
    regex: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Pipeline', pipelineSchema);
