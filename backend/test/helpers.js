// Test harness: drives the REAL route handlers with an in-memory fake of Supabase,
// so route logic (validation, ownership, mapping, error codes) is testable offline.
// Module redirection happens in test/hooks.js (registered by test/setup.js).
import { errorHandler } from '../src/middleware/errorHandler.js';
import { db, authResponses } from './fakes.js';

export { db, authResponses };

export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';

export async function load(file) {
  const { default: router } = await import(`../src/routes/${file}`);
  return router.routes;
}

/** Invoke a route like Express would and return { status, body }. */
export async function call(routes, method, urlPath, { body, params = {}, query = {}, user = { id: USER_A, email: 'a@example.com', name: 'A', metadata: {} } } = {}) {
  const route = routes.find((r) => r.method === method && r.path === urlPath);
  if (!route) throw new Error(`no route ${method} ${urlPath}`);
  const result = { status: 200, body: undefined };
  const res = { headersSent: false, status(c) { result.status = c; return this; }, json(b) { result.body = b; return this; }, set() { return this; } };
  const req = { body, params, query, user, headers: {}, log: { error() {} } };
  try { await route.handler(req, res); } catch (err) { errorHandler(err, req, res, () => { throw err; }); }
  return result;
}
