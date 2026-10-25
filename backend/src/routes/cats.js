import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { admin } from '../lib/supabase.js';
import { HttpError, notFound, parse, isUuid } from '../lib/errors.js';
import { toCat, toPhoto } from '../lib/mappers.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadCatPhoto, uploadGalleryPhoto, signPhotoPaths, deletePhotos } from '../services/storage.js';
import logger from '../lib/logger.js';

const router = express.Router();
router.use(requireAuth);

// ------------------------------------------------------------------ validation
const todayUtc = () => new Date().toISOString().slice(0, 10);
const plusDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Calendar dates travel as YYYY-MM-DD. A full ISO timestamp is accepted and trimmed (older app builds).
const calendarDate = (label) => z.string({ required_error: `${label} is required` })
  .transform((s) => s.slice(0, 10))
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)), `${label} must be YYYY-MM-DD`)
  // +1 day of slack: the phone's "today" can be ahead of UTC.
  .refine((s) => s <= plusDays(todayUtc(), 1), `${label} can't be in the future`)
  .refine((s) => s >= '1980-01-01', `${label} is too far in the past`);

const text = z.string().trim().max(100).nullish();

// Accept "985 112 004 384 821" or "985-112-…": keep digits only. Empty means "no microchip".
const microchip = z.string().nullish().transform((v) => (v == null ? v : v.replace(/\D/g, '') || null))
  .refine((v) => v == null || /^\d{9,15}$/.test(v), 'Microchip ID must be 9–15 digits');

const catFields = {
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(100),
  sex: z.enum(['male', 'female'], { required_error: 'Sex is required', invalid_type_error: 'Sex must be male or female' }),
  birthDate: calendarDate('Birthday'),
  birthDateEstimated: z.boolean().optional(),
  adoptedDate: calendarDate('Adopted date'),
  weight: z.number().min(0).max(30, 'Weight must be 30 kg or less').nullish(), // always kilograms
  weightUnit: z.enum(['kg', 'lb']).optional(),                                 // how the owner wants to see it
  breed: text,
  color: text,
  microchipId: microchip,
  photo: z.string().max(10_000_000).nullish(), // base64 / data URI
  age: z.number().min(0).max(40).optional(),    // legacy clients only: converted to an estimated birthday
};

const createSchema = z.object({
  ...catFields,
  birthDate: catFields.birthDate.optional(),
  adoptedDate: catFields.adoptedDate.optional(),
}).superRefine((b, ctx) => {
  if (!b.birthDate && b.age === undefined) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Birthday is required' });
});
const updateSchema = z.object(catFields).partial();

function birthDateFromAge(age) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - Math.round(age * 12));
  return d.toISOString().slice(0, 10);
}

function assertDatesInOrder(birthDate, adoptedDate) {
  if (birthDate && adoptedDate && adoptedDate < birthDate) {
    throw new HttpError(400, 'ValidationError', 'Adopted date can’t be before the birthday');
  }
}

// ------------------------------------------------------------------ helpers
async function findOwnedCat(userId, catId) {
  if (!isUuid(catId)) throw notFound('Cat');
  const { data, error } = await admin.from('cats').select('*').eq('cat_id', catId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Cat');
  return data;
}

/**
 * Card status for each cat from its most recent log in the last two weeks:
 * `lastLogDate` (the app compares it with the phone's local "today") and an `attention` label when
 * the latest log (within 2 days) shows something worth a look.
 */
async function logSummaries(userId, catIds) {
  const out = new Map();
  if (catIds.length === 0) return out;
  const since = plusDays(todayUtc(), -14);
  const { data, error } = await admin
    .from('logs')
    .select('cat_id,log_date,symptoms,appetite,energy')
    .eq('user_id', userId)
    .in('cat_id', catIds) // one cat when presenting a single cat, not every cat's two weeks
    .gte('log_date', since)
    .order('log_date', { ascending: false });
  if (error) throw error;

  const recent = plusDays(todayUtc(), -2);
  for (const l of data ?? []) {
    if (out.has(l.cat_id)) continue; // rows are newest-first; first one wins
    let attention = null;
    if (l.log_date >= recent) {
      const first = Array.isArray(l.symptoms) ? l.symptoms[0] : null;
      if (first?.name) attention = first.count > 1 ? `${first.name} ×${first.count}` : first.name;
      else if (l.appetite != null && l.appetite <= 2) attention = 'Eating less';
      else if (l.energy != null && l.energy <= 2) attention = 'Low energy';
    }
    out.set(l.cat_id, { lastLogDate: String(l.log_date).slice(0, 10), attention });
  }
  return out;
}

async function present(rows, userId) {
  const [urls, summaries] = await Promise.all([
    signPhotoPaths(rows.map((c) => c.photo_path)),
    logSummaries(userId, rows.filter((c) => !c.archived_at).map((c) => c.cat_id)),
  ]);
  return rows.map((c) => toCat(c, { photoUrl: urls.get(c.photo_path) ?? null, ...(summaries.get(c.cat_id) ?? {}) }));
}

const presentOne = async (row, userId) => (await present([row], userId))[0];

async function galleryPaths(userId, catId) {
  let q = admin.from('cat_photos').select('path').eq('user_id', userId);
  if (catId) q = q.eq('cat_id', catId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((p) => p.path);
}

// ------------------------------------------------------------------ cats
router.post('/', async (req, res) => {
  const body = parse(createSchema, req.body);
  const birthDate = body.birthDate ?? birthDateFromAge(body.age);
  const adoptedDate = body.adoptedDate ?? todayUtc();
  assertDatesInOrder(birthDate, adoptedDate);
  const catId = crypto.randomUUID();

  // A failed photo upload doesn't block creating the cat.
  let photoPath = null;
  if (body.photo) {
    try {
      photoPath = await uploadCatPhoto(req.user.id, catId, body.photo);
    } catch (err) {
      if (err instanceof HttpError) throw err; // bad/oversized/non-image input is the caller's problem
      logger.error({ err }, 'Photo upload failed; creating cat without photo');
    }
  }

  const { data, error } = await admin.from('cats').insert({
    cat_id: catId,
    user_id: req.user.id,
    name: body.name,
    sex: body.sex,
    birth_date: birthDate,
    birth_date_estimated: body.birthDate ? (body.birthDateEstimated ?? false) : true,
    adopted_date: adoptedDate,
    weight: body.weight ?? null,
    weight_unit: body.weightUnit ?? 'kg',
    breed: body.breed ?? null,
    color: body.color ?? null,
    microchip_id: body.microchipId ?? null,
    photo_path: photoPath,
  }).select().single();

  if (error) {
    await deletePhotos([photoPath]);
    throw error;
  }
  res.status(201).json({ message: 'Cat added', cat: await presentOne(data, req.user.id) });
});

// ?archived=true lists archived cats; the default is the active ones.
router.get('/', async (req, res) => {
  const archived = req.query.archived === 'true';
  let q = admin.from('cats').select('*').eq('user_id', req.user.id);
  q = archived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
  const { data, error } = await q.order(archived ? 'archived_at' : 'created_at', { ascending: !archived });
  if (error) throw error;
  res.json({ cats: await present(data, req.user.id) });
});

// Most recent gallery photos across the user's active cats ("Recent photos" on My cats).
// Registered before '/:id' so "photos" is never treated as a cat id.
router.get('/photos/recent', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 30);
  const { data: cats, error: catsError } = await admin.from('cats').select('cat_id,name').eq('user_id', req.user.id).is('archived_at', null);
  if (catsError) throw catsError;
  if (cats.length === 0) return res.json({ photos: [] });

  const names = new Map(cats.map((c) => [c.cat_id, c.name]));
  const { data, error } = await admin.from('cat_photos').select('*')
    .eq('user_id', req.user.id).in('cat_id', [...names.keys()])
    .order('taken_on', { ascending: false }).order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const urls = await signPhotoPaths(data.map((p) => p.path));
  res.json({ photos: data.map((p) => toPhoto(p, urls.get(p.path), names.get(p.cat_id))) });
});

// Every photo of the user's cats taken between two dates (inclusive), e.g. the week the Logs tab shows.
// One request for all the day cards instead of one per cat per day.
const photoRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
}).refine((r) => r.from <= r.to, 'from must be before to')
  .refine((r) => Date.parse(r.to) - Date.parse(r.from) <= 62 * 86_400_000, 'Ask for at most two months at a time');

router.get('/photos', async (req, res) => {
  const range = parse(photoRangeSchema, { from: req.query.from, to: req.query.to });
  const { data, error } = await admin.from('cat_photos').select('*')
    .eq('user_id', req.user.id).gte('taken_on', range.from).lte('taken_on', range.to)
    .order('taken_on', { ascending: false }).order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const urls = await signPhotoPaths(data.map((p) => p.path));
  res.json({ photos: data.map((p) => toPhoto(p, urls.get(p.path))) });
});

router.get('/:id', async (req, res) => {
  const row = await findOwnedCat(req.user.id, req.params.id);
  res.json({ cat: await presentOne(row, req.user.id) });
});

router.put('/:id', async (req, res) => {
  const existing = await findOwnedCat(req.user.id, req.params.id);
  const previousPhotoPath = existing.photo_path;
  const body = parse(updateSchema, req.body);

  const patch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.sex !== undefined) patch.sex = body.sex;
  if (body.birthDate !== undefined) patch.birth_date = body.birthDate;
  if (body.birthDateEstimated !== undefined) patch.birth_date_estimated = body.birthDateEstimated;
  if (body.birthDate === undefined && body.age !== undefined) {
    patch.birth_date = birthDateFromAge(body.age);
    patch.birth_date_estimated = true;
  }
  if (body.adoptedDate !== undefined) patch.adopted_date = body.adoptedDate;
  if (body.weight !== undefined) patch.weight = body.weight;
  if (body.weightUnit !== undefined) patch.weight_unit = body.weightUnit;
  if (body.breed !== undefined) patch.breed = body.breed;
  if (body.color !== undefined) patch.color = body.color;
  if (body.microchipId !== undefined) patch.microchip_id = body.microchipId;

  assertDatesInOrder(
    patch.birth_date ?? String(existing.birth_date ?? '').slice(0, 10),
    patch.adopted_date ?? String(existing.adopted_date ?? '').slice(0, 10),
  );

  // A remote URL means "unchanged" (the app echoes back the existing photoUrl); only upload new local images.
  if (body.photo && !body.photo.startsWith('http')) {
    try {
      patch.photo_path = await uploadCatPhoto(req.user.id, existing.cat_id, body.photo);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      logger.error({ err }, 'Photo upload failed; keeping previous photo');
    }
  }

  const { data, error } = await admin.from('cats').update(patch).eq('cat_id', existing.cat_id).eq('user_id', req.user.id).select().single();
  if (error) {
    if (patch.photo_path) await deletePhotos([patch.photo_path]);
    throw error;
  }
  // Each upload has its own path; the old file is no longer referenced.
  if (patch.photo_path && previousPhotoPath && previousPhotoPath !== patch.photo_path) await deletePhotos([previousPhotoPath]);
  res.json({ message: 'Changes saved', cat: await presentOne(data, req.user.id) });
});

// Permanent. The app only offers this for archived cats.
router.delete('/:id', async (req, res) => {
  const existing = await findOwnedCat(req.user.id, req.params.id);
  const paths = await galleryPaths(req.user.id, existing.cat_id);
  const { error } = await admin.from('cats').delete().eq('cat_id', existing.cat_id).eq('user_id', req.user.id); // logs + photo rows cascade
  if (error) throw error;
  await deletePhotos([existing.photo_path, ...paths]);
  res.json({ message: 'Cat deleted' });
});

// Archive = the cat has passed away. Logs, photos and reports stay; reminders stop; hidden from My cats.
router.post('/:id/archive', async (req, res) => {
  const existing = await findOwnedCat(req.user.id, req.params.id);
  if (existing.archived_at) return res.json({ message: 'Cat archived', cat: await presentOne(existing, req.user.id) });
  const { data, error } = await admin.from('cats').update({ archived_at: new Date().toISOString() })
    .eq('cat_id', existing.cat_id).eq('user_id', req.user.id).select().single();
  if (error) throw error;
  res.json({ message: 'Cat archived', cat: await presentOne(data, req.user.id) });
});

router.post('/:id/unarchive', async (req, res) => {
  const existing = await findOwnedCat(req.user.id, req.params.id);
  const { data, error } = await admin.from('cats').update({ archived_at: null })
    .eq('cat_id', existing.cat_id).eq('user_id', req.user.id).select().single();
  if (error) throw error;
  res.json({ message: 'Cat restored', cat: await presentOne(data, req.user.id) });
});

// ------------------------------------------------------------------ gallery
const photoSchema = z.object({
  photo: z.string({ required_error: 'Photo is required' }).min(1, 'Photo is required').max(10_000_000),
  takenOn: calendarDate('Photo date').optional(),
});

router.get('/:id/photos', async (req, res) => {
  if (!isUuid(req.params.id)) throw notFound('Cat');
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  // ?on=YYYY-MM-DD → only photos from that day (shown on that day's log)
  const on = typeof req.query.on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.on) ? req.query.on : null;

  // The ownership check and the photo query run together (both filter by the user anyway).
  let q = admin.from('cat_photos').select('*', { count: 'exact' }).eq('cat_id', req.params.id).eq('user_id', req.user.id);
  if (on) q = q.eq('taken_on', on);
  const [, { data, error, count }] = await Promise.all([
    findOwnedCat(req.user.id, req.params.id),
    q.order('taken_on', { ascending: false }).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
  ]);
  if (error) throw error;

  const urls = await signPhotoPaths(data.map((p) => p.path));
  res.json({ photos: data.map((p) => toPhoto(p, urls.get(p.path))), total: count ?? data.length });
});

router.post('/:id/photos', async (req, res) => {
  const cat = await findOwnedCat(req.user.id, req.params.id);
  const body = parse(photoSchema, req.body);
  const photoId = crypto.randomUUID();

  const path = await uploadGalleryPhoto(req.user.id, cat.cat_id, photoId, body.photo);
  const { data, error } = await admin.from('cat_photos').insert({
    photo_id: photoId,
    cat_id: cat.cat_id,
    user_id: req.user.id,
    path,
    taken_on: body.takenOn ?? todayUtc(),
  }).select().single();
  if (error) {
    await deletePhotos([path]);
    throw error;
  }
  const urls = await signPhotoPaths([path]);
  res.status(201).json({ message: 'Photo added', photo: toPhoto(data, urls.get(path)) });
});

router.delete('/:id/photos/:photoId', async (req, res) => {
  const cat = await findOwnedCat(req.user.id, req.params.id);
  if (!isUuid(req.params.photoId)) throw notFound('Photo');
  const { data, error } = await admin.from('cat_photos').delete()
    .eq('photo_id', req.params.photoId).eq('cat_id', cat.cat_id).eq('user_id', req.user.id).select('path');
  if (error) throw error;
  if (!data || data.length === 0) throw notFound('Photo');
  await deletePhotos(data.map((p) => p.path));
  res.json({ message: 'Photo deleted' });
});

export default router;
