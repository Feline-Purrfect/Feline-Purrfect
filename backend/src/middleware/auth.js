'use strict';

const { admin } = require('../lib/supabase');
const { HttpError } = require('../lib/errors');

// Tiny in-memory cache so a burst of parallel app requests costs one Supabase round-trip,
// not one each. Short TTL keeps revoked/deleted users from lingering.
const TTL_MS = 30_000;
const MAX_ENTRIES = 2000;
const cache = new Map();

function remember(token, user) {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(token, { user, expires: Date.now() + TTL_MS });
}

function forgetUser(userId) {
  for (const [token, entry] of cache) if (entry.user.id === userId) cache.delete(token);
}

/**
 * Accepts the Supabase access token as `Authorization: Bearer <jwt>`.
 * (The old app sent either the Cognito ID token or access token depending on the screen;
 * the login route now returns the same JWT in both fields so both keep working.)
 */
async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Unauthorized', 'Missing bearer token');

  const hit = cache.get(token);
  if (hit && hit.expires > Date.now()) {
    req.user = hit.user;
    return next();
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Unauthorized', 'Invalid or expired token');

  const u = data.user;
  const user = {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name ?? '',
    metadata: u.user_metadata ?? {},
  };
  remember(token, user);
  req.user = user;
  next();
}

module.exports = { requireAuth, forgetUser };
