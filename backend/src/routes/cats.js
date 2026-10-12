'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { z } = require('zod');
const { admin } = require('../lib/supabase');
const { HttpError, notFound, parse, isUuid } = require('../lib/errors');
const { toCat } = require('../lib/mappers');
const { requireAuth } = require('../middleware/auth');
const { uploadCatPhoto, signPhotoPaths, deletePhotos } = require('../services/storage');
const logger = require('../lib/logger');

const router = express.Router();
router.use(requireAuth);

const text = z.string().trim().max(100).nullish();
const isoDate = z.string().refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');

const catSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(100),
  age: z.number().min(0).max(40).optional(),
  sex: z.enum(['male', 'female']).optional(),
  adoptedDate: isoDate.optional(),
  weight: z.number().min(0).max(50).nullish(),
  breed: text,
  color: text,
  microchipId: z.string().trim().max(50).nullish(),
  photo: z.string().max(10_000_000).nullish(), // base64 / data URI
});

// ------------------------------------------------------------------ helpers
async function findOwnedCat(userId, catId) {
  if (!isUuid(catId)) throw notFound('Cat');
  const { data, error } = await admin.from('cats').select('*').eq('cat_id', catId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Cat');
  return data;
}

async function withPhotoUrl(row) {
  const urls = await signPhotoPaths([row.photo_path]);
  return toCat(row, urls.get(row.photo_path) ?? null);
}

// ------------------------------------------------------------------ routes
router.post('/', async (req, res) => {
  const body = parse(catSchema, req.body);
  const catId = crypto.randomUUID();

  // Mirrors the old behaviour: a failed photo upload doesn't block creating the cat.
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
    age: body.age ?? 0,
    sex: body.sex ?? 'female',
    adopted_date: body.adoptedDate ?? new Date().toISOString(),
    weight: body.weight ?? null,
    breed: body.breed ?? null,
    color: body.color ?? null,
    microchip_id: body.microchipId ?? null,
    photo_path: photoPath,
  }).select().single();

  if (error) {
    await deletePhotos([photoPath]);
    throw error;
  }
  res.status(201).json({ message: 'Cat created successfully', cat: await withPhotoUrl(data) });
});

router.get('/', async (req, res) => {
  const { data, error } = await admin.from('cats').select('*').eq('user_id', req.user.id).order('created_at', { ascending: true });
  if (error) throw error;

  const urls = await signPhotoPaths(data.map((c) => c.photo_path));
  res.json({ cats: data.map((c) => toCat(c, urls.get(c.photo_path) ?? null)) });
});

router.get('/:id', async (req, res) => {
  const row = await findOwnedCat(req.user.id, req.params.id);
  res.json({ cat: await withPhotoUrl(row) });
});

router.put('/:id', async (req, res) => {
  const existing = await findOwnedCat(req.user.id, req.params.id);
  const body = parse(catSchema.partial(), req.body);

  const patch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.age !== undefined) patch.age = body.age;
  if (body.sex !== undefined) patch.sex = body.sex;
  if (body.adoptedDate !== undefined) patch.adopted_date = body.adoptedDate;
  if (body.weight !== undefined) patch.weight = body.weight;
  if (body.breed !== undefined) patch.breed = body.breed;
  if (body.color !== undefined) patch.color = body.color;
  if (body.microchipId !== undefined) patch.microchip_id = body.microchipId;

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
  if (error) throw error;
  res.json({ message: 'Cat updated successfully', cat: await withPhotoUrl(data) });
});

router.delete('/:id', async (req, res) => {
  const existing = await findOwnedCat(req.user.id, req.params.id);
  const { error } = await admin.from('cats').delete().eq('cat_id', existing.cat_id).eq('user_id', req.user.id); // logs cascade
  if (error) throw error;
  await deletePhotos([existing.photo_path]);
  res.json({ message: 'Cat deleted successfully' });
});

module.exports = router;
