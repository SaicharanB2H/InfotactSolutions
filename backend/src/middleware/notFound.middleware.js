import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res, next) {
  next(new AppError('NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`, 404));
}
