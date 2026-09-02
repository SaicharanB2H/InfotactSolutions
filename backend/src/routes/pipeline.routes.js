import { Router } from 'express';
import * as pipelineController from '../controllers/pipeline.controller.js';

const router = Router();

router.post('/', pipelineController.createPipeline);
router.get('/', pipelineController.getAllPipelines);
router.get('/:id', pipelineController.getPipelineById);
router.put('/:id', pipelineController.updatePipeline);
router.delete('/:id', pipelineController.deletePipeline);

export default router;
