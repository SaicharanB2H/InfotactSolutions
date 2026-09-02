import { Pipeline } from '../models/Pipeline.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';

export async function createPipeline(pipelineData) {
  if (!pipelineData.name || !pipelineData.destinationCollection) {
    throw new AppError(
      ERROR_CODES.INVALID_MAPPING,
      'Pipeline requires a name and destinationCollection',
      400
    );
  }

  const pipeline = await Pipeline.create(pipelineData);
  return pipeline;
}

export async function getAllPipelines() {
  return await Pipeline.find().sort({ createdAt: -1 });
}

export async function getPipelineById(id) {
  const pipeline = await Pipeline.findById(id);
  if (!pipeline) {
    throw new AppError(ERROR_CODES.PIPELINE_NOT_FOUND, `Pipeline with ID ${id} not found`, 404);
  }
  return pipeline;
}

export async function updatePipeline(id, updateData) {
  const pipeline = await Pipeline.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });
  if (!pipeline) {
    throw new AppError(ERROR_CODES.PIPELINE_NOT_FOUND, `Pipeline with ID ${id} not found`, 404);
  }
  return pipeline;
}

export async function deletePipeline(id) {
  const pipeline = await Pipeline.findByIdAndDelete(id);
  if (!pipeline) {
    throw new AppError(ERROR_CODES.PIPELINE_NOT_FOUND, `Pipeline with ID ${id} not found`, 404);
  }
  return pipeline;
}
