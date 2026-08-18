const express = require('express');
const router = express.Router();
const { getCsvPreview } = require('../controllers/preview.controller');

router.post('/', getCsvPreview);

module.exports = router;
