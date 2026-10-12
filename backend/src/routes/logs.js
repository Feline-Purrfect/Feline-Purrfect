'use strict';

const express = require('express');
const { z } = require('zod');
const { admin } = require('../lib/supabase');
const { HttpError, notFound, parse, isUuid } = require('../lib/errors');
const { toLog } = require('../lib/mappers');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// The app sends YYYY-MM-DD. Be lenient with a full ISO timestamp by keeping just the date part.
const dateOnly = z.string({ required_error: 'Date is required' })
  .transform((s) => s.slice(0, 10))
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)), 'Date must be YYYY-MM-DD');

const count = z.number().int().min(0).max(1000);

const metrics = {
  pooCount: count.optional(),
  peeCount: count.optional(),
  foodCount: count.optional(),
  waterCount: count.optional(),
  weight: z.number().min(0).max(50).nullish(),
  temperature: z.number().min(20).max(50).nullish(),
  notes: z.string().max(2000).nullish(),
  appetite: z.number().int().min(1).max(5).nullish(),
  energy: z.number().int().min(1).max(5).nullish(),
  vomiting: z.boolean().nullish(),
  diarrhea: z.boolean().nullish(),
};

const createSchema = z.object({
  catId: z.string({ required_error: 'Cat ID is required' }),
  date: dateOnly,
  ...metrics,
});
const updateSchema = z.object(metrics); // unknown keys (id, catId, date, createdAt…) are stripped

// Map camelCase body fields → snake_case columns, only for keys actually present.
const COLUMN = {
  pooCount: 'poo_count', peeCount: 'pee_count', foodCount: 'food_count', waterCount: 'water_count',
  weight: 'weight', temperature: 'temperature', notes: 'notes',
  appetite: 'appetite', energy: 'energy', vomiting: 'vomiting', diarrhea: 'diarrhea',
};
function toPatch(body) {
  const patch = {};
  for (const [key, col] of Object.entries(COLUMN)) if (body[key] !== undefined) patch[col] = body[key];
  return patch;
}

const LOG_ID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d{4}-\d{2}-\d{2})$/i;
function parseLogId(id) {
  const m = LOG_ID_RE.exec(id || '');
  if (!m) throw new HttpError(400, 'ValidationError', 'Invalid log ID format');
  return { catId: m[1], date: m[2] };
}

async function assertOwnsCat(userId, catId) {
  if (!isUuid(catId)) throw notFound('Cat');
  const { data, error } = await admin.from('cats').select('cat_id').eq('cat_id', catId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Cat');
}

// ------------------------------------------------------------------ routes
router.post('/', async (req, res) => {
  const body = parse(createSchema, req.body);
  await assertOwnsCat(req.user.id, body.catId);

  // One log per cat per day: posting the same day again replaces it (same as the old DynamoDB Put).
  const row = {
    cat_id: body.catId,
    log_date: body.date,
    user_id: req.user.id,
    poo_count: body.pooCount ?? 0,
    pee_count: body.peeCount ?? 0,
    food_count: body.foodCount ?? 0,
    water_count: body.waterCount ?? 0,
    weight: body.weight ?? null,
    temperature: body.temperature ?? null,
    notes: body.notes ?? null,
    appetite: body.appetite ?? null,
    energy: body.energy ?? null,
    vomiting: body.vomiting ?? null,
    diarrhea: body.diarrhea ?? null,
  };
  const { data, error } = await admin.from('logs').upsert(row, { onConflict: 'cat_id,log_date' }).select().single();
  if (error) throw error;
  res.status(201).json({ message: 'Log created successfully', log: toLog(data) });
});

router.get('/', async (req, res) => {
  const { catId } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 1000);

  let query = admin.from('logs').select('*').eq('user_id', req.user.id);
  if (catId) {
    await assertOwnsCat(req.user.id, String(catId));
    query = query.eq('cat_id', String(catId));
  }
  const { data, error } = await query.order('log_date', { ascending: false }).limit(limit);
  if (error) throw error;
  res.json({ logs: data.map(toLog) });
});

router.get('/:id', async (req, res) => {
  const { catId, date } = parseLogId(req.params.id);
  const { data, error } = await admin.from('logs').select('*').eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Log');
  res.json({ log: toLog(data) });
});

router.put('/:id', async (req, res) => {
  const { catId, date } = parseLogId(req.params.id);
  const body = parse(updateSchema, req.body);
  const patch = toPatch(body);

  // An empty patch would be a no-op update; still return the current row.
  if (Object.keys(patch).length === 0) {
    const { data, error } = await admin.from('logs').select('*').eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound('Log');
    return res.json({ message: 'Log updated successfully', log: toLog(data) });
  }

  const { data, error } = await admin.from('logs').update(patch).eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Log');
  res.json({ message: 'Log updated successfully', log: toLog(data) });
});

router.delete('/:id', async (req, res) => {
  const { catId, date } = parseLogId(req.params.id);
  const { data, error } = await admin.from('logs').delete().eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).select('cat_id');
  if (error) throw error;
  if (!data || data.length === 0) throw notFound('Log');
  res.json({ message: 'Log deleted successfully' });
});

module.exports = router;
