// Daily log reminder: per-user settings and the job that sends the pushes.
//
// One push per user per day, at the time they chose, in their own time zone, and only if at least one
// active cat has no finished log (food + water filled in) for that local day. The cron job runs every
// 5 minutes (render.yaml); `last_reminded_on` makes each day's reminder go out at most once.

import config from '../config.js';
import logger from '../lib/logger.js';
import {
  DEFAULT_REMIND_AT,
  DEFAULT_TIME_ZONE,
  REMINDER_WINDOW_MINUTES,
  dueOccurrence,
  latestOccurrence,
  localClock,
  normalizeTime,
} from '../lib/reminderTime.js';
import { admin } from '../lib/supabase.js';

const TABLE = 'notification_settings';
const PAGE = 1000;
const ID_CHUNK = 200;

export const REMINDER_TYPE = 'daily-log-reminder';
export const REMINDER_CHANNEL = 'daily-reminder'; // Android channel the app creates

const DEFAULTS = {
  daily_reminder: true,
  remind_at: DEFAULT_REMIND_AT,
  timezone: DEFAULT_TIME_ZONE,
  last_reminded_on: null,
};

export const isNotificationTester = (userId) =>
  config.notificationTesterIds.has(String(userId).toLowerCase());

/** DB row → API shape. `canSendTest` is only present for testers (NOTIFICATION_TESTER_IDS). */
export function toSettings(row, userId) {
  const r = row ?? DEFAULTS;
  return {
    dailyReminder: r.daily_reminder,
    remindAt: normalizeTime(r.remind_at) ?? DEFAULT_REMIND_AT,
    timezone: r.timezone,
    ...(userId && isNotificationTester(userId) ? { canSendTest: true } : {}),
  };
}

export async function getSettingsRow(userId) {
  const { data, error } = await admin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Create or update a user's settings. `patch` uses DB column names (daily_reminder, remind_at, timezone).
 * When the schedule changes and the new time has already passed today (within the send window), today's
 * occurrence is marked handled, so a change never fires an immediate reminder: it starts next time.
 * Returns the stored row; writes nothing when nothing changed.
 */
export async function saveSettings(userId, patch, now = new Date()) {
  const existing = await getSettingsRow(userId);
  const current = existing ?? { user_id: userId, ...DEFAULTS };
  const next = { ...current, ...patch, user_id: userId };
  next.remind_at = normalizeTime(next.remind_at) ?? DEFAULT_REMIND_AT;

  const scheduleChanged =
    !existing ||
    next.remind_at !== normalizeTime(current.remind_at) ||
    next.timezone !== current.timezone ||
    (next.daily_reminder && !current.daily_reminder);

  if (scheduleChanged && next.daily_reminder) {
    const occ = latestOccurrence(
      { remindAt: next.remind_at, timeZone: next.timezone },
      now,
    );
    const last = next.last_reminded_on
      ? String(next.last_reminded_on).slice(0, 10)
      : null;
    if (occ.minutesAgo < REMINDER_WINDOW_MINUTES && (!last || last < occ.date))
      next.last_reminded_on = occ.date;
  }

  const changed =
    !existing ||
    ['daily_reminder', 'remind_at', 'timezone', 'last_reminded_on'].some(
      (k) =>
        (k === 'remind_at' ? normalizeTime(current[k]) : current[k]) !==
        next[k],
    );
  if (!changed) return existing;

  const row = {
    user_id: userId,
    daily_reminder: next.daily_reminder,
    remind_at: next.remind_at,
    timezone: next.timezone,
    last_reminded_on: next.last_reminded_on ?? null,
  };
  const { data, error } = await admin
    .from(TABLE)
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------- the job

/** "Mochi", "Mochi and Tofu", "Mochi, Tofu and Miso", or "4 of your cats". */
function catList(names) {
  if (names.length === 1) return names[0];
  if (names.length > 3) return `${names.length} of your cats`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function buildMessage(missing, totalCats) {
  if (missing.length === 1)
    return `${missing[0]} still needs today’s log. Tap to finish it.`;
  if (missing.length === totalCats && totalCats > 3)
    return 'None of your cats have today’s log yet. Tap to log them.';
  return `${catList(missing)} still need today’s log. Tap to finish them.`;
}

async function fetchEnabledSettings() {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(TABLE)
      .select('user_id,remind_at,timezone,last_reminded_on')
      .eq('daily_reminder', true)
      .order('user_id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function fetchMissing(day, userIds) {
  const rows = [];
  for (let i = 0; i < userIds.length; i += ID_CHUNK) {
    const { data, error } = await admin.rpc('cats_missing_log_for', {
      day,
      user_ids: userIds.slice(i, i + ID_CHUNK),
    });
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

async function fetchTokens(userIds) {
  const tokens = [];
  for (let i = 0; i < userIds.length; i += ID_CHUNK) {
    const { data, error } = await admin
      .from('device_tokens')
      .select('token,user_id')
      .in('user_id', userIds.slice(i, i + ID_CHUNK));
    if (error) throw error;
    tokens.push(...data);
  }
  return tokens;
}

async function markHandled(day, userIds) {
  for (let i = 0; i < userIds.length; i += ID_CHUNK) {
    const { error } = await admin
      .from(TABLE)
      .update({ last_reminded_on: day })
      .in('user_id', userIds.slice(i, i + ID_CHUNK));
    if (error) throw error;
  }
}

/**
 * Tester-only: send the reminder to the caller's devices right now, ignoring the time and the
 * once-a-day rule (nothing is recorded, so the real reminder still goes out tonight). Uses today's
 * real missing cats in the user's time zone; if every cat is logged, sends a sample so delivery can
 * still be checked.
 */
export async function sendTestReminder(userId, { now = new Date(), send }) {
  const row = await getSettingsRow(userId);
  const timeZone = row?.timezone ?? DEFAULT_TIME_ZONE;
  const day = localClock(timeZone, now).date;

  const { data: tokens, error } = await admin
    .from('device_tokens')
    .select('token,user_id')
    .eq('user_id', userId);
  if (error) throw error;
  if (!tokens.length) return { devices: 0, sent: 0, missingCats: 0, day };

  const missing = await fetchMissing(day, [userId]);
  const body = missing.length
    ? buildMessage(
        missing.map((r) => r.name),
        missing[0].total_cats,
      )
    : 'Every cat is logged today, so the real reminder would stay quiet. This is a test.';
  const messages = tokens.map((t) => ({
    to: t.token,
    title: 'Daily log reminder (test)',
    body,
    channelId: REMINDER_CHANNEL,
    data: { type: REMINDER_TYPE, date: day, test: true },
  }));

  const { sent, deadTokens } = await send(messages);
  if (deadTokens.length) {
    const { error: delError } = await admin
      .from('device_tokens')
      .delete()
      .in('token', deadTokens);
    if (delError)
      logger.warn({ err: delError }, 'Could not prune dead device tokens');
  }
  return { devices: tokens.length, sent, missingCats: missing.length, day };
}

/**
 * One run of the reminder job. `send` is services/push.js#sendPush (injected so tests run offline).
 * Each due occurrence is marked handled BEFORE sending, so a crash mid-run can skip a reminder but
 * never send it twice (Render never overlaps runs of one cron job).
 */
export async function runDailyReminders({ now = new Date(), send }) {
  const settings = await fetchEnabledSettings();

  const dueByDay = new Map(); // local date -> user ids
  for (const s of settings) {
    const occ = dueOccurrence(
      {
        remindAt: s.remind_at,
        timeZone: s.timezone,
        lastRemindedOn: s.last_reminded_on,
      },
      now,
    );
    if (!occ) continue;
    if (!dueByDay.has(occ.date)) dueByDay.set(occ.date, []);
    dueByDay.get(occ.date).push(s.user_id);
  }

  const summary = {
    usersDue: 0,
    usersWithMissingLogs: 0,
    catsMissingLogs: 0,
    devicesTargeted: 0,
    pushesSent: 0,
    deadTokensPruned: 0,
  };
  if (dueByDay.size === 0) return summary;

  const messages = [];
  for (const [day, userIds] of dueByDay) {
    summary.usersDue += userIds.length;
    await markHandled(day, userIds);

    const missing = await fetchMissing(day, userIds);
    if (missing.length === 0) continue;

    const byUser = new Map();
    for (const r of missing) {
      if (!byUser.has(r.user_id))
        byUser.set(r.user_id, { totalCats: r.total_cats, names: [] });
      byUser.get(r.user_id).names.push(r.name);
    }
    summary.usersWithMissingLogs += byUser.size;
    summary.catsMissingLogs += missing.length;

    for (const t of await fetchTokens([...byUser.keys()])) {
      const u = byUser.get(t.user_id);
      messages.push({
        to: t.token,
        title: 'Daily log reminder',
        body: buildMessage(u.names, u.totalCats),
        channelId: REMINDER_CHANNEL,
        data: { type: REMINDER_TYPE, date: day },
      });
    }
  }

  summary.devicesTargeted = messages.length;
  if (messages.length === 0) return summary;

  const { sent, deadTokens } = await send(messages);
  summary.pushesSent = sent;
  summary.deadTokensPruned = deadTokens.length;
  if (deadTokens.length) {
    const { error } = await admin
      .from('device_tokens')
      .delete()
      .in('token', deadTokens);
    if (error)
      logger.warn({ err: error }, 'Could not prune dead device tokens');
  }
  return summary;
}
