import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dueOccurrence,
  isValidTimeZone,
  latestOccurrence,
} from '../src/lib/reminderTime.js';
import {
  buildMessage,
  runDailyReminders,
  sendTestReminder,
} from '../src/services/reminders.js';
import { call, db, load, USER_A, USER_B } from './helpers.js';

const notifications = await load('notifications.js');
const devices = await load('devices.js');

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';
const userB = { id: USER_B, email: 'b@example.com', name: 'B', metadata: {} };

test.beforeEach(() => {
  for (const t of Object.values(db.tables)) t.length = 0;
});

// A fake push sender that records what would have gone to Expo.
function recorder() {
  const sent = [];
  const send = async (messages) => {
    sent.push(...messages);
    return { sent: messages.length, deadTokens: [] };
  };
  return { sent, send };
}

const cat = (id, userId, name, extra = {}) => ({
  cat_id: id,
  user_id: userId,
  name,
  archived_at: null,
  created_at: id,
  ...extra,
});
const finishedLog = (catId, userId, day) => ({
  cat_id: catId,
  user_id: userId,
  log_date: day,
  food_amount: 50,
  food_unit: 'g',
  water_amount: 100,
  water_unit: 'ml',
});
const settings = (userId, extra = {}) => ({
  user_id: userId,
  daily_reminder: true,
  remind_at: '23:00:00',
  timezone: 'America/Halifax',
  last_reminded_on: null,
  ...extra,
});

// 2026-10-18 23:03 in Halifax (ADT, UTC-3) is 2026-10-19 02:03 UTC.
const HALIFAX_2303 = new Date('2026-10-19T02:03:00Z');

// ---------------------------------------------------------------- time-zone math
test('reminder time: occurrence is computed in the user’s own calendar, not UTC', () => {
  assert.deepEqual(
    latestOccurrence(
      { remindAt: '23:00', timeZone: 'America/Halifax' },
      HALIFAX_2303,
    ),
    { date: '2026-10-18', minutesAgo: 3 },
  );
  // Same instant in Seoul is 11:03 on the 19th: the last 23:00 was the evening before.
  assert.deepEqual(
    latestOccurrence(
      { remindAt: '23:00', timeZone: 'Asia/Seoul' },
      HALIFAX_2303,
    ),
    { date: '2026-10-18', minutesAgo: 723 },
  );
  // Shortly after midnight, a 23:30 reminder still belongs to the previous day.
  assert.deepEqual(
    latestOccurrence(
      { remindAt: '23:30', timeZone: 'UTC' },
      new Date('2026-10-19T00:10:00Z'),
    ),
    { date: '2026-10-18', minutesAgo: 40 },
  );
});

test('reminder time: due only inside the window and only once per local day', () => {
  const base = { remindAt: '23:00', timeZone: 'America/Halifax' };
  assert.equal(
    dueOccurrence({ ...base, lastRemindedOn: null }, HALIFAX_2303)?.date,
    '2026-10-18',
  );
  assert.equal(
    dueOccurrence({ ...base, lastRemindedOn: '2026-10-18' }, HALIFAX_2303),
    null,
  );
  assert.equal(
    dueOccurrence({ ...base, lastRemindedOn: '2026-10-17' }, HALIFAX_2303)
      ?.date,
    '2026-10-18',
  );
  assert.equal(
    dueOccurrence(
      { ...base, lastRemindedOn: null },
      new Date('2026-10-19T01:55:00Z'),
    ),
    null,
  ); // 22:55, not yet
  assert.equal(
    dueOccurrence(
      { ...base, lastRemindedOn: null },
      new Date('2026-10-19T03:30:00Z'),
    ),
    null,
  ); // 00:30, window passed
  assert.equal(
    dueOccurrence(
      { remindAt: '23:00', timeZone: 'Not/AZone', lastRemindedOn: null },
      HALIFAX_2303,
    ),
    null,
  );
  assert.equal(isValidTimeZone('America/Halifax'), true);
  assert.equal(isValidTimeZone('Mars/Olympus'), false);
});

// ---------------------------------------------------------------- settings routes
test('notifications: GET returns defaults (on, 23:00) before anything is saved', async () => {
  const r = await call(notifications, 'GET', '/settings', { user: userB });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, {
    dailyReminder: true,
    remindAt: '23:00',
    timezone: 'UTC',
  });
});

test('notifications: PUT saves time, zone and switch; validates input', async () => {
  let r = await call(notifications, 'PUT', '/settings', {
    body: { remindAt: '21:30', timezone: 'America/Halifax' },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, {
    dailyReminder: true,
    remindAt: '21:30',
    timezone: 'America/Halifax',
    canSendTest: true,
  });

  r = await call(notifications, 'PUT', '/settings', {
    body: { dailyReminder: false },
  });
  assert.equal(r.body.dailyReminder, false);
  assert.equal(db.tables.notification_settings.length, 1);

  for (const body of [
    {},
    { remindAt: '25:00' },
    { remindAt: '9:00' },
    { timezone: 'Mars/Olympus' },
    { dailyReminder: 'yes' },
  ]) {
    const bad = await call(notifications, 'PUT', '/settings', { body });
    assert.equal(bad.status, 400, JSON.stringify(body));
  }
});

test('notifications: users only see their own settings', async () => {
  await call(notifications, 'PUT', '/settings', {
    body: { remindAt: '20:00' },
  });
  const r = await call(notifications, 'GET', '/settings', { user: userB });
  assert.equal(r.body.remindAt, '23:00');
});

test('devices: registering creates reminder settings in the phone’s time zone; later calls keep it current', async () => {
  let r = await call(devices, 'POST', '/', {
    body: { token: TOKEN_A, platform: 'ios', timezone: 'America/Halifax' },
  });
  assert.equal(r.status, 201);
  assert.deepEqual(
    db.tables.notification_settings.map((s) => [
      s.user_id,
      s.timezone,
      s.remind_at,
    ]),
    [[USER_A, 'America/Halifax', '23:00']],
  );

  r = await call(devices, 'POST', '/', {
    body: { token: TOKEN_A, platform: 'ios', timezone: 'Asia/Seoul' },
  });
  assert.equal(db.tables.notification_settings[0].timezone, 'Asia/Seoul');

  r = await call(devices, 'POST', '/', {
    body: { token: TOKEN_A, timezone: 'Mars/Olympus' },
  });
  assert.equal(r.status, 400);
});

// ---------------------------------------------------------------- the job
test('job: reminds a user once when a cat has no finished log, naming only the missing cats', async () => {
  db.tables.cats.push(
    cat('c1', USER_A, 'Mochi'),
    cat('c2', USER_A, 'Tofu'),
    cat('c3', USER_A, 'Old', { archived_at: '2026-01-01' }),
  );
  db.tables.logs.push(finishedLog('c1', USER_A, '2026-10-18'));
  db.tables.device_tokens.push({ token: TOKEN_A, user_id: USER_A });
  db.tables.notification_settings.push(settings(USER_A));

  const { sent, send } = recorder();
  const summary = await runDailyReminders({ now: HALIFAX_2303, send });
  assert.equal(summary.pushesSent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, TOKEN_A);
  assert.match(sent[0].body, /^Tofu still needs today’s log/);
  assert.deepEqual(sent[0].data, {
    type: 'daily-log-reminder',
    date: '2026-10-18',
  });
  assert.equal(
    db.tables.notification_settings[0].last_reminded_on,
    '2026-10-18',
  );

  // Five minutes later: already handled today.
  const again = recorder();
  await runDailyReminders({
    now: new Date(HALIFAX_2303.getTime() + 5 * 60_000),
    send: again.send,
  });
  assert.equal(again.sent.length, 0);
});

test('job: nothing is sent when every cat is logged, the switch is off, or it isn’t time yet', async () => {
  db.tables.cats.push(cat('c1', USER_A, 'Mochi'), cat('c2', USER_B, 'Miso'));
  db.tables.logs.push(finishedLog('c1', USER_A, '2026-10-18'));
  db.tables.device_tokens.push(
    { token: TOKEN_A, user_id: USER_A },
    { token: TOKEN_B, user_id: USER_B },
  );
  db.tables.notification_settings.push(
    settings(USER_A),
    settings(USER_B, { daily_reminder: false }),
  );

  const { sent, send } = recorder();
  await runDailyReminders({ now: new Date('2026-10-19T01:30:00Z'), send }); // 22:30 in Halifax
  assert.equal(sent.length, 0);
  await runDailyReminders({ now: HALIFAX_2303, send });
  assert.equal(sent.length, 0); // A logged everything; B switched reminders off
  assert.equal(
    db.tables.notification_settings[0].last_reminded_on,
    '2026-10-18',
  ); // A was still checked once
});

test('job: an unfinished log (food or water missing) still counts as not logged', async () => {
  db.tables.cats.push(cat('c1', USER_A, 'Mochi'));
  db.tables.logs.push({
    ...finishedLog('c1', USER_A, '2026-10-18'),
    water_amount: null,
    water_unit: null,
  });
  db.tables.device_tokens.push({ token: TOKEN_A, user_id: USER_A });
  db.tables.notification_settings.push(settings(USER_A));
  const { sent, send } = recorder();
  await runDailyReminders({ now: HALIFAX_2303, send });
  assert.equal(sent.length, 1);
});

test('job: each user is checked against their own local day', async () => {
  // At 02:03 UTC on the 19th it is 23:03 on the 18th in Halifax and 02:03 on the 19th in London.
  db.tables.cats.push(cat('c1', USER_A, 'Mochi'), cat('c2', USER_B, 'Miso'));
  db.tables.logs.push(finishedLog('c2', USER_B, '2026-10-19'));
  db.tables.device_tokens.push(
    { token: TOKEN_A, user_id: USER_A },
    { token: TOKEN_B, user_id: USER_B },
  );
  db.tables.notification_settings.push(
    settings(USER_A),
    settings(USER_B, { remind_at: '02:00', timezone: 'Europe/London' }),
  );
  // London is on BST (UTC+1) until Oct 25, so it is 03:03 there: B's 02:00 reminder is 63 min old → outside the window.
  const { sent, send } = recorder();
  await runDailyReminders({ now: HALIFAX_2303, send });
  assert.deepEqual(
    sent.map((m) => m.to),
    [TOKEN_A],
  );
});

test('settings: moving the time to one that already passed today starts tomorrow, not immediately', async () => {
  db.tables.cats.push(cat('c1', USER_A, 'Mochi'));
  db.tables.device_tokens.push({ token: TOKEN_A, user_id: USER_A });
  db.tables.notification_settings.push(
    settings(USER_A, { remind_at: '23:30' }),
  );

  // At 23:03 the user moves the reminder to 23:00 (3 minutes ago).
  const { saveSettings } = await import('../src/services/reminders.js');
  await saveSettings(USER_A, { remind_at: '23:00' }, HALIFAX_2303);
  assert.equal(
    db.tables.notification_settings[0].last_reminded_on,
    '2026-10-18',
  );

  const { sent, send } = recorder();
  await runDailyReminders({
    now: new Date(HALIFAX_2303.getTime() + 2 * 60_000),
    send,
  });
  assert.equal(sent.length, 0);
});

test('message: names one, a few, or counts many cats', () => {
  assert.match(buildMessage(['Mochi'], 2), /^Mochi still needs/);
  assert.match(
    buildMessage(['Mochi', 'Tofu'], 2),
    /^Mochi and Tofu still need/,
  );
  assert.match(buildMessage(['A', 'B', 'C'], 5), /^A, B and C still need/);
  assert.match(
    buildMessage(['A', 'B', 'C', 'D'], 6),
    /^4 of your cats still need/,
  );
  assert.match(buildMessage(['A', 'B', 'C', 'D'], 4), /^None of your cats/);
});

// ---------------------------------------------------------------- tester button
test('test push: only listed testers see the button and may call the endpoint', async () => {
  assert.equal(
    (await call(notifications, 'GET', '/settings')).body.canSendTest,
    true,
  ); // USER_A is a tester
  assert.equal(
    (await call(notifications, 'GET', '/settings', { user: userB })).body
      .canSendTest,
    undefined,
  );
  const r = await call(notifications, 'POST', '/test', { user: userB });
  assert.equal(r.status, 403);
});

test('test push: sends now with the real missing cats, records nothing', async () => {
  db.tables.cats.push(cat('c1', USER_A, 'Mochi'));
  db.tables.device_tokens.push({ token: TOKEN_A, user_id: USER_A });
  db.tables.notification_settings.push(settings(USER_A));

  const { sent, send } = recorder();
  const result = await sendTestReminder(USER_A, {
    now: new Date('2026-10-18T15:00:00Z'),
    send,
  }); // noon in Halifax
  assert.deepEqual(result, {
    devices: 1,
    sent: 1,
    missingCats: 1,
    day: '2026-10-18',
  });
  assert.match(sent[0].body, /^Mochi still needs/);
  assert.equal(sent[0].data.test, true);
  assert.equal(db.tables.notification_settings[0].last_reminded_on, null);

  db.tables.logs.push(finishedLog('c1', USER_A, '2026-10-18'));
  await sendTestReminder(USER_A, {
    now: new Date('2026-10-18T15:00:00Z'),
    send,
  });
  assert.match(sent[1].body, /This is a test/);
});

test('test push: no registered phone → nothing sent', async () => {
  const { sent, send } = recorder();
  const result = await sendTestReminder(USER_A, { send });
  assert.equal(result.devices, 0);
  assert.equal(sent.length, 0);
});
