const Job = require('../models/job.model');
const ErrorRecord = require('../models/error-record.model');
const { cancelEtlJob } = require('../services/etl.service');
const logger = require('../utils/logger');

/**
 * Controller to fetch, manage, and cancel streaming ETL jobs.
 */
async function getJobStatus(req, res, next) {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: { message: 'Job not found' } });
    }
    res.status(200).json(job);
  } catch (error) {
    next(error);
  }
}

async function cancelJob(req, res, next) {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: { message: 'Job not found' } });
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ error: { message: `Cannot cancel a job with status ${job.status}` } });
    }

    const cancelled = cancelEtlJob(id);
    if (cancelled) {
      logger.info({ jobId: id }, 'Job cancel request successfully processed');
      res.status(200).json({ message: 'Job cancellation triggered' });
    } else {
      // If not in active pipelines but status is processing in DB, update DB manually
      await Job.updateOne(
        { _id: id },
        { $set: { status: 'cancelled', completedAt: new Date(), error: 'Job cancelled by user request' } }
      );
      res.status(200).json({ message: 'Job status updated to cancelled' });
    }
  } catch (error) {
    next(error);
  }
}

async function getJobErrors(req, res, next) {
  try {
    const { id } = req.params;
    
    // Parse pagination parameters
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Cap limit to protect server memory

    const query = { jobId: id };
    
    const [total, errors] = await Promise.all([
      ErrorRecord.countDocuments(query),
      ErrorRecord.find(query)
        .sort({ rowNumber: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    res.status(200).json({
      errors,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJobStatus,
  cancelJob,
  getJobErrors
};
