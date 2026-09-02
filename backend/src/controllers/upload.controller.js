import { handleStreamUpload } from '../services/upload.service.js';

export async function uploadFile(req, res, next) {
  try {
    const result = await handleStreamUpload(req);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
