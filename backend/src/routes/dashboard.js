import express from 'express';
import { admin } from '../lib/supabase.js';
import { toLog } from '../lib/mappers.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeLogs } from '../services/analytics.js';

const router = express.Router();
router.use(requireAuth);

router.get('/analytics', async (req, res) => {
  const { data: cats, error } = await admin.from('cats').select('cat_id,name,breed').eq('user_id', req.user.id).is('archived_at', null).order('created_at', { ascending: true });
  if (error) throw error;

  const analysis = await Promise.all(cats.map(async (cat) => {
    const { data: logs, error: logsError } = await admin
      .from('logs').select('*').eq('cat_id', cat.cat_id).order('log_date', { ascending: false }).limit(30);
    if (logsError) throw logsError;
    return {
      catId: cat.cat_id,
      catName: cat.name,
      breed: cat.breed || 'Unknown',
      ...analyzeLogs(logs.map(toLog)),
    };
  }));

  res.json({ totalCats: cats.length, analysis });
});

export default router;
