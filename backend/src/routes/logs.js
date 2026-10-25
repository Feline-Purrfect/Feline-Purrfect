import express from 'express';
import { z } from 'zod';
import { admin } from '../lib/supabase.js';
import { HttpError, notFound, parse, isUuid } from '../lib/errors.js';
import { toLog } from '../lib/mappers.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// ------------------------------------------------------------------ validation
// The app sends YYYY-MM-DD. Be lenient with a full ISO timestamp by keeping just the date part.
const ymd = (label) => z.string({ required_error: `${label} is required` })
  .transform((s) => s.slice(0, 10))
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)), `${label} must be YYYY-MM-DD`);

const count = z.number().int().min(0).max(1000);

const symptom = z.object({
  name: z.string().trim().min(1, 'Symptom name is required').max(40),
  count: z.number().int().min(1).max(20).default(1),
});
const medication = z.object({
  name: z.string().trim().min(1, 'Medication name is required').max(80),
  dose: z.number().positive().max(10_000).nullish(),
  unit: z.enum(['mg', 'ml', 'pill']).default('mg'),
});

const fields = {
  foodAmount: z.number().min(0).max(5000).nullish(),
  foodUnit: z.enum(['g', 'cups', 'portions']).nullish(),
  waterAmount: z.number().min(0).max(10_000).nullish(),
  waterUnit: z.enum(['ml', 'bowls']).nullish(),
  pooCount: count.optional(),
  peeCount: count.optional(),
  symptoms: z.array(symptom).max(12, 'Up to 12 symptoms per day').optional(),
  teethBrushed: z.boolean().nullish(),
  medications: z.array(medication).max(10, 'Up to 10 medications per day').optional(),
  weight: z.number().min(0).max(30).nullish(),         // kg
  temperature: z.number().min(30).max(45).nullish(),   // °C
  notes: z.string().max(2000).nullish(),
};

// Older app builds sent tap counts and yes/no flags. Accepted on create and translated.
const legacy = {
  foodCount: count.optional(),
  waterCount: count.optional(),
  vomiting: z.boolean().nullish(),
  diarrhea: z.boolean().nullish(),
  appetite: z.number().int().min(1).max(5).nullish(),
  energy: z.number().int().min(1).max(5).nullish(),
};

const createSchema = z.object({ catId: z.string({ required_error: 'Cat ID is required' }), date: ymd('Date'), ...fields, ...legacy });
const updateSchema = z.object(fields); // unknown keys (id, catId, date, complete…) are stripped

// Merge duplicate symptom names ("vomiting" + "Vomiting") by adding their counts.
function normalizeSymptoms(list) {
  const byName = new Map();
  for (const s of list) {
    const key = s.name.toLowerCase();
    const prev = byName.get(key);
    byName.set(key, prev ? { ...prev, count: Math.min(20, prev.count + s.count) } : { name: s.name, count: s.count });
  }
  return [...byName.values()];
}

const has = (symptoms, name) => symptoms.some((s) => s.name.toLowerCase() === name);

/**
 * camelCase body → snake_case columns. `full` = creating/replacing the day's log, so missing fields are
 * reset to their defaults; otherwise only the keys present are touched.
 */
function toRow(body, { full }) {
  const row = {};

  const amountWithUnit = (amountKey, unitKey, label, col) => {
    const amount = body[amountKey];
    if (amount === undefined) {
      if (full) { row[`${col}_amount`] = null; row[`${col}_unit`] = null; }
      return;
    }
    if (amount === null) { row[`${col}_amount`] = null; row[`${col}_unit`] = null; return; }
    if (!body[unitKey]) throw new HttpError(400, 'ValidationError', `Choose a ${label} unit`);
    row[`${col}_amount`] = amount;
    row[`${col}_unit`] = body[unitKey];
  };
  amountWithUnit('foodAmount', 'foodUnit', 'food', 'food');
  amountWithUnit('waterAmount', 'waterUnit', 'water', 'water');

  // legacy tap counts
  if (body.foodAmount === undefined && body.foodCount !== undefined) {
    Object.assign(row, { food_amount: body.foodCount, food_unit: 'portions', food_count: body.foodCount });
  }
  if (body.waterAmount === undefined && body.waterCount !== undefined) {
    Object.assign(row, { water_amount: body.waterCount, water_unit: 'bowls', water_count: body.waterCount });
  }

  if (body.pooCount !== undefined || full) row.poo_count = body.pooCount ?? 0;
  if (body.peeCount !== undefined || full) row.pee_count = body.peeCount ?? 0;

  let symptoms = body.symptoms;
  if (symptoms === undefined && full && (body.vomiting || body.diarrhea)) {
    symptoms = [...(body.vomiting ? [{ name: 'Vomiting', count: 1 }] : []), ...(body.diarrhea ? [{ name: 'Diarrhea', count: 1 }] : [])];
  }
  if (symptoms !== undefined || full) {
    const list = normalizeSymptoms(symptoms ?? []);
    row.symptoms = list;
    // keep the legacy flags in step so nothing reading them disagrees
    row.vomiting = has(list, 'vomiting');
    row.diarrhea = has(list, 'diarrhea');
  }

  if (body.medications !== undefined || full) row.medications = body.medications ?? [];
  for (const [key, col] of [['teethBrushed', 'teeth_brushed'], ['weight', 'weight'], ['temperature', 'temperature'], ['notes', 'notes'], ['appetite', 'appetite'], ['energy', 'energy']]) {
    if (body[key] !== undefined) row[col] = body[key] === '' ? null : body[key];
    else if (full) row[col] = null;
  }
  if (typeof row.notes === 'string') row.notes = row.notes.trim() || null;
  return row;
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

/** A weight logged on the cat's most recent weighed day becomes the cat's current weight. */
async function syncCatWeight(userId, catId, date, weight) {
  if (weight == null) return;
  const { data, error } = await admin.from('logs').select('log_date')
    .eq('cat_id', catId).eq('user_id', userId).not('weight', 'is', null)
    .order('log_date', { ascending: false }).limit(1);
  if (error) throw error;
  if (data?.[0] && String(data[0].log_date).slice(0, 10) === date) {
    const { error: upErr } = await admin.from('cats').update({ weight }).eq('cat_id', catId).eq('user_id', userId);
    if (upErr) throw upErr;
  }
}

// ------------------------------------------------------------------ routes
// One log per cat per day: posting the same day again replaces it.
router.post('/', async (req, res) => {
  const body = parse(createSchema, req.body);
  await assertOwnsCat(req.user.id, body.catId);

  const row = { cat_id: body.catId, log_date: body.date, user_id: req.user.id, ...toRow(body, { full: true }) };
  const { data, error } = await admin.from('logs').upsert(row, { onConflict: 'cat_id,log_date' }).select().single();
  if (error) throw error;
  await syncCatWeight(req.user.id, body.catId, body.date, row.weight);
  res.status(201).json({ message: 'Log saved', log: toLog(data) });
});

// ?catId= to filter one cat, ?from=&to= (YYYY-MM-DD, inclusive) for a date range.
router.get('/', async (req, res) => {
  const { catId } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 1000);
  const range = parse(z.object({ from: ymd('from').optional(), to: ymd('to').optional() }), {
    from: req.query.from || undefined,
    to: req.query.to || undefined,
  });

  let query = admin.from('logs').select('*').eq('user_id', req.user.id);
  if (catId) query = query.eq('cat_id', String(catId));
  if (range.from) query = query.gte('log_date', range.from);
  if (range.to) query = query.lte('log_date', range.to);
  // The query is already limited to the caller's rows, so the ownership check (for a clean 404) can
  // run alongside it instead of before it.
  const [, { data, error }] = await Promise.all([
    catId ? assertOwnsCat(req.user.id, String(catId)) : null,
    query.order('log_date', { ascending: false }).limit(limit),
  ]);
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
  const patch = toRow(body, { full: false });

  // An empty patch would be a no-op update; still return the current row.
  if (Object.keys(patch).length === 0) {
    const { data, error } = await admin.from('logs').select('*').eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound('Log');
    return res.json({ message: 'Log saved', log: toLog(data) });
  }

  const { data, error } = await admin.from('logs').update(patch).eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Log');
  if (patch.weight !== undefined) await syncCatWeight(req.user.id, catId, date, patch.weight);
  res.json({ message: 'Log saved', log: toLog(data) });
});

router.delete('/:id', async (req, res) => {
  const { catId, date } = parseLogId(req.params.id);
  const { data, error } = await admin.from('logs').delete().eq('cat_id', catId).eq('log_date', date).eq('user_id', req.user.id).select('cat_id');
  if (error) throw error;
  if (!data || data.length === 0) throw notFound('Log');
  res.json({ message: 'Log deleted' });
});

export default router;
