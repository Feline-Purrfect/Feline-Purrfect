import pino from 'pino';
import config from '../config.js';

// JSON to stdout. Render captures it; pipe to `npx pino-pretty` locally if you want it readable.
export default pino({
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
