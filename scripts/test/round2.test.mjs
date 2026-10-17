import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPages, renderBody, hubPages, metaHtml, jsonLd, AUTHOR } from '../content.mjs';

const { pages, bySlug } = loadPages();

test('every guide and recipe gets a calculator box and an author box', () => {
  for (const p of pages.filter((x) => x.section === 'guider' || x.section === 'oppskrifter')) {
    const html = renderBody(p, bySlug);
    if (p.slug !== 'slik-beregner-kakeklar') assert.match(html, /class="calc-cta"/, p.slug);
    assert.match(html, /class="author-box"/, p.slug);
  }
});

test('drink calculator box only promises supported calculations', () => {
  const html = renderBody(bySlug.get('hvor-mye-drikke-til-barnebursdag'), bySlug);
  const box = html.match(/<aside class="calc-cta"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(box);
  assert.match(box, /saft og brus/);
  assert.match(box, /Vann og kaffe planlegger du selv/);
  assert.doesNotMatch(box, /hvor lenge|varighet/);
});

test('meta line shows «Sist oppdatert» with a machine-readable date and an author link', () => {
  const p = bySlug.get('hvor-mye-mat-til-barnebursdag');
  const html = metaHtml(p);
  assert.match(html, /Sist oppdatert <time datetime="\d{4}-\d{2}-\d{2}">/);
  assert.match(html, new RegExp(`href="${AUTHOR.path}" rel="author"`));
});

test('editor notes in markdown never reach the rendered page', () => {
  const author = bySlug.get('om-forfatteren');
  assert.ok(author, 'author page exists');
  assert.doesNotMatch(renderBody(author, bySlug), /TODO|<!--/);
});

test('article JSON-LD names the author with a profile URL; recipes carry their own image', () => {
  const ld = jsonLd(bySlug.get('bursdagsmuffins'), bySlug)['@graph'].find((n) => n['@type'] === 'Recipe');
  assert.equal(ld.author.url, AUTHOR.url);
  assert.deepEqual(ld.image, ['https://kakeklar.no/img/oppskrifter/bursdagsmuffins.png']);
  for (const p of pages.filter((x) => x.image)) {
    assert.ok(fs.existsSync(`public${p.image.src}`), p.image.src);
    assert.ok(fs.existsSync(`public${p.image.png}`), p.image.png);
  }
});

test('hubs list every guide/recipe with category chips', () => {
  const [guider, oppskrifter] = hubPages(pages);
  for (const p of pages.filter((x) => x.section === 'guider')) assert.ok(guider.html.includes(`href="${p.path}"`), p.path);
  for (const p of pages.filter((x) => x.section === 'oppskrifter')) assert.ok(oppskrifter.html.includes(`href="${p.path}"`), p.path);
  assert.match(guider.html, /class="hub-chips"/);
});

test('affiliate config: every link is empty (disabled) or https, and has a label', () => {
  const cfg = JSON.parse(fs.readFileSync('content/affiliates.json', 'utf8'));
  assert.ok(cfg.disclosure.length > 40);
  const all = [...Object.values(cfg.guides).flat(), ...Object.values(cfg.calculator).flat()];
  for (const l of all) {
    assert.ok(l.label);
    assert.ok(l.url === '' || l.url.startsWith('https://'), l.url);
  }
  for (const slug of Object.keys(cfg.guides)) assert.ok(bySlug.has(slug), `affiliate slot for unknown guide ${slug}`);
});
