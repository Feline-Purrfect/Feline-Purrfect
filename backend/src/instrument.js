// Sentry must initialise before express/http are loaded. In ESM, static imports are hoisted and
// evaluated before any code in the importing file runs, so "import it first" is NOT enough on its own.
// The npm scripts preload this file with `node --import ./src/instrument.js ...` (Sentry's documented
// ESM setup). Entry points also import it as a fallback; ESM caches by URL, so it only runs once.
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RENDER_GIT_COMMIT, // set automatically by Render
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    profileSessionSampleRate: 1.0,
    profileLifecycle: 'trace',
    sendDefaultPii: false,
  });
}

export default Sentry;
