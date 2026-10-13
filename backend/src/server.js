import Sentry from './instrument.js'; // keep first
import config from './config.js';
import logger from './lib/logger.js';
import { createApp } from './app.js';

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(
    { port: config.port, env: config.env },
    'Feline Purrfect API listening',
  );
});

// Slightly longer than typical load-balancer idle timeouts, so Render never sees a dropped keep-alive.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Render sends SIGTERM on every deploy: stop accepting, let in-flight requests finish, flush Sentry.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async () => {
    await Sentry.close(2000).catch(() => {});
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  Sentry.captureException(reason);
});
process.on('uncaughtException', async (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  Sentry.captureException(err);
  await Sentry.close(2000).catch(() => {});
  process.exit(1);
});

