'use strict';

// One-off / repeatable: loads data/diseaseData.js (your original seed data) into Postgres.
// Safe to re-run — rows are upserted by name, so nothing duplicates (the old Lambda created
// fresh UUIDs and duplicated everything on each call).
//
//   npm run seed:diseases          (reads .env; or set SUPABASE_* in your shell)

const { admin } = require('../src/lib/supabase');
const { diseases } = require('../data/diseaseData');

async function main() {
  const rows = diseases.map((d) => ({
    name: d.name,
    category: d.category,
    symptoms: d.symptoms,
    description: d.description,
    prevention: d.prevention,
    severity: d.severity,
  }));

  const { error, count } = await admin.from('diseases').upsert(rows, { onConflict: 'name', count: 'exact' });
  if (error) throw error;
  // eslint-disable-next-line no-console
  console.log(`Seeded ${count ?? rows.length} diseases.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding failed:', err.message || err);
  process.exit(1);
});
