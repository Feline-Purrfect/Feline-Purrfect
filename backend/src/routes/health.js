'use strict';

const express = require('express');
const { admin } = require('../lib/supabase');

const router = express.Router();

// Liveness: process is up. Render's health check hits this — keep it dependency-free so a
// Supabase blip doesn't make Render restart a perfectly healthy server.
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

// Readiness: can we actually reach the database? Point your uptime monitor here.
router.get('/health/ready', async (_req, res) => {
  const started = Date.now();
  try {
    const { error } = await admin.from('diseases').select('disease_id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok', database: 'up', latencyMs: Date.now() - started });
  } catch (_err) {
    res.status(503).json({ status: 'degraded', database: 'down', latencyMs: Date.now() - started });
  }
});

module.exports = router;
