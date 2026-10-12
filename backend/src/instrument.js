'use strict';

// Must be the FIRST require in every entry point (server + cron job) so Sentry can
// patch http/express before they are loaded.
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RENDER_GIT_COMMIT, // set automatically by Render
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
}

module.exports = Sentry;
