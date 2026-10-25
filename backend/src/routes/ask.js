import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import config from '../config.js';
import { admin } from '../lib/supabase.js';
import { HttpError, notFound, parse, isUuid } from '../lib/errors.js';
import { requireAuth, forgetUser } from '../middleware/auth.js';
import { claude, textOf } from '../services/claude.js';
import {
  GET_LOGS_TOOL, buildCatContext, isYmd, looksLikeEmergency, runGetLogs, systemPrompt,
} from '../services/askContext.js';

const router = express.Router();
router.use(requireAuth);

const HISTORY_MESSAGES = 12;  // earlier turns of the same chat sent with each question
const MAX_TOOL_ROUNDS = 4;    // get_logs calls per answer
const MAX_TOKENS = 4000;      // thinking counts toward this on Claude Haiku 5.5
const REFUSAL_TEXT = 'I can’t help with that one. Try asking it a different way, or check with your vet.';

// ------------------------------------------------------------------ mapping
const iso = (v) => (v ? new Date(v).toISOString() : null);

function toThread(row, catName) {
  return {
    threadId: row.thread_id,
    catId: row.cat_id ?? null,
    catName: row.cat_id ? (catName ?? null) : null,
    title: row.title,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function toMessage(row) {
  return {
    messageId: row.message_id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    emergency: Boolean(row.emergency),
    context: row.context ?? null,
    reported: Boolean(row.reported_at),
    createdAt: iso(row.created_at),
  };
}

// ------------------------------------------------------------------ helpers
const consentedAt = (user) => user.metadata?.ai_consent_at ?? null;

function assertConsent(user) {
  if (!consentedAt(user)) {
    throw new HttpError(403, 'AskConsentRequired', 'Allow Ask to share your question (and your cat’s logs) with the AI service first.');
  }
}

async function usedToday(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin.from('ask_messages').select('message_id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('role', 'user').gte('created_at', since);
  if (error) throw error;
  return count ?? 0;
}

async function ownedCat(userId, catId) {
  if (!isUuid(catId)) throw notFound('Cat');
  const { data, error } = await admin.from('cats').select('*').eq('cat_id', catId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Cat');
  return data;
}

async function ownedThread(userId, threadId) {
  if (!isUuid(threadId)) throw notFound('Chat');
  const { data, error } = await admin.from('ask_threads').select('*').eq('thread_id', threadId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Chat');
  return data;
}

async function catNames(userId, catIds) {
  const ids = [...new Set(catIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await admin.from('cats').select('cat_id,name').eq('user_id', userId).in('cat_id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((c) => [c.cat_id, c.name]));
}

async function recentMessages(threadId) {
  const { data, error } = await admin.from('ask_messages').select('role,content,created_at')
    .eq('thread_id', threadId).order('created_at', { ascending: false }).limit(HISTORY_MESSAGES);
  if (error) throw error;
  const rows = (data ?? []).reverse();
  // The API needs the conversation to start with a user turn.
  while (rows.length && rows[0].role !== 'user') rows.shift();
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

const titleFrom = (message) => {
  const flat = message.replace(/\s+/g, ' ').trim();
  return flat.length > 60 ? `${flat.slice(0, 57).trimEnd()}…` : flat;
};

/**
 * One answer: the model may call get_logs (cat chats only) a few times before replying.
 * Assistant turns are sent back unchanged, thinking blocks included, as the API requires.
 */
async function answer({ system, messages, userId, cat, today }) {
  const tools = cat ? [GET_LOGS_TOOL] : undefined;
  const convo = [...messages];
  const usage = { input: 0, output: 0 };

  for (let round = 0; ; round += 1) {
    const response = await claude.send({
      model: config.ask.model,
      max_tokens: MAX_TOKENS,
      system,
      messages: convo,
      ...(tools ? { tools } : {}),
      output_config: { effort: 'low' }, // chat: fast and cheap; raise if answers feel shallow
    });
    usage.input += response.usage?.input_tokens ?? 0;
    usage.output += response.usage?.output_tokens ?? 0;

    if (response.stop_reason === 'refusal') return { text: REFUSAL_TEXT, usage };

    const calls = (response.content ?? []).filter((b) => b.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || !calls.length || !cat || round >= MAX_TOOL_ROUNDS) {
      const text = textOf(response);
      return { text: text || 'Sorry, I couldn’t put an answer together. Please try again.', usage };
    }

    convo.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const call of calls) {
      const out = call.name === GET_LOGS_TOOL.name
        ? await runGetLogs(userId, cat.cat_id, call.input, today)
        : { error: true, text: `Unknown tool ${call.name}.` };
      results.push({ type: 'tool_result', tool_use_id: call.id, content: out.text, ...(out.error ? { is_error: true } : {}) });
    }
    convo.push({ role: 'user', content: results });
  }
}

// ------------------------------------------------------------------ status & consent
router.get('/status', async (req, res) => {
  const used = await usedToday(req.user.id);
  res.json({
    available: claude.available,
    consented: Boolean(consentedAt(req.user)),
    consentedAt: consentedAt(req.user),
    dailyLimit: config.ask.dailyLimit,
    remainingToday: Math.max(0, config.ask.dailyLimit - used),
  });
});

async function setConsent(user, value) {
  const metadata = { ...(user.metadata ?? {}), ai_consent_at: value };
  const { error } = await admin.auth.admin.updateUserById(user.id, { user_metadata: metadata });
  if (error) throw new HttpError(500, 'ConsentUpdateFailed', 'Couldn’t save your choice. Please try again.');
  forgetUser(user.id); // the auth cache holds the old metadata
  return value;
}

router.post('/consent', async (req, res) => {
  const at = await setConsent(req.user, new Date().toISOString());
  res.json({ consented: true, consentedAt: at });
});

router.delete('/consent', async (req, res) => {
  await setConsent(req.user, null);
  res.json({ consented: false, consentedAt: null });
});

// ------------------------------------------------------------------ threads
// ?subject=general → General chats; ?subject=<catId> → that cat's chats; no subject → all.
router.get('/threads', async (req, res) => {
  const subject = typeof req.query.subject === 'string' ? req.query.subject : '';
  let q = admin.from('ask_threads').select('*').eq('user_id', req.user.id);
  if (subject === 'general') q = q.is('cat_id', null);
  else if (subject) {
    if (!isUuid(subject)) throw notFound('Cat');
    q = q.eq('cat_id', subject);
  }
  const { data, error } = await q.order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  const names = await catNames(req.user.id, (data ?? []).map((t) => t.cat_id));
  res.json({ threads: (data ?? []).map((t) => toThread(t, names.get(t.cat_id))) });
});

router.get('/threads/:threadId', async (req, res) => {
  const thread = await ownedThread(req.user.id, req.params.threadId);
  const [{ data, error }, names] = await Promise.all([
    admin.from('ask_messages').select('*').eq('thread_id', thread.thread_id).order('created_at', { ascending: true }),
    catNames(req.user.id, [thread.cat_id]),
  ]);
  if (error) throw error;
  res.json({ thread: toThread(thread, names.get(thread.cat_id)), messages: (data ?? []).map(toMessage) });
});

router.delete('/threads/:threadId', async (req, res) => {
  const thread = await ownedThread(req.user.id, req.params.threadId);
  const { error } = await admin.from('ask_threads').delete().eq('thread_id', thread.thread_id).eq('user_id', req.user.id); // messages cascade
  if (error) throw error;
  res.json({ message: 'Chat deleted' });
});

// ------------------------------------------------------------------ ask
const askSchema = z.object({
  message: z.string({ required_error: 'Message is required' }).trim().min(1, 'Message is required').max(1000, 'Keep questions under 1,000 characters'),
  threadId: z.string().optional(),
  catId: z.string().nullish(),     // omit or null = General
  today: z.string().optional(),    // the phone's local date, so "today" matches what the owner sees
});

router.post('/', async (req, res) => {
  const body = parse(askSchema, req.body);
  if (!claude.available) throw new HttpError(503, 'AskUnavailable', 'Ask is not available right now.');
  assertConsent(req.user);

  // Independent lookups run together: the quota and the chat being continued…
  const [used, thread] = await Promise.all([
    usedToday(req.user.id),
    body.threadId ? ownedThread(req.user.id, body.threadId) : null,
  ]);
  if (used >= config.ask.dailyLimit) {
    throw new HttpError(429, 'AskLimitReached', `You’ve reached today’s limit of ${config.ask.dailyLimit} questions. Try again tomorrow.`);
  }

  // A continued chat keeps its subject; a new one takes it from catId.
  const catId = thread ? thread.cat_id : (body.catId || null);
  // …then the cat and the chat history.
  const [cat, history] = await Promise.all([
    catId ? ownedCat(req.user.id, catId) : null,
    thread ? recentMessages(thread.thread_id) : [],
  ]);

  const serverToday = new Date().toISOString().slice(0, 10);
  // Accept the phone's date only within a day of the server's (time zones), never an arbitrary one.
  const today = isYmd(body.today) && Math.abs(Date.parse(body.today) - Date.parse(serverToday)) <= 86_400_000
    ? body.today
    : serverToday;

  const emergency = looksLikeEmergency(body.message);

  let context = null;
  const messages = [...history];
  if (cat) {
    const built = await buildCatContext(req.user.id, cat, today);
    context = { catId: cat.cat_id, catName: cat.name, ...built.window };
    // The data rides on the newest user turn, so it's always the latest numbers (not stale ones
    // from when the chat began) and the system prompt stays identical across turns.
    messages.push({ role: 'user', content: `${built.text}\n\n<question>\n${body.message}\n</question>` });
  } else {
    messages.push({ role: 'user', content: body.message });
  }

  const preferLb = cat?.weight_unit === 'lb';
  const system = systemPrompt({ mode: cat ? 'cat' : 'general', cat, today, preferLb, emergency });
  const reply = await answer({ system, messages, userId: req.user.id, cat, today });

  // Saved only after a successful answer, so failures don't use up the daily quota.
  const now = Date.now();
  let threadRow = thread;
  if (!threadRow) {
    const { data, error } = await admin.from('ask_threads').insert({
      thread_id: crypto.randomUUID(),
      user_id: req.user.id,
      cat_id: catId,
      title: titleFrom(body.message),
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    }).select().single();
    if (error) throw error;
    threadRow = data;
  } else {
    const { data, error } = await admin.from('ask_threads').update({ updated_at: new Date(now).toISOString() })
      .eq('thread_id', thread.thread_id).eq('user_id', req.user.id).select().single();
    if (error) throw error;
    threadRow = data;
  }

  // Both rows list every column: in a multi-row insert, Supabase sends null (not the column default)
  // for any column a row leaves out, which breaks the not-null `emergency` column.
  const row = (fields) => ({
    message_id: crypto.randomUUID(),
    thread_id: threadRow.thread_id,
    user_id: req.user.id,
    emergency: false,
    context: null,
    model: null,
    input_tokens: null,
    output_tokens: null,
    ...fields,
  });
  const { data: saved, error: saveError } = await admin.from('ask_messages').insert([
    row({ role: 'user', content: body.message, created_at: new Date(now).toISOString() }),
    row({
      role: 'assistant', content: reply.text, emergency, context,
      model: config.ask.model, input_tokens: reply.usage.input, output_tokens: reply.usage.output,
      created_at: new Date(now + 1).toISOString(), // keeps the pair ordered
    }),
  ]).select();
  if (saveError) throw saveError;

  res.status(201).json({
    thread: toThread(threadRow, cat?.name),
    messages: (saved ?? []).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map(toMessage),
    remainingToday: Math.max(0, config.ask.dailyLimit - used - 1),
  });
});

// ------------------------------------------------------------------ report (Google Play requires in-app flagging)
router.post('/messages/:messageId/report', async (req, res) => {
  const body = parse(z.object({ reason: z.string().trim().max(500).optional() }), req.body);
  if (!isUuid(req.params.messageId)) throw notFound('Message');
  const { data, error } = await admin.from('ask_messages')
    .update({ reported_at: new Date().toISOString(), report_reason: body.reason || null })
    .eq('message_id', req.params.messageId).eq('user_id', req.user.id).eq('role', 'assistant')
    .select().maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Message');
  req.log.warn?.({ messageId: data.message_id }, 'Ask answer reported');
  res.json({ message: toMessage(data) });
});

export default router;
