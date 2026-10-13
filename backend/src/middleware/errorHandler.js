import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';
import logger from '../lib/logger.js';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ code: 'ValidationError', message: err.issues[0]?.message || 'Invalid request' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ code: 'PayloadTooLarge', message: 'Request body is too large' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'ValidationError', message: 'Request body is not valid JSON' });
  }

  // Unexpected: log full detail (and Sentry has already captured it), but don't leak internals.
  (req.log || logger).error({ err }, 'Unhandled error');
  return res.status(500).json({ code: 'InternalServerError', message: 'Internal server error' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ code: 'NotFound', message: `Endpoint not found: ${req.method} ${req.path}` });
}

export { errorHandler, notFoundHandler };
