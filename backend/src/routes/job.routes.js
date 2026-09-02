import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';

const router = Router();

router.post('/:jobId/start', jobController.startJob);
router.get('/:jobId', jobController.getJob);
router.post('/:jobId/cancel', jobController.cancelJob);
router.get('/:jobId/errors', jobController.getJobErrors);
router.delete('/:jobId', jobController.deleteJob);

export default router;
