import * as jobService from '../services/job.service.js';

export async function startJob(req, res, next) {
  try {
    const job = await jobService.startJob(req.params.jobId, req.body || {});
    res.status(200).json({
      success: true,
      message: 'Job started successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function getJob(req, res, next) {
  try {
    const job = await jobService.getJobById(req.params.jobId);
    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelJob(req, res, next) {
  try {
    const job = await jobService.cancelJob(req.params.jobId);
    res.status(200).json({
      success: true,
      message: 'Job cancellation requested',
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function getJobErrors(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await jobService.getJobErrors(req.params.jobId, page, limit);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteJob(req, res, next) {
  try {
    const result = await jobService.deleteJob(req.params.jobId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
