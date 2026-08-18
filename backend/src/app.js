const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./config/env');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors());

// Rate limiting (basic rate limits for API metadata endpoints)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.' } }
});
app.use('/api', limiter);

// Request body parsers for JSON and URL encoded data
// Note: We do NOT use body-parser for file uploads, as Busboy streams raw multipart data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV
  });
});

// Import route modules
const uploadRoutes = require('./routes/upload.routes');
const pipelineRoutes = require('./routes/pipeline.routes');
const previewRoutes = require('./routes/preview.routes');
const jobRoutes = require('./routes/job.routes');

// Mount routes
app.use('/api/upload', uploadRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/jobs', jobRoutes);

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
