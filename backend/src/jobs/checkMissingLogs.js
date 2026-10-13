/**
 * Daily reminder job — replaces the check-missing-logs Lambda + EventBridge rule.
 * Runs as a Render Cron Job at 23:30 UTC (see render.yaml). Finds every cat with no log for
 * today (UTC, same as before), groups by owner, and sends one Expo push per user.
 */

import Sentry from '../instrument.js'; // keep first
import config from '../config.js';
import logger from '../lib/logger.js';
import { admin } from '../lib/supabase.js';
import { sendPush } from '../services/push.js';

const PAGE = 1000;
const CRON_SCHEDULE = '30 23 * * *';

function buildMessage(missing, totalCats) {
  if (missing.length === 1) {
    return `You haven't logged health data for ${missing[0]} today. Tap to open the app and log their daily activities!`;
  }
  if (missing.length === totalCats) {
    return `You haven't logged health data for any of your cats today: ${missing.join(', ')}. Tap to open the app and log their daily activities!`;
  }
  return `You haven't logged health data for ${missing.length} of your cats today: ${missing.join(', ')}. Tap to open the app and complete today's logs!`;
}

async function fetchMissing(day) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.rpc('cats_missing_log', { day }).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function fetchTokens(userIds) {
  const tokens = [];
  for (let i = 0; i < userIds.length; i += 100) {
    const { data, error } = await admin.from('device_tokens').select('token,user_id').in('user_id', userIds.slice(i, i + 100));
    if (error) throw error;
    tokens.push(...data);
  }
  return tokens;
}

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  logger.info({ today }, 'Checking for missing daily logs');

  const missingRows = await fetchMissing(today);
  if (missingRows.length === 0) {
    logger.info('Every cat has a log for today');
    return { users: 0, notified: 0 };
  }

  const byUser = new Map();
  for (const r of missingRows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, { totalCats: r.total_cats, names: [] });
    byUser.get(r.user_id).names.push(r.name);
  }

  const tokens = await fetchTokens([...byUser.keys()]);
  const messages = tokens.map((t) => {
    const u = byUser.get(t.user_id);
    return {
      to: t.token,
      title: '🐱 Daily Health Log Reminder',
      body: buildMessage(u.names, u.totalCats),
      data: { type: 'daily-log-reminder', date: today },
    };
  });

  const { sent, deadTokens } = await sendPush(messages);

  if (deadTokens.length) {
    const { error } = await admin.from('device_tokens').delete().in('token', deadTokens);
    if (error) logger.warn({ err: error }, 'Could not prune dead device tokens');
  }

  const summary = {
    usersWithMissingLogs: byUser.size,
    catsMissingLogs: missingRows.length,
    devicesTargeted: messages.length,
    pushesSent: sent,
    deadTokensPruned: deadTokens.length,
  };
  logger.info(summary, 'Missing-logs check complete');
  return summary;
}

async function main() {
  try {
    if (config.sentry.dsn) {
      // Sentry Cron Monitor: alerts you if the job fails OR never runs.
      await Sentry.withMonitor('check-missing-logs', run, {
        schedule: { type: 'crontab', value: CRON_SCHEDULE },
        checkinMargin: 10,
        maxRuntime: 15,
        timezone: 'UTC',
      });
    } else {
      await run();
    }
  } catch (err) {
    logger.error({ err }, 'Missing-logs check failed');
    Sentry.captureException(err);
    process.exitCode = 1; // non-zero exit => Render marks the cron run as failed
  } finally {
    await Sentry.flush(2000).catch(() => {});
  }
}

main();
