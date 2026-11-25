import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { jsonLd, loadPages } from '../content.mjs';
import { loadPrisindeks, prisindeksTeaserHtml } from '../prisindeks.mjs';

const data = loadPrisindeks();
const { bySlug } = loadPages();
const guide = bySlug.get('prisindeks-bursdagskurv');

test('the current price index has one cheapest store, a CSV, and totals that match the article', () => {
  assert.ok(guide.updated >= data.collected, `${guide.updated} is before ${data.collected}`);
  assert.equal(guide.path, data.guide);
  assert.match(guide.body, new RegExp(data.csv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const store of data.stores) {
    assert.ok(guide.body.includes(store.total), store.total);
    assert.ok(guide.body.includes(store.name), store.name);
  }
  const csv = fs.readFileSync(`public${data.csv}`, 'utf8');
  assert.match(csv, /^gruppe,vare_id,/);
  assert.match(csv, /REMA 1000/);
});

test('the teaser and Dataset use the same current month', () => {
  const html = prisindeksTeaserHtml(data);
  assert.match(html, new RegExp(data.title));
  assert.match(html, /679,50 kr/);
  assert.match(html, /href="\/guider\/prisindeks-bursdagskurv"/);
  assert.match(html, /Billigst/);
  const dataset = jsonLd(guide, new Map())['@graph'].find((node) => node['@type'] === 'Dataset');
  assert.equal(dataset.distribution.contentUrl, `https://kakeklar.no${data.csv}`);
  assert.equal(dataset.datePublished, data.collected);
  assert.match(dataset.description, /679,50 kr/);
});
