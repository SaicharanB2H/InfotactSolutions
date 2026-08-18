const express = require('express');
const router = express.Router();
const { createPipeline, getPipeline } = require('../controllers/pipeline.controller');
const { validatePipeline } = require('../middleware/validation.middleware');

router.post('/', validatePipeline, createPipeline);
router.get('/:id', getPipeline);

module.exports = router;
