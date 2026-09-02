import { AppError, ERROR_CODES } from '../utils/errors.js';

export function validateUploadHeaders(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next(
      new AppError(
        ERROR_CODES.INVALID_FILE,
        'Invalid Content-Type. File upload requires "multipart/form-data"',
        400
      )
    );
  }
  next();
}
