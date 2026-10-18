// Time-zone math for the daily log reminder. Pure functions (no I/O) so they are easy to test.
//
// Each user picks a wall-clock time ("23:00") in their phone's IANA time zone ("America/Halifax").
// The job runs every few minutes and asks, per user: when was the most recent reminder time, in the
// user's own calendar, and has that occurrence been handled yet?

/** How long after the chosen time a reminder may still go out (covers late or skipped cron runs). */
const REMINDER_WINDOW_MINUTES = 60;

const DEFAULT_REMIND_AT = '23:00';
const DEFAULT_TIME_ZONE = 'UTC';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

/** Postgres returns `time` as "23:00:00"; the API speaks "23:00". */
function normalizeTime(value) {
  const m = TIME_RE.exec(String(value ?? ''));
  return m ? `${m[1]}:${m[2]}` : null;
}

const formatters = new Map();
function formatterFor(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  return formatters.get(timeZone);
}

function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone || timeZone.length > 64) return false;
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The user's local calendar date and minutes since local midnight at `now`. */
function localClock(timeZone, now = new Date()) {
  const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function previousDay(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The most recent reminder time at or before `now`, in the user's calendar:
 * `date` is the local day it belongs to (the day whose logs are checked), `minutesAgo` how long ago it was.
 */
function latestOccurrence({ remindAt, timeZone }, now = new Date()) {
  const [h, m] = normalizeTime(remindAt).split(':').map(Number);
  const target = h * 60 + m;
  const clock = localClock(timeZone, now);
  if (clock.minutes >= target) return { date: clock.date, minutesAgo: clock.minutes - target };
  return { date: previousDay(clock.date), minutesAgo: clock.minutes + 1440 - target };
}

/**
 * Should the job handle this user now? Due when the latest occurrence is recent enough and hasn't
 * been handled yet (`lastRemindedOn` is the local date of the last occurrence the job handled).
 * Returns the occurrence when due, otherwise null.
 */
function dueOccurrence({ remindAt, timeZone, lastRemindedOn }, now = new Date(), windowMinutes = REMINDER_WINDOW_MINUTES) {
  if (!normalizeTime(remindAt) || !isValidTimeZone(timeZone)) return null;
  const occ = latestOccurrence({ remindAt, timeZone }, now);
  if (occ.minutesAgo >= windowMinutes) return null;
  if (lastRemindedOn && String(lastRemindedOn).slice(0, 10) >= occ.date) return null;
  return occ;
}

export {
  REMINDER_WINDOW_MINUTES,
  DEFAULT_REMIND_AT,
  DEFAULT_TIME_ZONE,
  normalizeTime,
  isValidTimeZone,
  localClock,
  latestOccurrence,
  dueOccurrence,
};
