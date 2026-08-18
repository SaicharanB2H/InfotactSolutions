const Pipeline = require('../models/pipeline.model');
const logger = require('../utils/logger');

/**
 * Controller managing pipeline schema mappings, validation rules, and custom transformations.
 */
async function createPipeline(req, res, next) {
  try {
    const { name, mappings, transformations, validationRules } = req.body;

    const pipeline = new Pipeline({
      name,
      mappings,
      transformations,
      validationRules
    });

    await pipeline.save();
    logger.info({ pipelineId: pipeline._id }, 'New pipeline configuration created');

    res.status(201).json(pipeline);
  } catch (error) {
    next(error);
  }
}

async function getPipeline(req, res, next) {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findById(id);

    if (!pipeline) {
      return res.status(404).json({ error: { message: 'Pipeline configuration not found' } });
    }

    res.status(200).json(pipeline);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPipeline,
  getPipeline
};
