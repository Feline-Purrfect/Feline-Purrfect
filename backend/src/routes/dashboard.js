'use strict';

const express = require('express');
const { admin } = require('../lib/supabase');
const { toLog } = require('../lib/mappers');
const { requireAuth } = require('../middleware/auth');
const { analyzeLogs } = require('../services/analytics');

const router = express.Router();
router.use(requireAuth);

router.get('/analytics', async (req, res) => {
  const { data: cats, error } = await admin.from('cats').select('cat_id,name,breed').eq('user_id', req.user.id).order('created_at', { ascending: true });
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

module.exports = router;
