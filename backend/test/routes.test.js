'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { db, authResponses, load, call, USER_A, USER_B } = require('./helpers');

const cats = load('cats.js');
const logs = load('logs.js');
const auth = load('auth.js');
const dashboard = load('dashboard.js');

const userB = { id: USER_B, email: 'b@example.com', name: 'B', metadata: {} };

test.beforeEach(() => { for (const t of Object.values(db.tables)) t.length = 0; for (const k of Object.keys(authResponses)) delete authResponses[k]; });

// ---------------------------------------------------------------- cats
test('cats: create → camelCase shape the app expects, 201', async () => {
  const r = await call(cats, 'POST', '/', { body: { name: 'Mochi', age: 3, sex: 'male', weight: 4.2, breed: 'Tabby' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.cat.name, 'Mochi');
  assert.equal(r.body.cat.userId, USER_A);
  assert.equal(r.body.cat.sex, 'male');
  assert.equal(r.body.cat.photoUrl, null);
  assert.match(r.body.cat.catId, /^[0-9a-f-]{36}$/);
  assert.ok(Date.parse(r.body.cat.createdAt));
});

test('cats: name required; bad sex rejected', async () => {
  assert.equal((await call(cats, 'POST', '/', { body: {} })).status, 400);
  const bad = await call(cats, 'POST', '/', { body: { name: 'X', sex: 'robot' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'ValidationError');
});

test('cats: a non-image "photo" is refused (magic-byte check), not stored', async () => {
  const notImage = Buffer.from('this is definitely not an image').toString('base64');
  const r = await call(cats, 'POST', '/', { body: { name: 'Sneaky', photo: `data:image/jpeg;base64,${notImage}` } });
  assert.equal(r.status, 400);
  assert.equal(db.tables.cats.length, 0);
});

test('cats: users only see and touch their own cats', async () => {
  const mine = (await call(cats, 'POST', '/', { body: { name: 'Mine' } })).body.cat;
  await call(cats, 'POST', '/', { body: { name: 'Theirs' }, user: userB });

  const list = await call(cats, 'GET', '/');
  assert.deepEqual(list.body.cats.map((c) => c.name), ['Mine']);

  const theirsId = db.tables.cats.find((c) => c.name === 'Theirs').cat_id;
  assert.equal((await call(cats, 'GET', '/:id', { params: { id: theirsId } })).status, 404);
  assert.equal((await call(cats, 'PUT', '/:id', { params: { id: theirsId }, body: { name: 'Hacked' } })).status, 404);
  assert.equal((await call(cats, 'DELETE', '/:id', { params: { id: theirsId } })).status, 404);
  assert.equal(db.tables.cats.find((c) => c.cat_id === theirsId).name, 'Theirs');
  assert.equal((await call(cats, 'GET', '/:id', { params: { id: mine.catId } })).status, 200);
});

test('cats: malformed id is a 404, not a 500', async () => {
  assert.equal((await call(cats, 'GET', '/:id', { params: { id: 'not-a-uuid' } })).status, 404);
});

test('cats: update + delete', async () => {
  const { catId } = (await call(cats, 'POST', '/', { body: { name: 'Old' } })).body.cat;
  const up = await call(cats, 'PUT', '/:id', { params: { id: catId }, body: { name: 'New', weight: 5 } });
  assert.equal(up.body.cat.name, 'New');
  assert.equal(up.body.cat.weight, 5);
  assert.equal((await call(cats, 'DELETE', '/:id', { params: { id: catId } })).status, 200);
  assert.equal(db.tables.cats.length, 0);
});

// ---------------------------------------------------------------- logs
async function makeCat(user) { return (await call(cats, 'POST', '/', { body: { name: 'C' }, user })).body.cat.catId; }

test('logs: create returns composite id, defaults counts to 0', async () => {
  const catId = await makeCat();
  const r = await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14', pooCount: 2 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.log.id, `${catId}_2025-12-14`);
  assert.equal(r.body.log.pooCount, 2);
  assert.equal(r.body.log.peeCount, 0);
  assert.equal(r.body.log.date, '2025-12-14');
});

test('logs: full ISO timestamp is trimmed to its date', async () => {
  const catId = await makeCat();
  const r = await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14T23:10:00.000Z' } });
  assert.equal(r.body.log.date, '2025-12-14');
});

test('logs: same cat + day is replaced, not duplicated', async () => {
  const catId = await makeCat();
  await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14', foodCount: 1 } });
  await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14', foodCount: 3 } });
  assert.equal(db.tables.logs.length, 1);
  assert.equal(db.tables.logs[0].food_count, 3);
});

test('logs: cannot log against someone else\'s cat', async () => {
  const theirCat = await makeCat(userB);
  const r = await call(logs, 'POST', '/', { body: { catId: theirCat, date: '2025-12-14' } });
  assert.equal(r.status, 404);
  assert.equal(db.tables.logs.length, 0);
});

test('logs: list newest-first, filter by cat, ownership enforced', async () => {
  const catId = await makeCat();
  for (const d of ['2025-12-12', '2025-12-14', '2025-12-13']) await call(logs, 'POST', '/', { body: { catId, date: d } });
  const all = await call(logs, 'GET', '/');
  assert.deepEqual(all.body.logs.map((l) => l.date), ['2025-12-14', '2025-12-13', '2025-12-12']);
  assert.equal((await call(logs, 'GET', '/', { query: { catId }, user: userB })).status, 404);
  assert.equal((await call(logs, 'GET', '/', { user: userB })).body.logs.length, 0);
});

test('logs: get/update/delete by composite id; bad id → 400; other user → 404', async () => {
  const catId = await makeCat();
  const id = `${catId}_2025-12-14`;
  await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14', pooCount: 1 } });

  assert.equal((await call(logs, 'GET', '/:id', { params: { id } })).body.log.pooCount, 1);
  // The app PUTs the whole LogResponse back, including id/catId/date/createdAt — extras must be ignored.
  const up = await call(logs, 'PUT', '/:id', { params: { id }, body: { id, catId, date: '2025-01-01', createdAt: 'x', pooCount: 4, notes: 'ok' } });
  assert.equal(up.body.log.pooCount, 4);
  assert.equal(up.body.log.date, '2025-12-14');

  assert.equal((await call(logs, 'GET', '/:id', { params: { id: 'garbage' } })).status, 400);
  assert.equal((await call(logs, 'GET', '/:id', { params: { id }, user: userB })).status, 404);
  assert.equal((await call(logs, 'DELETE', '/:id', { params: { id }, user: userB })).status, 404);
  assert.equal((await call(logs, 'DELETE', '/:id', { params: { id } })).status, 200);
  assert.equal((await call(logs, 'DELETE', '/:id', { params: { id } })).status, 404);
});

test('logs: out-of-range values are rejected', async () => {
  const catId = await makeCat();
  assert.equal((await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14', pooCount: -1 } })).status, 400);
  assert.equal((await call(logs, 'POST', '/', { body: { catId, date: 'yesterday' } })).status, 400);
});

// ---------------------------------------------------------------- dashboard
test('dashboard: per-cat analysis for the caller only', async () => {
  const catId = await makeCat();
  await call(logs, 'POST', '/', { body: { catId, date: '2025-12-14', temperature: 41, pooCount: 2, waterCount: 1 } });
  const r = await call(dashboard, 'GET', '/analytics');
  assert.equal(r.body.totalCats, 1);
  assert.equal(r.body.analysis[0].averageTemperature, '41.0');
  assert.ok(r.body.analysis[0].healthIssues.some((i) => i.includes('Temperature')));
  assert.equal((await call(dashboard, 'GET', '/analytics', { user: userB })).body.totalCats, 0);
});

// ---------------------------------------------------------------- auth: Cognito-compatible errors
const GOOD_PW = 'Str0ng!Pass';

test('auth/register: weak password → InvalidPasswordException', async () => {
  const r = await call(auth, 'POST', '/register', { body: { email: 'x@y.com', password: 'weak', name: 'X' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'InvalidPasswordException');
});

test('auth/register: existing confirmed email → UsernameExistsException', async () => {
  authResponses.signUp = { data: { user: { identities: [] } }, error: null };
  const r = await call(auth, 'POST', '/register', { body: { email: 'x@y.com', password: GOOD_PW, name: 'X' } });
  assert.equal(r.body.code, 'UsernameExistsException');
});

test('auth/register: success → 201', async () => {
  authResponses.signUp = { data: { user: { identities: [{ id: 'i' }] } }, error: null };
  assert.equal((await call(auth, 'POST', '/register', { body: { email: 'X@Y.com ', password: GOOD_PW, name: 'X' } })).status, 201);
});

test('auth/login: success returns the exact shape the app stores', async () => {
  authResponses.signInWithPassword = { data: { session: { access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }, user: { id: USER_A, email: 'a@example.com', user_metadata: { name: 'Ann' } } }, error: null };
  const r = await call(auth, 'POST', '/login', { body: { email: 'a@example.com', password: 'whatever' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { message: 'Login successful', token: 'AT', accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600, user: { userId: USER_A, email: 'a@example.com', name: 'Ann' } });
});

test('auth/login: wrong password → 401 NotAuthorizedException; unconfirmed → UserNotConfirmedException', async () => {
  authResponses.signInWithPassword = { data: {}, error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } };
  let r = await call(auth, 'POST', '/login', { body: { email: 'a@example.com', password: 'nope' } });
  assert.equal(r.status, 401); assert.equal(r.body.code, 'NotAuthorizedException'); assert.equal(r.body.message, 'Invalid email or password');

  authResponses.signInWithPassword = { data: {}, error: { code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' } };
  r = await call(auth, 'POST', '/login', { body: { email: 'a@example.com', password: 'nope' } });
  assert.equal(r.status, 401); assert.equal(r.body.code, 'UserNotConfirmedException');
});

test('auth/verify + reset: bad/expired code → CodeMismatchException; rate limit → LimitExceededException', async () => {
  authResponses.verifyOtp = { data: {}, error: { code: 'otp_expired', status: 403, message: 'Token has expired or is invalid' } };
  assert.equal((await call(auth, 'POST', '/verify', { body: { email: 'a@example.com', code: '123456' } })).body.code, 'CodeMismatchException');
  assert.equal((await call(auth, 'POST', '/reset-password', { body: { email: 'a@example.com', code: '1', newPassword: GOOD_PW } })).body.code, 'CodeMismatchException');

  authResponses.resend = { data: {}, error: { code: 'over_email_send_rate_limit', status: 429, message: 'rate limit' } };
  const r = await call(auth, 'POST', '/resend-code', { body: { email: 'a@example.com' } });
  assert.equal(r.status, 429); assert.equal(r.body.code, 'LimitExceededException');
});

test('auth/forgot-password: never reveals whether the email exists', async () => {
  authResponses.resetPasswordForEmail = { data: {}, error: { code: 'user_not_found', status: 404, message: 'nope' } };
  assert.equal((await call(auth, 'POST', '/forgot-password', { body: { email: 'ghost@example.com' } })).status, 200);
});

test('auth/change-password: wrong current password → NotAuthorizedException', async () => {
  authResponses.signInWithPassword = { data: {}, error: { code: 'invalid_credentials', status: 400, message: 'x' } };
  const r = await call(auth, 'POST', '/change-password', { body: { oldPassword: 'wrong', newPassword: GOOD_PW } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'NotAuthorizedException');
});

test('auth/change-password: correct current password succeeds', async () => {
  authResponses.signInWithPassword = { data: { session: {}, user: {} }, error: null };
  const r = await call(auth, 'POST', '/change-password', { body: { oldPassword: 'right', newPassword: GOOD_PW } });
  assert.equal(r.status, 200);
});

test('auth/refresh: returns a new session', async () => {
  authResponses.refreshSession = { data: { session: { access_token: 'AT2', refresh_token: 'RT2', expires_in: 3600 }, user: { id: USER_A, email: 'a@example.com', user_metadata: {} } }, error: null };
  const r = await call(auth, 'POST', '/refresh', { body: { refreshToken: 'RT' } });
  assert.equal(r.body.accessToken, 'AT2');
});

test('unexpected errors become a clean 500 with no internals leaked', async () => {
  const { errorHandler } = require('../src/middleware/errorHandler');
  const out = {}; const res = { headersSent: false, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  errorHandler(new Error('connection string postgres://secret'), { log: { error() {} } }, res, () => {});
  assert.equal(out.status, 500);
  assert.equal(out.body.message, 'Internal server error');
});
