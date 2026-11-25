import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPages, renderBody } from '../content.mjs';

const { byPath, bySlug } = loadPages();
const contact = byPath.get('/kontakt');

test('contact HTML resolves the configured address in the shared renderer', () => {
  const html = renderBody(contact, bySlug, ' hello@example.org ');
  assert.match(html, /href="mailto:hello&#64;example\.org">hello&#64;example\.org<\/a>/);
  assert.match(html, /Jeg svarer normalt innen noen dager/);
  assert.doesNotMatch(html, /\{\{contact_email\}\}|<p>\s*<p>|\b[Vv]i\b/);
});

test('contact HTML escapes configured values', () => {
  const html = renderBody(contact, bySlug, 'hello+"><&@example.org');
  assert.match(html, /href="mailto:hello\+&quot;&gt;&lt;&amp;&#64;example\.org"/);
  assert.doesNotMatch(html, /href="mailto:hello\+">/);
});

test('contact HTML shows the published address when no env address is set', () => {
  const previous = process.env.VITE_CONTACT_EMAIL;
  delete process.env.VITE_CONTACT_EMAIL;
  try {
    for (const email of [undefined, '', '   ']) {
      const html = email === undefined ? renderBody(contact, bySlug) : renderBody(contact, bySlug, email);
      assert.match(html, /href="mailto:salnikov&#64;gmail\.com">salnikov&#64;gmail\.com<\/a>/);
      assert.match(html, /Send en e-post til/);
      assert.doesNotMatch(html, /\{\{contact_email\}\}|<p>\s*<p>|\b[Vv]i\b|TODO/);
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_CONTACT_EMAIL;
    else process.env.VITE_CONTACT_EMAIL = previous;
  }
});

test('candy pricing converts grams to kilograms', () => {
  const html = renderBody(byPath.get('/guider/godteposer-til-barnebursdag'), bySlug);
  assert.match(html, /100 \/ 1 000 × 150/);
  assert.match(html, /15 kroner/);
});
