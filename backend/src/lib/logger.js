'use strict';

const pino = require('pino');
const config = require('../config');

// JSON to stdout. Render captures it; pipe to `npx pino-pretty` locally if you want it readable.
module.exports = pino({
  level: config.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'newPassword',
      'oldPassword',
      'refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
