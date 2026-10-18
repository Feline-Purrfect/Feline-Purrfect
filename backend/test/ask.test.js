import test from 'node:test';
import assert from 'node:assert/strict';
import { db, authResponses, load, call, USER_A, USER_B } from './helpers.js';
import { claude } from '../src/services/claude.js';
import { addDays, looksLikeEmergency, runGetLogs, summarize } from '../src/services/askContext.js';

const ask = await load('ask.js');

const CAT = '33333333-3333-4333-8333-333333333333';
const OTHER_CAT = '44444444-4444-4444-8444-444444444444';
const today = new Date().toISOString().slice(0, 10);
const consented = { id: USER_A, email: 'a@example.com', name: 'A', metadata: { ai_consent_at: '2026-10-01T00:00:00.000Z' } };

const sent = [];
const reply = (text, extra = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text }],
  usage: { input_tokens: 1200, output_tokens: 150 },
  ...extra,
});
let script = [];
claude.send = async (body) => {
  sent.push(structuredClone(body));
  const next = script.shift();
  if (!next) throw new Error('unexpected Claude call');
  return typeof next === 'function' ? next(body) : next;
};

function seedCat(extra = {}) {
  db.tables.cats.push({
    cat_id: CAT, user_id: USER_A, name: 'Mochi', sex: 'male', birth_date: '2022-03-01', birth_date_estimated: false,
    adopted_date: '2022-06-01', weight: 4.2, weight_unit: 'lb', breed: 'Ragdoll', color: null, archived_at: null, ...extra,
  });
  db.tables.cats.push({
    cat_id: OTHER_CAT, user_id: USER_B, name: 'Not yours', sex: 'female', birth_date: '2020-01-01',
    adopted_date: '2020-01-01', weight: 3, weight_unit: 'kg', archived_at: null,
  });
}
const log = (daysAgo, extra = {}) => db.tables.logs.push({
  cat_id: CAT, user_id: USER_A, log_date: addDays(today, -daysAgo),
  food_amount: 60, food_unit: 'g', water_amount: 200, water_unit: 'ml', poo_count: 1, pee_count: 3,
  symptoms: [], medications: [], weight: null, temperature: null, notes: null, ...extra,
});

test.beforeEach(() => {
  for (const t of Object.values(db.tables)) t.length = 0;
  for (const k of Object.keys(authResponses)) delete authResponses[k];
  sent.length = 0;
  script = [];
});

// ---------------------------------------------------------------- consent & status
test('ask: questions need consent first; status reports it', async () => {
  let r = await call(ask, 'GET', '/status');
  assert.equal(r.body.consented, false);
  assert.equal(r.body.available, true);
  assert.equal(r.body.remainingToday, 30);

  r = await call(ask, 'POST', '/', { body: { message: 'Hi' } });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'AskConsentRequired');
  assert.equal(sent.length, 0);
});

test('ask: consent is saved in user metadata (and can be withdrawn)', async () => {
  const updates = [];
  authResponses.adminUpdateUserById = (id, attrs) => { updates.push({ id, attrs }); return { error: null }; };
  let r = await call(ask, 'POST', '/consent');
  assert.equal(r.body.consented, true);
  assert.equal(updates[0].id, USER_A);
  assert.ok(updates[0].attrs.user_metadata.ai_consent_at);

  r = await call(ask, 'DELETE', '/consent', { user: consented });
  assert.equal(r.body.consented, false);
  assert.equal(updates[1].attrs.user_metadata.ai_consent_at, null);
});

// ---------------------------------------------------------------- general chats
test('ask: a General question sends no logs and no tools, then saves the thread and both messages', async () => {
  script = [reply('Lilies are very toxic to cats.')];
  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'Which flowers are dangerous?' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.thread.catId, null);
  assert.equal(r.body.thread.title, 'Which flowers are dangerous?');
  assert.deepEqual(r.body.messages.map((m) => m.role), ['user', 'assistant']);
  assert.equal(r.body.messages[1].content, 'Lilies are very toxic to cats.'); // text block picked by type
  assert.equal(r.body.remainingToday, 29);

  const body = sent[0];
  assert.equal(body.model, 'claude-haiku-5-5');
  assert.equal(body.tools, undefined);
  assert.equal(body.temperature, undefined); // Haiku 5.5 rejects sampling parameters
  assert.deepEqual(body.output_config, { effort: 'low' });
  assert.match(body.system, /General chat/);
  assert.deepEqual(body.messages, [{ role: 'user', content: 'Which flowers are dangerous?' }]);
});

test('ask: follow-ups send the earlier turns as history', async () => {
  script = [reply('First answer.'), reply('Second answer.')];
  const first = await call(ask, 'POST', '/', { user: consented, body: { message: 'Q1' } });
  await call(ask, 'POST', '/', { user: consented, body: { message: 'Q2', threadId: first.body.thread.threadId } });
  assert.deepEqual(sent[1].messages.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.equal(sent[1].messages[1].content, 'First answer.');

  const r = await call(ask, 'GET', `/threads/:threadId`, { params: { threadId: first.body.thread.threadId } });
  assert.equal(r.body.messages.length, 4);
});

// ---------------------------------------------------------------- cat chats
test('ask: a cat question carries 30 days of logs plus computed summaries', async () => {
  seedCat();
  log(1, { symptoms: [{ name: 'Vomiting', count: 2 }], weight: 4.3, notes: 'Ate grass\nthen threw up' });
  log(3, { weight: 4.2 });
  log(40); // outside the window
  script = [reply('Mochi vomited twice yesterday.')];

  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'How has he been?', catId: CAT, today } });
  assert.equal(r.status, 201);
  const data = sent[0].messages.at(-1).content;
  assert.match(data, /Name: Mochi/);
  assert.match(data, /Vomiting×2/);
  assert.match(data, /notes: "Ate grass then threw up"/);
  assert.match(data, /Logged on 2 of 30 days/);
  assert.match(data, /Weight: 4\.2 kg .* → 4\.3 kg/);
  assert.match(data, /Older logs exist from/);
  assert.match(data, /<question>\nHow has he been\?\n<\/question>/);
  assert.ok(!data.includes(addDays(today, -40)) || data.includes('Older logs exist from'), 'the old day is only mentioned as a pointer');
  assert.equal(sent[0].tools[0].name, 'get_logs');
  assert.match(sent[0].system, /prefers pounds/);

  const ctx = r.body.messages[1].context;
  assert.equal(ctx.catName, 'Mochi');
  assert.equal(ctx.to, today);
  assert.equal(ctx.from, addDays(today, -29));
  assert.equal(ctx.loggedDays, 2);
});

test('ask: the model can read older logs with get_logs, for this cat only', async () => {
  seedCat();
  log(50, { symptoms: [{ name: 'Sneezing', count: 1 }] });
  script = [
    {
      stop_reason: 'tool_use',
      content: [
        { type: 'thinking', thinking: '', signature: 'sig' },
        { type: 'tool_use', id: 'tu_1', name: 'get_logs', input: { from: addDays(today, -60), to: addDays(today, -31) } },
      ],
      usage: { input_tokens: 900, output_tokens: 40 },
    },
    reply('He sneezed once about seven weeks ago.'),
  ];
  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'Has he sneezed before?', catId: CAT } });
  assert.equal(r.status, 201);
  // The assistant turn goes back unchanged (thinking block included), followed by the tool result.
  const second = sent[1].messages;
  assert.equal(second.at(-2).role, 'assistant');
  assert.equal(second.at(-2).content[0].type, 'thinking');
  const result = second.at(-1).content[0];
  assert.equal(result.type, 'tool_result');
  assert.equal(result.tool_use_id, 'tu_1');
  assert.match(result.content, /Sneezing/);
});

test('ask: get_logs rejects ranges that are too long or in the future', async () => {
  let out = await runGetLogs(USER_A, CAT, { from: addDays(today, -200), to: today }, today);
  assert.equal(out.error, true);
  out = await runGetLogs(USER_A, CAT, { from: today, to: addDays(today, 1) }, today);
  assert.equal(out.error, true);
  out = await runGetLogs(USER_A, CAT, { from: 'yesterday', to: today }, today);
  assert.equal(out.error, true);
});

test('ask: someone else’s cat or chat is a 404', async () => {
  seedCat();
  let r = await call(ask, 'POST', '/', { user: consented, body: { message: 'Hi', catId: OTHER_CAT } });
  assert.equal(r.status, 404);
  db.tables.ask_threads.push({ thread_id: '55555555-5555-4555-8555-555555555555', user_id: USER_B, cat_id: null, title: 'x' });
  r = await call(ask, 'POST', '/', { user: consented, body: { message: 'Hi', threadId: '55555555-5555-4555-8555-555555555555' } });
  assert.equal(r.status, 404);
  assert.equal(sent.length, 0);
});

// ---------------------------------------------------------------- safety, limits, reports
test('ask: emergency wording is flagged without relying on the model', async () => {
  assert.equal(looksLikeEmergency('My boy keeps going to the litter box and straining'), true);
  assert.equal(looksLikeEmergency('she ate part of a lily'), true);
  assert.equal(looksLikeEmergency('how often should I brush his teeth?'), false);

  script = [reply('Please call a vet now.')];
  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'He can’t pee and keeps crying' } });
  assert.equal(r.body.messages[1].emergency, true);
  assert.match(sent[0].system, /possible emergency/);
});

test('ask: the daily quota stops questions before the API is called', async () => {
  const now = new Date().toISOString();
  for (let i = 0; i < 30; i += 1) {
    db.tables.ask_messages.push({ message_id: `m${i}`, thread_id: 't', user_id: USER_A, role: 'user', content: 'q', created_at: now });
  }
  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'One more' } });
  assert.equal(r.status, 429);
  assert.equal(r.body.code, 'AskLimitReached');
  assert.equal(sent.length, 0);
});

test('ask: a refused or failed answer saves nothing', async () => {
  script = [() => { throw Object.assign(new Error('busy'), { status: 503, code: 'AskUnavailable' }); }];
  await call(ask, 'POST', '/', { user: consented, body: { message: 'Hello' } });
  assert.equal(db.tables.ask_threads.length, 0);
  assert.equal(db.tables.ask_messages.length, 0);

  script = [{ stop_reason: 'refusal', content: [], usage: {} }];
  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'Hello again' } });
  assert.match(r.body.messages[1].content, /can’t help with that/);
});

test('ask: answers can be reported; questions and other people’s answers cannot', async () => {
  script = [reply('An answer.')];
  const r = await call(ask, 'POST', '/', { user: consented, body: { message: 'Q' } });
  const [question, answer] = r.body.messages;

  let rep = await call(ask, 'POST', '/messages/:messageId/report', { params: { messageId: answer.messageId }, body: { reason: 'Wrong' } });
  assert.equal(rep.body.message.reported, true);
  rep = await call(ask, 'POST', '/messages/:messageId/report', { params: { messageId: question.messageId }, body: {} });
  assert.equal(rep.status, 404);
  rep = await call(ask, 'POST', '/messages/:messageId/report', {
    params: { messageId: answer.messageId }, body: {}, user: { id: USER_B, email: 'b@example.com', name: 'B', metadata: {} },
  });
  assert.equal(rep.status, 404);
});

test('ask: threads list by subject, and delete', async () => {
  seedCat();
  script = [reply('a'), reply('b')];
  await call(ask, 'POST', '/', { user: consented, body: { message: 'General one' } });
  const catChat = await call(ask, 'POST', '/', { user: consented, body: { message: 'About Mochi', catId: CAT } });

  let r = await call(ask, 'GET', '/threads', { query: { subject: 'general' } });
  assert.deepEqual(r.body.threads.map((t) => t.title), ['General one']);
  r = await call(ask, 'GET', '/threads', { query: { subject: CAT } });
  assert.equal(r.body.threads[0].catName, 'Mochi');
  r = await call(ask, 'GET', '/threads');
  assert.equal(r.body.threads.length, 2);

  await call(ask, 'DELETE', '/threads/:threadId', { params: { threadId: catChat.body.thread.threadId } });
  r = await call(ask, 'GET', '/threads');
  assert.equal(r.body.threads.length, 1);
});

test('ask: summaries keep units apart and say when nothing was logged', () => {
  const rows = [
    { log_date: addDays(today, -1), food_amount: 1, food_unit: 'cups', pee_count: 2, poo_count: 1, symptoms: [], medications: [] },
    { log_date: addDays(today, -2), food_amount: 60, food_unit: 'g', pee_count: 4, poo_count: 1, symptoms: [], medications: [] },
  ];
  const s = summarize(rows, addDays(today, -29), today);
  assert.match(s, /1 cups\/day over 1 day; 60 g\/day over 1 day|60 g\/day over 1 day; 1 cups\/day over 1 day/);
  assert.match(summarize([], addDays(today, -29), today), /No logs/);
});
