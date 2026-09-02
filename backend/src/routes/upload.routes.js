import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller.js';
import { validateUploadHeaders } from '../middleware/upload.middleware.js';

const router = Router();

router.post('/', validateUploadHeaders, uploadFile);

export default router;
