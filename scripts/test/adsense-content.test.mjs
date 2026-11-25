import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPages } from '../content.mjs';

const { bySlug } = loadPages();
const food = bySlug.get('hvor-mye-mat-til-barnebursdag');
const method = bySlug.get('slik-beregner-kakeklar');

test('food quantities are labeled as editable estimates with reproducible examples', () => {
  assert.equal(food.updated, '2026-11-25');
  assert.match(food.body, /prisindeksen for barnebursdag/);
  assert.match(food.body, /Kakeklars egne redigerbare planleggingsforslag/);
  assert.match(food.body, /ikke offisielle porsjons- eller ernæringsråd/);
  assert.match(food.body, /8 × 2 × 0,5 × 1,15 = 9,2/);
  assert.match(food.body, /30 × 0,5 × 1,15 = 17,25/);
  assert.match(food.body, /10 barn på 6 år/);
  assert.match(food.body, /600 g/);
  assert.doesNotMatch(food.body, /gutter og jenter|særlig gutter|barn spiser så lite/i);
});

test('calculation guide states the actual age bands, package rounding, and limits', () => {
  assert.equal(method.updated, '2026-11-16');
  assert.match(method.body, /til og med 4 år, 5–6 år og 7 år eller eldre/);
  assert.match(method.body, /15 prosent margin/);
  assert.match(method.body, /ikke offisielle porsjons- eller ernæringsråd/);
  assert.match(method.body, /festens varighet/);
});
