'use strict';

// Test harness: drives the REAL route handlers with an in-memory fake of Supabase,
// so route logic (validation, ownership, mapping, error codes) is testable offline.

const Module = require('node:module');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key-anon-key-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-service-key-service';
process.env.LOG_LEVEL = 'silent';

// ------------------------------------------------------------ in-memory database
const PK = { logs: ['cat_id', 'log_date'], cats: ['cat_id'], device_tokens: ['token'], diseases: ['disease_id'] };

function createDb() {
  const tables = { cats: [], logs: [], diseases: [], device_tokens: [] };

  class Query {
    constructor(table) { this.table = table; this.op = 'select'; this.filters = []; this.lim = null; this.orderBy = null; }
    select() { return this; }
    insert(row) { this.op = 'insert'; this.payload = row; return this; }
    upsert(row, opts = {}) { this.op = 'upsert'; this.payload = row; this.onConflict = opts.onConflict; return this; }
    update(patch) { this.op = 'update'; this.payload = patch; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
    in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this; }
    order(col, { ascending = true } = {}) { this.orderBy = { col, ascending }; return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }

    run() {
      const rows = tables[this.table];
      const match = (r) => this.filters.every((f) => f(r));
      const now = new Date().toISOString();
      let out;
      if (this.op === 'insert') {
        const row = { created_at: now, updated_at: now, ...this.payload };
        rows.push(row); out = [row];
      } else if (this.op === 'upsert') {
        const keys = PK[this.table];
        const existing = rows.find((r) => keys.every((k) => r[k] === this.payload[k]));
        if (existing) { Object.assign(existing, this.payload, { updated_at: now }); out = [existing]; }
        else { const row = { created_at: now, updated_at: now, ...this.payload }; rows.push(row); out = [row]; }
      } else if (this.op === 'update') {
        out = rows.filter(match); out.forEach((r) => Object.assign(r, this.payload, { updated_at: now }));
      } else if (this.op === 'delete') {
        out = rows.filter(match); tables[this.table] = rows.filter((r) => !match(r));
      } else {
        out = rows.filter(match);
        if (this.orderBy) {
          const { col, ascending } = this.orderBy;
          out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1));
        }
        if (this.lim) out = out.slice(0, this.lim);
      }
      if (this.mode === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } };
      if (this.mode === 'maybe') return { data: out[0] ?? null, error: null };
      return { data: out.map((r) => ({ ...r })), error: null };
    }
    then(resolve, reject) { try { resolve(this.run()); } catch (e) { reject(e); } }
  }

  return { tables, from: (t) => new Query(t) };
}

// ------------------------------------------------------------ module stubs
const db = createDb();
const authResponses = {}; // test sets e.g. authResponses.signInWithPassword = {data, error}
const fakeAuthClient = () => new Proxy({}, {
  get: (_t, group) => (group === 'auth'
    ? new Proxy({}, { get: (_x, fn) => async (...args) => (typeof authResponses[fn] === 'function' ? authResponses[fn](...args) : authResponses[fn] ?? { data: {}, error: null }) })
    : undefined),
});
const adminAuth = { getUser: async () => ({ data: { user: null }, error: { message: 'bad' } }), admin: { updateUserById: async () => ({ error: null }), deleteUser: async () => ({ error: null }) } };

const routeTable = new Map(); // module -> [{method, path, handler}]
function fakeExpress() {
  const Router = () => {
    const routes = [];
    const r = { use() {}, routes };
    for (const m of ['get', 'post', 'put', 'delete']) r[m] = (p, ...handlers) => routes.push({ method: m.toUpperCase(), path: p, handler: handlers[handlers.length - 1] });
    return r;
  };
  const express = () => ({});
  express.Router = Router;
  return express;
}

const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'express') return fakeExpress();
  if (request === 'pino') { const l = { info() {}, warn() {}, error() {}, fatal() {}, debug() {}, child() { return l; } }; return () => l; }
  if (/lib\/supabase$/.test(request)) return { admin: { from: db.from, auth: adminAuth, storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }), remove: async () => ({ error: null }), upload: async () => ({ error: null }) }) } }, authClient: fakeAuthClient };
  if (/middleware\/auth$/.test(request)) return { requireAuth: () => {}, forgetUser: () => {} };
  return realLoad.call(this, request, parent, isMain);
};

const { errorHandler } = require('../src/middleware/errorHandler');

function load(file) {
  const router = require(path.join('..', 'src', 'routes', file));
  return router.routes;
}

/** Invoke a route like Express would and return { status, body }. */
async function call(routes, method, urlPath, { body, params = {}, query = {}, user = { id: USER_A, email: 'a@example.com', name: 'A', metadata: {} } } = {}) {
  const route = routes.find((r) => r.method === method && r.path === urlPath);
  if (!route) throw new Error(`no route ${method} ${urlPath}`);
  const result = { status: 200, body: undefined };
  const res = { headersSent: false, status(c) { result.status = c; return this; }, json(b) { result.body = b; return this; }, set() { return this; } };
  const req = { body, params, query, user, headers: {}, log: { error() {} } };
  try { await route.handler(req, res); } catch (err) { errorHandler(err, req, res, () => { throw err; }); }
  return result;
}

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

module.exports = { db, authResponses, load, call, USER_A, USER_B };
