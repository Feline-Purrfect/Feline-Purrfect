// Shared in-memory state used by both the Supabase stub (test/stubs/supabase.js) and the tests.
// ------------------------------------------------------------ in-memory database
const PK = { logs: ['cat_id', 'log_date'], cats: ['cat_id'], cat_photos: ['photo_id'], device_tokens: ['token'], diseases: ['disease_id'] };

function createDb() {
  const tables = { cats: [], cat_photos: [], logs: [], diseases: [], device_tokens: [] };

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

  return { tables, from: (t) => new Query(t) };
}

export const db = createDb();
export const authResponses = {}; // test sets e.g. authResponses.signInWithPassword = {data, error}
export const storageCalls = { uploaded: [], removed: [] };
