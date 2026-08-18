const express = require('express');
const router = express.Router();
const { getJobStatus, cancelJob, getJobErrors } = require('../controllers/job.controller');

router.get('/:id', getJobStatus);
router.post('/:id/cancel', cancelJob);
router.get('/:id/errors', getJobErrors);

module.exports = router;
