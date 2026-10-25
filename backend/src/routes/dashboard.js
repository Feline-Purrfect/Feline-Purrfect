import express from 'express';
import { admin } from '../lib/supabase.js';
import logger from '../lib/logger.js';
import { toLog } from '../lib/mappers.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeLogs } from '../services/analytics.js';

const router = express.Router();
router.use(requireAuth);

const LOGS_PER_CAT = 30;

/**
 * The newest LOGS_PER_CAT logs of every active cat, in one round-trip (Postgres function from
 * migration 007). Falls back to one query per cat if the migration hasn't been run yet.
 */
async function recentLogsByCat(userId, cats) {
  const byCat = new Map(cats.map((c) => [c.cat_id, []]));
  const { data, error } = await admin.rpc('recent_logs_per_cat', { p_user_id: userId, p_limit: LOGS_PER_CAT });
  if (!error) {
    for (const row of data ?? []) byCat.get(row.cat_id)?.push(row);
    for (const list of byCat.values()) list.sort((a, b) => (a.log_date < b.log_date ? 1 : -1)); // newest first
    return byCat;
  }
  if (error.code !== 'PGRST202') throw error; // PGRST202 = function not found
  logger.warn('recent_logs_per_cat missing; run supabase/migrations/007_performance.sql');
  await Promise.all(cats.map(async (cat) => {
    const { data: logs, error: logsError } = await admin
      .from('logs').select('*').eq('cat_id', cat.cat_id).order('log_date', { ascending: false }).limit(LOGS_PER_CAT);
    if (logsError) throw logsError;
    byCat.set(cat.cat_id, logs);
  }));
  return byCat;
}

router.get('/analytics', async (req, res) => {
  const { data: cats, error } = await admin.from('cats').select('cat_id,name,breed').eq('user_id', req.user.id).is('archived_at', null).order('created_at', { ascending: true });
  if (error) throw error;
  if (cats.length === 0) return res.json({ totalCats: 0, analysis: [] });

  const logsByCat = await recentLogsByCat(req.user.id, cats);
  const analysis = cats.map((cat) => ({
    catId: cat.cat_id,
    catName: cat.name,
    breed: cat.breed || 'Unknown',
    ...analyzeLogs((logsByCat.get(cat.cat_id) ?? []).map(toLog)),
  }));

  res.json({ totalCats: cats.length, analysis });
});

export default router;
