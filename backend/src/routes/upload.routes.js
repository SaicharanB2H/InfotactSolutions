const express = require('express');
const router = express.Router();
const { handleUpload } = require('../controllers/upload.controller');

router.post('/', handleUpload);

module.exports = router;
