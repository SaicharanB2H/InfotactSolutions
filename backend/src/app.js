import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import pipelineRoutes from "./routes/pipeline.routes.js";
import jobRoutes from "./routes/job.routes.js";
import healthRoutes from "./routes/health.routes.js";
import bulkInsertRoutes from "./routes/bulk-insert.routes.js";
import previewRoutes from "./routes/preview.routes.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { config } from "./config/env.js";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Logging
if (config.nodeEnv !== "test") {
  app.use(morgan("combined"));
}

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again later."
    }
  }
});
app.use("/api/", apiLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/preview", previewRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/pipelines", pipelineRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/bulk-insert", bulkInsertRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
