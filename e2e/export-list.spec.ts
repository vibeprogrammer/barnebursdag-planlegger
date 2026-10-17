import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { computePlan, type PlanResult } from '../src/lib/engine';
import { DEFAULT_CATALOG } from '../src/lib/catalog';
import { planToCsv, planToText } from '../src/lib/exportList';
import type { LineItem, PartyConfig } from '../src/lib/types';

const cfg: PartyConfig = {
  guests: 10, age: 6, adults: 0, type: 'hjemme', duration: 2,
  allergies: { melk: 1 }, mainDish: 'polser', breadRatio: 50
};
function planWith(item: Partial<LineItem>): PlanResult {
  return {
    groups: [{ category: 'mat', items: [{
      id: 'test', name: 'Testvare', category: 'mat', neededQty: 1.5, unit: 'stk', ...item
    }] }],
    itemCount: 1, priceMin: 0, priceMax: 0, hasPrice: false
  };
}

test('CSV neutralizes formula-leading catalog text before quoting but keeps numbers numeric', () => {
  for (const value of ['=1+1', '+SUM(1;2)', '-1+1', '@SUM(1)', ' \t=1+1', '\u0000=1+1', '\r=1+1', '\n+1', '\ttext']) {
    const csv = planToCsv(planWith({ name: value, unit: value, packUnit: value, note: value, packs: 3, priceMin: -10 }), {});
    const literal = "'" + value;
    const escaped = /[";\r\n]/.test(literal) ? `"${literal.replace(/"/g, '""')}"` : literal;
    expect(csv).toContain(`Mat;${escaped};1,5;${escaped};3;${escaped};-10;;;${escaped}\r\n`);
  }
  expect(planToCsv(planWith({ name: 'Kake; "stor"\r\nmed pynt' }), {}))
    .toContain('"Kake; ""stor""\r\nmed pynt"');
});

test('exports preserve allergy notes, check marks, BOM and whole-kroner prices', () => {
  const plan = computePlan(DEFAULT_CATALOG, cfg);
  const iceCake = plan.groups.flatMap((group) => group.items).find((item) => item.id === 'iskake');
  expect(iceCake?.note).toContain('melk');
  expect(planToText(plan, cfg, { iskake: true }, 'https://kakeklar.no/')).toContain(iceCake!.note!);
  const csv = planToCsv(plan, { iskake: true });
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv.split('\r\n')[0]).toContain(';Kjøpt;Merknad');
  expect(csv).toContain(`;ja;${iceCake!.note}\r\n`);
  const priced = planToCsv(planWith({ priceMin: 3 * 24.9, priceMax: 3 * 29.9 }), {});
  expect(priced).toContain(';75;90;;\r\n');
  expect(priced).not.toContain('74.699');
  expect(planToCsv(planWith({}), {})).toContain(';stk;;;;;;\r\n');
});

test('downloaded TXT, CSV and clipboard text preserve the visible allergy warning', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text: string) => { document.documentElement.dataset.copiedList = text; } }
    });
  });
  await page.goto('/?gjester=10&alder=6&allergi=melk:1');
  const warning = await page.locator('.row').filter({ hasText: 'Iskake' }).locator('.row-note').innerText();
  const note = warning.replace(/^⚠️\s*/, '');
  for (const format of ['txt', 'csv']) {
    const downloading = page.waitForEvent('download');
    await page.getByTestId(`export-${format}`).click();
    const download = await downloading;
    const filename = await download.path();
    if (!filename) throw new Error('Missing downloaded shopping list');
    expect(await readFile(filename, 'utf8')).toContain(note);
  }
  await page.getByTestId('export-copy').click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-list', new RegExp(note));
});

test('checklist toggles and reset work in memory when storage writes fail', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.addInitScript(() => {
    for (const method of ['setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        value: () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); }
      });
    }
  });
  await page.goto('/?gjester=10&alder=6');
  const first = page.locator('.row-check input').first();
  await first.check();
  await expect(first).toBeChecked();
  await expect(page.getByRole('alert')).toContainText('kunne ikke lagres');
  await page.getByTestId('export-reset').click();
  await expect(first).not.toBeChecked();
  await expect(page.getByRole('alert')).toContainText('Listen virker fortsatt her');
  expect(errors).toEqual([]);
});

test('every clickable checklist label has a minimum 40px touch target', async ({ page }) => {
  await page.goto('/?gjester=10&alder=6');
  const labels = page.locator('.row-check');
  expect(await labels.count()).toBeGreaterThan(10);
  for (const label of await labels.all()) {
    expect((await label.boundingBox())?.height).toBeGreaterThanOrEqual(40);
  }
});
