'use strict';

class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const notFound = (what = 'Resource') => new HttpError(404, 'NotFound', `${what} not found`);

/** Parse with a zod schema; throw a 400 in the same {code, message} shape the app already expects. */
function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
    throw new HttpError(400, 'ValidationError', `${where}${issue.message}`);
  }
  return result.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

module.exports = { HttpError, notFound, parse, isUuid };
