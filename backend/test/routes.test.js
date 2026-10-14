import test from 'node:test';
import assert from 'node:assert/strict';
import { db, authResponses, storageCalls, load, call, USER_A, USER_B } from './helpers.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const cats = await load('cats.js');
const logs = await load('logs.js');
const auth = await load('auth.js');
const dashboard = await load('dashboard.js');

const userB = { id: USER_B, email: 'b@example.com', name: 'B', metadata: {} };

test.beforeEach(() => {
  for (const t of Object.values(db.tables)) t.length = 0;
  storageCalls.uploaded.length = 0;
  storageCalls.removed.length = 0;
  for (const k of Object.keys(authResponses)) delete authResponses[k];
});

// ---------------------------------------------------------------- cats
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64')}`;
const today = () => new Date().toISOString().slice(0, 10);
const yearsAgo = (n) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); return d.toISOString().slice(0, 10); };
const catBody = (extra = {}) => ({ name: 'Mochi', sex: 'male', birthDate: yearsAgo(3), adoptedDate: yearsAgo(2), ...extra });

test('cats: create → camelCase shape with derived age, 201', async () => {
  const r = await call(cats, 'POST', '/', { body: catBody({ weight: 4.2, weightUnit: 'lb', breed: 'Ragdoll', microchipId: '985 112 004 384 821' }) });
  assert.equal(r.status, 201);
  const c = r.body.cat;
  assert.equal(c.name, 'Mochi');
  assert.equal(c.userId, USER_A);
  assert.equal(c.age, 3);
  assert.equal(c.birthDate, yearsAgo(3));
  assert.equal(c.birthDateEstimated, false);
  assert.equal(c.weight, 4.2);
  assert.equal(c.weightUnit, 'lb');
  assert.equal(c.microchipId, '985112004384821'); // digits only
  assert.equal(c.archivedAt, null);
  assert.equal(c.photoUrl, null);
  assert.match(c.catId, /^[0-9a-f-]{36}$/);
});

test('cats: name, sex and birthday are required; bad values rejected', async () => {
  assert.equal((await call(cats, 'POST', '/', { body: {} })).status, 400);
  assert.equal((await call(cats, 'POST', '/', { body: catBody({ sex: undefined }) })).status, 400);
  const noBirthday = await call(cats, 'POST', '/', { body: catBody({ birthDate: undefined }) });
  assert.equal(noBirthday.status, 400);
  assert.match(noBirthday.body.message, /Birthday/);
  assert.equal((await call(cats, 'POST', '/', { body: catBody({ sex: 'robot' }) })).body.code, 'ValidationError');
  assert.equal((await call(cats, 'POST', '/', { body: catBody({ microchipId: '123' }) })).status, 400);
  assert.equal((await call(cats, 'POST', '/', { body: catBody({ weightUnit: 'stone' }) })).status, 400);
});

test('cats: birthday in the future or adoption before birth is rejected', async () => {
  const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  assert.equal((await call(cats, 'POST', '/', { body: catBody({ birthDate: future }) })).status, 400);
  const r = await call(cats, 'POST', '/', { body: catBody({ birthDate: yearsAgo(1), adoptedDate: yearsAgo(2) }) });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /before the birthday/);
});

test('cats: legacy clients sending `age` get an estimated birthday', async () => {
  const r = await call(cats, 'POST', '/', { body: { name: 'Old app', sex: 'female', age: 4 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.cat.age, 4);
  assert.equal(r.body.cat.birthDateEstimated, true);
});

test('cats: a non-image "photo" is refused (magic-byte check), not stored', async () => {
  const notImage = Buffer.from('this is definitely not an image').toString('base64');
  const r = await call(cats, 'POST', '/', { body: catBody({ photo: `data:image/jpeg;base64,${notImage}` }) });
  assert.equal(r.status, 400);
  assert.equal(db.tables.cats.length, 0);
});

test('cats: users only see and touch their own cats', async () => {
  const mine = (await call(cats, 'POST', '/', { body: catBody({ name: 'Mine' }) })).body.cat;
  await call(cats, 'POST', '/', { body: catBody({ name: 'Theirs' }), user: userB });

  const list = await call(cats, 'GET', '/');
  assert.deepEqual(list.body.cats.map((c) => c.name), ['Mine']);

  const theirsId = db.tables.cats.find((c) => c.name === 'Theirs').cat_id;
  assert.equal((await call(cats, 'GET', '/:id', { params: { id: theirsId } })).status, 404);
  assert.equal((await call(cats, 'PUT', '/:id', { params: { id: theirsId }, body: { name: 'Hacked' } })).status, 404);
  assert.equal((await call(cats, 'DELETE', '/:id', { params: { id: theirsId } })).status, 404);
  assert.equal((await call(cats, 'POST', '/:id/archive', { params: { id: theirsId } })).status, 404);
  assert.equal((await call(cats, 'GET', '/:id/photos', { params: { id: theirsId } })).status, 404);
  assert.equal(db.tables.cats.find((c) => c.cat_id === theirsId).name, 'Theirs');
  assert.equal((await call(cats, 'GET', '/:id', { params: { id: mine.catId } })).status, 200);
});

test('cats: malformed id is a 404, not a 500', async () => {
  assert.equal((await call(cats, 'GET', '/:id', { params: { id: 'not-a-uuid' } })).status, 404);
});

test('cats: update (partial) + adoption/birthday order checked against stored values', async () => {
  const { catId } = (await call(cats, 'POST', '/', { body: catBody({ name: 'Old' }) })).body.cat;
  const up = await call(cats, 'PUT', '/:id', { params: { id: catId }, body: { name: 'New', weight: 5, weightUnit: 'kg', birthDateEstimated: true } });
  assert.equal(up.status, 200);
  assert.equal(up.body.cat.name, 'New');
  assert.equal(up.body.cat.weight, 5);
  assert.equal(up.body.cat.birthDateEstimated, true);
  // stored birthday is 3 years ago; moving adoption to 5 years ago must fail
  assert.equal((await call(cats, 'PUT', '/:id', { params: { id: catId }, body: { adoptedDate: yearsAgo(5) } })).status, 400);
  // clearing the microchip with an empty string
  const cleared = await call(cats, 'PUT', '/:id', { params: { id: catId }, body: { microchipId: '' } });
  assert.equal(cleared.body.cat.microchipId, null);
});

test('cats: archive hides the cat from My cats, lists it under ?archived=true, unarchive restores', async () => {
  const { catId } = (await call(cats, 'POST', '/', { body: catBody({ name: 'Bean' }) })).body.cat;
  await call(cats, 'POST', '/', { body: catBody({ name: 'Tofu' }) });

  const a = await call(cats, 'POST', '/:id/archive', { params: { id: catId } });
  assert.equal(a.status, 200);
  assert.ok(Date.parse(a.body.cat.archivedAt));

  assert.deepEqual((await call(cats, 'GET', '/')).body.cats.map((c) => c.name), ['Tofu']);
  assert.deepEqual((await call(cats, 'GET', '/', { query: { archived: 'true' } })).body.cats.map((c) => c.name), ['Bean']);

  const u = await call(cats, 'POST', '/:id/unarchive', { params: { id: catId } });
  assert.equal(u.body.cat.archivedAt, null);
  assert.equal((await call(cats, 'GET', '/')).body.cats.length, 2);
});

test('cats: list carries lastLogDate + attention from the latest log', async () => {
  const { catId } = (await call(cats, 'POST', '/', { body: catBody() })).body.cat;
  db.tables.logs.push({ cat_id: catId, user_id: USER_A, log_date: today(), vomiting: true, appetite: 4 });
  const c = (await call(cats, 'GET', '/')).body.cats[0];
  assert.equal(c.lastLogDate, today());
  assert.equal(c.attention, 'Vomiting');
});

test('cats: delete removes the profile photo and every gallery photo file', async () => {
  const { catId } = (await call(cats, 'POST', '/', { body: catBody({ photo: PNG }) })).body.cat;
  await call(cats, 'POST', '/:id/photos', { params: { id: catId }, body: { photo: PNG } });
  assert.equal((await call(cats, 'DELETE', '/:id', { params: { id: catId } })).status, 200);
  assert.equal(db.tables.cats.length, 0);
  assert.ok(storageCalls.removed.includes(`${USER_A}/${catId}/profile`));
  assert.ok(storageCalls.removed.some((p) => p.startsWith(`${USER_A}/${catId}/photos/`)));
});

// ---------------------------------------------------------------- gallery
test('photos: add, list newest-first with total, recent across cats, delete', async () => {
  const mochi = (await call(cats, 'POST', '/', { body: catBody({ name: 'Mochi' }) })).body.cat.catId;
  const tofu = (await call(cats, 'POST', '/', { body: catBody({ name: 'Tofu' }) })).body.cat.catId;

  const p1 = await call(cats, 'POST', '/:id/photos', { params: { id: mochi }, body: { photo: PNG, takenOn: '2026-01-02' } });
  assert.equal(p1.status, 201);
  assert.match(p1.body.photo.url, /^https:\/\/signed\//);
  await call(cats, 'POST', '/:id/photos', { params: { id: mochi }, body: { photo: PNG, takenOn: '2026-03-04' } });
  await call(cats, 'POST', '/:id/photos', { params: { id: tofu }, body: { photo: PNG, takenOn: '2026-02-03' } });

  const list = await call(cats, 'GET', '/:id/photos', { params: { id: mochi }, query: { limit: '1' } });
  assert.equal(list.body.total, 2);
  assert.deepEqual(list.body.photos.map((p) => p.takenOn), ['2026-03-04']);

  const recent = await call(cats, 'GET', '/photos/recent');
  assert.deepEqual(recent.body.photos.map((p) => `${p.catName} ${p.takenOn}`), ['Mochi 2026-03-04', 'Tofu 2026-02-03', 'Mochi 2026-01-02']);

  // archived cats drop out of "recent"
  await call(cats, 'POST', '/:id/archive', { params: { id: tofu } });
  assert.equal((await call(cats, 'GET', '/photos/recent')).body.photos.length, 2);

  const del = await call(cats, 'DELETE', '/:id/photos/:photoId', { params: { id: mochi, photoId: p1.body.photo.photoId } });
  assert.equal(del.status, 200);
  assert.equal((await call(cats, 'GET', '/:id/photos', { params: { id: mochi } })).body.total, 1);
  assert.equal((await call(cats, 'DELETE', '/:id/photos/:photoId', { params: { id: mochi, photoId: p1.body.photo.photoId } })).status, 404);
});

test('photos: non-image and missing photo are rejected', async () => {
  const id = (await call(cats, 'POST', '/', { body: catBody() })).body.cat.catId;
  assert.equal((await call(cats, 'POST', '/:id/photos', { params: { id }, body: {} })).status, 400);
  const bad = Buffer.from('nope').toString('base64');
  assert.equal((await call(cats, 'POST', '/:id/photos', { params: { id }, body: { photo: bad } })).status, 400);
  assert.equal(db.tables.cat_photos.length, 0);
});


// ---------------------------------------------------------------- logs
async function makeCat(user) { return (await call(cats, 'POST', '/', { body: catBody({ name: 'C' }), user })).body.cat.catId; }

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
  const out = {}; const res = { headersSent: false, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  errorHandler(new Error('connection string postgres://secret'), { log: { error() {} } }, res, () => {});
  assert.equal(out.status, 500);
  assert.equal(out.body.message, 'Internal server error');
});
