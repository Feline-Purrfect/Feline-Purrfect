import { admin } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';

// In-memory cache so the app's requests cost one Supabase Auth round-trip per token every few
// minutes, not one each. Sign-out, account deletion and profile/consent changes call forgetUser(),
// so the TTL only bounds how long a token revoked some other way (e.g. from the Supabase dashboard)
// keeps working.
const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 2000;
const cache = new Map();

/** The token's own expiry (ms), read from its payload. Only called after Supabase validated it. */
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : Infinity;
  } catch {
    return Infinity;
  }
}

function remember(token, user) {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  // Never trust a cached token past its own expiry.
  cache.set(token, { user, expires: Math.min(Date.now() + TTL_MS, tokenExpiry(token)) });
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

export { requireAuth, forgetUser };
