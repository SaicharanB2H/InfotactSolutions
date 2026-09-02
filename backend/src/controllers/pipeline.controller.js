import * as pipelineService from '../services/pipeline.service.js';

export async function createPipeline(req, res, next) {
  try {
    const pipeline = await pipelineService.createPipeline(req.body);
    res.status(201).json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllPipelines(req, res, next) {
  try {
    const pipelines = await pipelineService.getAllPipelines();
    res.status(200).json({
      success: true,
      data: pipelines
    });
  } catch (error) {
    next(error);
  }
}

export async function getPipelineById(req, res, next) {
  try {
    const pipeline = await pipelineService.getPipelineById(req.params.id);
    res.status(200).json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePipeline(req, res, next) {
  try {
    const pipeline = await pipelineService.updatePipeline(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePipeline(req, res, next) {
  try {
    await pipelineService.deletePipeline(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Pipeline deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}
