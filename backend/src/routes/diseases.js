import express from 'express';
import { admin } from '../lib/supabase.js';
import { notFound, isUuid } from '../lib/errors.js';
import { toDisease } from '../lib/mappers.js';

const router = express.Router();

// Reference data that only changes when you re-seed: cache the whole table for 5 minutes.
const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, rows: [] };

async function allDiseases() {
  if (Date.now() - cache.at < CACHE_MS && cache.rows.length) return cache.rows;
  const { data, error } = await admin.from('diseases').select('*').order('name', { ascending: true });
  if (error) throw error;
  cache = { at: Date.now(), rows: data.map(toDisease) };
  return cache.rows;
}

// Public (no auth), like the old Lambda — the disease library is browsable before sign-in.
router.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';

  let diseases = await allDiseases();
  if (search) {
    diseases = diseases.filter((d) =>
      d.name.toLowerCase().includes(search) ||
      d.symptoms.some((s) => s.toLowerCase().includes(search)) ||
      d.description?.toLowerCase().includes(search) ||
      d.category?.toLowerCase().includes(search));
  }
  if (category) diseases = diseases.filter((d) => d.category?.toLowerCase() === category);

  res.set('Cache-Control', 'public, max-age=300');
  res.json({ diseases });
});

router.get('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) throw notFound('Disease');
  const { data, error } = await admin.from('diseases').select('*').eq('disease_id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound('Disease');
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ disease: toDisease(data) });
});

export default router;
