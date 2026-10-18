import { readFileSync } from 'node:fs';
import express from 'express';
import config from '../config.js';

// Public Terms of Use and Privacy Policy. The app opens these pages, and the App Store and
// Google Play listings link to them (both stores require a privacy policy URL).
// The text lives in backend/legal/*.html; {{OPERATOR}} and {{CONTACT_EMAIL}} come from the env.

const router = express.Router();

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const read = (name) => readFileSync(new URL(`../../legal/${name}.html`, import.meta.url), 'utf8');

const PAGES = {
  terms: { title: 'Terms of Use', body: read('terms') },
  privacy: { title: 'Privacy Policy', body: read('privacy') },
};

const STYLE = `
  :root { color-scheme: light; --canvas: #F6F4F0; --surface: #FFFFFF; --ink: #1D1C1A; --soft: #4A463F;
          --muted: #77726A; --line: #E7E2D9; --primary: #2F6FDB; --tint: #E8F0FC; }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--canvas); color: var(--ink);
         font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 720px; margin: 0 auto;
         padding: calc(env(safe-area-inset-top, 0px) + 28px) 20px calc(env(safe-area-inset-bottom, 0px) + 48px); }
  h1 { font-size: 30px; line-height: 1.2; margin: 0 0 4px; letter-spacing: -0.01em; }
  h2 { font-size: 19px; line-height: 1.3; margin: 32px 0 8px; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  p, li { color: var(--soft); }
  ul { padding-left: 22px; margin: 8px 0; }
  li { margin: 6px 0; }
  strong { color: var(--ink); }
  a { color: var(--primary); }
  .updated { color: var(--muted); font-size: 14px; margin: 0 0 20px; }
  .summary { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 4px 18px 10px; margin: 20px 0 8px; }
  .summary h2 { margin-top: 14px; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 14px; }
`;

/** The full HTML page for 'terms' or 'privacy', with the operator name and contact email filled in. */
export function renderLegal(name) {
  const page = PAGES[name];
  if (!page) return null;
  const email = config.legal.contactEmail || '[contact email]';
  const body = page.body
    .replaceAll('{{OPERATOR}}', escapeHtml(config.legal.operator))
    .replaceAll('{{CONTACT_EMAIL}}', escapeHtml(email));
  const other = name === 'terms'
    ? '<a href="/legal/privacy">Privacy Policy</a>'
    : '<a href="/legal/terms">Terms of Use</a>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${page.title} · Feline Purrfect</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<footer>Feline Purrfect · ${other}</footer>
</main>
</body>
</html>`;
}

for (const name of Object.keys(PAGES)) {
  router.get(`/legal/${name}`, (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('html').send(renderLegal(name));
  });
}

export default router;
