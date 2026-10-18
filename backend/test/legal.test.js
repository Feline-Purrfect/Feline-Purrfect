import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLegal } from '../src/routes/legal.js';

for (const name of ['terms', 'privacy']) {
  test(`legal: ${name} renders a complete page with every placeholder filled`, () => {
    const html = renderLegal(name);
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<meta name="viewport"/);
    assert.ok(!html.includes('{{'), 'no unreplaced placeholders');
    assert.match(html, /Last updated:/);
  });
}

test('legal: the two documents link to each other, and unknown pages render nothing', () => {
  assert.match(renderLegal('terms'), /href="\/legal\/privacy"/);
  assert.match(renderLegal('privacy'), /href="\/legal\/terms"/);
  assert.equal(renderLegal('cookies'), null);
});

test('legal: the privacy policy names every service that receives user data', () => {
  const html = renderLegal('privacy');
  for (const provider of ['Supabase', 'Render', 'Anthropic', 'Sentry', 'Expo']) assert.match(html, new RegExp(provider));
});
