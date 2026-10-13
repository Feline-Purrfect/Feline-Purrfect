// Shared in-memory state used by both the Supabase stub (test/stubs/supabase.js) and the tests.
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

export const db = createDb();
export const authResponses = {}; // test sets e.g. authResponses.signInWithPassword = {data, error}
