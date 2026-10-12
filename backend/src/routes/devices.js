'use strict';

const express = require('express');
const { z } = require('zod');
const { admin } = require('../lib/supabase');
const { HttpError, parse } = require('../lib/errors');
const { requireAuth } = require('../middleware/auth');
const { isValidToken } = require('../services/push');

const router = express.Router();
router.use(requireAuth);

const schema = z.object({
  token: z.string({ required_error: 'Token is required' }).min(1),
  platform: z.enum(['ios', 'android']).optional(),
});

// Register (or re-assign, if the phone changed hands) an Expo push token.
router.post('/', async (req, res) => {
  const body = parse(schema, req.body);
  if (!isValidToken(body.token)) throw new HttpError(400, 'ValidationError', 'Not a valid Expo push token');

  const { error } = await admin.from('device_tokens').upsert(
    { token: body.token, user_id: req.user.id, platform: body.platform ?? null },
    { onConflict: 'token' },
  );
  if (error) throw error;
  res.status(201).json({ message: 'Device registered' });
});

router.delete('/', async (req, res) => {
  const body = parse(schema.pick({ token: true }), req.body);
  const { error } = await admin.from('device_tokens').delete().eq('token', body.token).eq('user_id', req.user.id);
  if (error) throw error;
  res.json({ message: 'Device unregistered' });
});

module.exports = router;
