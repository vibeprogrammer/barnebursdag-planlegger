import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPages, renderBody } from '../content.mjs';

const { byPath, bySlug } = loadPages();
const contact = byPath.get('/kontakt');

test('contact HTML resolves the configured address in the shared renderer', () => {
  const html = renderBody(contact, bySlug, ' hello@example.org ');
  assert.match(html, /href="mailto:hello@example.org">hello@example.org<\/a>/);
  assert.doesNotMatch(html, /\{\{contact_email\}\}|<p>\s*<p>/);
});

test('contact HTML escapes configured values', () => {
  const html = renderBody(contact, bySlug, 'hello+"><&@example.org');
  assert.match(html, /href="mailto:hello\+&quot;&gt;&lt;&amp;@example.org"/);
  assert.doesNotMatch(html, /href="mailto:hello\+">/);
});

test('contact HTML has usable fallback links without an address', () => {
  for (const email of ['', '   ']) {
    const html = renderBody(contact, bySlug, email);
    assert.match(html, /Den raskeste veien er <a href="https:\/\/github.com\/webmaxru\/barnebursdag-planlegger\/issues">GitHub Issues<\/a>/);
    assert.doesNotMatch(html, /\{\{contact_email\}\}|mailto:|<p>\s*<p>/);
  }
});

test('candy pricing converts grams to kilograms', () => {
  const html = renderBody(byPath.get('/guider/godteposer-til-barnebursdag'), bySlug);
  assert.match(html, /100 \/ 1 000 × 150/);
  assert.match(html, /15 kroner/);
});
