// Shared in-memory state used by both the Supabase stub (test/stubs/supabase.js) and the tests.
// ------------------------------------------------------------ in-memory database
const PK = { logs: ['cat_id', 'log_date'], cats: ['cat_id'], cat_photos: ['photo_id'], device_tokens: ['token'], notification_settings: ['user_id'], ask_threads: ['thread_id'], ask_messages: ['message_id'] };

// Not-null columns with defaults, checked when a row explicitly carries null.
const NOT_NULL = { ask_messages: ['emergency'] };

function createDb() {
  const tables = { cats: [], cat_photos: [], logs: [], device_tokens: [], notification_settings: [], ask_threads: [], ask_messages: [] };

  class Query {
    constructor(table) { this.table = table; this.op = 'select'; this.filters = []; this.lim = null; this.orders = []; this.rng = null; this.wantCount = false; }
    select(_cols, opts = {}) { if (opts.count) this.wantCount = true; return this; }
    insert(row) { this.op = 'insert'; this.payload = row; return this; }
    upsert(row, opts = {}) { this.op = 'upsert'; this.payload = row; this.onConflict = opts.onConflict; return this; }
    update(patch) { this.op = 'update'; this.payload = patch; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
    in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this; }
    is(col, val) { this.filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return this; }
    not(col, op, val) { if (op !== 'is') throw new Error('fake: only not(col, "is", …)'); this.filters.push((r) => (val === null ? r[col] != null : r[col] !== val)); return this; }
    gte(col, val) { this.filters.push((r) => r[col] >= val); return this; }
    lte(col, val) { this.filters.push((r) => r[col] <= val); return this; }
    range(from, to) { this.rng = [from, to]; return this; }
    order(col, { ascending = true } = {}) { this.orders.push({ col, ascending }); return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }

    run() {
      const rows = tables[this.table];
      const match = (r) => this.filters.every((f) => f(r));
      const now = new Date().toISOString();
      let out;
      if (this.op === 'insert') {
        const payload = Array.isArray(this.payload) ? this.payload : [this.payload];
        // Like PostgREST: in a multi-row insert, a column missing from one row is sent as null.
        const cols = [...new Set(payload.flatMap((p) => Object.keys(p)))];
        const filled = payload.length > 1 ? payload.map((p) => Object.fromEntries(cols.map((c) => [c, p[c] ?? null]))) : payload;
        for (const p of filled) {
          for (const c of NOT_NULL[this.table] ?? []) {
            if (c in p && p[c] === null) throw Object.assign(new Error(`null value in column "${c}" violates not-null constraint`), { code: '23502' });
          }
        }
        out = filled.map((p) => ({ created_at: now, updated_at: now, ...p }));
        rows.push(...out);
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
        if (this.orders.length) {
          out = [...out].sort((a, b) => {
            for (const { col, ascending } of this.orders) {
              const c = (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1);
              if (c) return c;
            }
            return 0;
          });
        }
        this.total = out.length;
        if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
        if (this.lim) out = out.slice(0, this.lim);
      }
      if (this.mode === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } };
      if (this.mode === 'maybe') return { data: out[0] ?? null, error: null };
      return { data: out.map((r) => ({ ...r })), error: null, ...(this.wantCount ? { count: this.total ?? out.length } : {}) };
    }
    then(resolve, reject) { try { resolve(this.run()); } catch (e) { reject(e); } }
  }

  // Postgres functions the API calls through admin.rpc(), re-implemented over the in-memory tables.
  const rpcs = {
    recent_logs_per_cat({ p_user_id: userId, p_limit: limit }) {
      const active = tables.cats.filter((c) => c.user_id === userId && c.archived_at == null);
      return active.flatMap((c) => tables.logs
        .filter((l) => l.cat_id === c.cat_id)
        .sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
        .slice(0, limit));
    },
    cats_missing_log_for({ day, user_ids: userIds }) {
      const active = tables.cats.filter((c) => c.archived_at == null && userIds.includes(c.user_id));
      const total = (uid) => active.filter((c) => c.user_id === uid).length;
      const finished = (c) => tables.logs.some((l) => l.cat_id === c.cat_id && l.log_date === day && l.food_amount != null && l.water_amount != null);
      return active.filter((c) => !finished(c)).map((c) => ({ user_id: c.user_id, cat_id: c.cat_id, name: c.name, total_cats: total(c.user_id) }));
    },
  };
  // Tests add a name to `missingRpcs` to simulate a migration that hasn't been run (PostgREST PGRST202).
  const missingRpcs = new Set();
  const rpc = async (fn, args) => {
    if (missingRpcs.has(fn) || !rpcs[fn]) return { data: null, error: { code: 'PGRST202', message: `fake: no rpc ${fn}` } };
    return { data: rpcs[fn](args), error: null };
  };

  return { tables, from: (t) => new Query(t), rpc, missingRpcs };
}

export const db = createDb();
export const authResponses = {}; // test sets e.g. authResponses.signInWithPassword = {data, error}
export const storageCalls = { uploaded: [], removed: [], signed: [] };
