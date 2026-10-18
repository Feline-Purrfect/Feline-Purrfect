/**
 * Daily log reminder job — Render Cron Job, every 5 minutes (see render.yaml).
 * Each user gets at most one push per day, at the time they chose in Settings (default 23:00) in
 * their phone's time zone, and only when an active cat has no finished log for that day.
 * The logic lives in services/reminders.js; this file only wires up monitoring and the exit code.
 */

import Sentry from '../instrument.js'; // keep first
import config from '../config.js';
import logger from '../lib/logger.js';
import { sendPush } from '../services/push.js';
import { runDailyReminders } from '../services/reminders.js';

const CRON_SCHEDULE = '*/5 * * * *';

async function run() {
  const summary = await runDailyReminders({ now: new Date(), send: sendPush });
  logger.info(summary, 'Daily reminder run complete');
  return summary;
}

async function main() {
  try {
    if (config.sentry.dsn) {
      // Sentry Cron Monitor: alerts you if the job fails OR stops running.
      await Sentry.withMonitor('check-missing-logs', run, {
        schedule: { type: 'crontab', value: CRON_SCHEDULE },
        checkinMargin: 5,
        maxRuntime: 5,
        timezone: 'UTC',
      });
    } else {
      await run();
    }
  } catch (err) {
    logger.error({ err }, 'Daily reminder run failed');
    Sentry.captureException(err);
    process.exitCode = 1; // non-zero exit => Render marks the cron run as failed
  } finally {
    await Sentry.flush(2000).catch(() => {});
  }
}

main();
