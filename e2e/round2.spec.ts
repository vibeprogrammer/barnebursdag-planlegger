import { expect, test } from '@playwright/test';

test('articles carry a dated byline linked to the author page and a calculator box', async ({ page }) => {
  await page.goto('/guider/hvor-mye-mat-til-barnebursdag');
  await expect(page.locator('.content-meta time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
  await expect(page.locator('.content-meta')).toContainText('Sist oppdatert');
  await expect(page.locator('.content-byline a[rel="author"]')).toHaveAttribute('href', '/om-forfatteren');
  await expect(page.locator('.calc-cta a')).toHaveAttribute('href', /^\//);
  await expect(page.locator('.author-box a[href="/om-forfatteren"]').first()).toBeVisible();
});

test('author page is a ProfilePage and leaks no editor notes', async ({ page, request }) => {
  const res = await request.get('/om-forfatteren');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('"@type":"ProfilePage"');
  expect(html).not.toContain('TODO');
  await page.goto('/om-forfatteren');
  await expect(page.locator('h1')).toContainText('Maxim Salnikov');
});

test('ad slots use an AdSense-approved Norwegian label and stay off trust pages, hubs and the calculator', async ({ request }) => {
  const guide = await (await request.get('/guider/hvor-mye-mat-til-barnebursdag')).text();
  expect(guide).toContain('<p class="ad-label">Annonser</p>');
  expect(guide).toContain('adsbygoogle.js');
  for (const path of ['/', '/om-kakeklar', '/om-forfatteren', '/personvern', '/vilkar', '/kontakt', '/guider', '/oppskrifter']) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain('adsbygoogle.js');
    expect(html, path).not.toContain('ad-slot');
    expect(html, path).toContain('google-adsense-account');
  }
});

test('affiliate links are off by default', async ({ request }) => {
  const html = await (await request.get('/guider/godteposer-til-barnebursdag')).text();
  expect(html).not.toContain('affiliate-box');
  expect(html).not.toContain('Annonselenke');
});

test('recipe pages show an illustration with fixed dimensions and hubs link categories', async ({ page }) => {
  await page.goto('/oppskrifter/bursdagsmuffins');
  const img = page.locator('.content-figure img');
  await expect(img).toHaveAttribute('width', '1200');
  await expect(img).toHaveAttribute('height', '800');
  await page.goto('/guider');
  expect(await page.locator('.hub-chips a').count()).toBeGreaterThan(4);
  await page.goto('/oppskrifter');
  expect(await page.locator('.content-link--img').count()).toBeGreaterThanOrEqual(4);
});

test('shopping list can be ticked off, survives a reload and exports', async ({ page }) => {
  await page.goto('/?gjester=10&alder=6');
  await expect(page.getByTestId('method-note')).toContainText('rundes opp til hele pakker');
  const first = page.locator('.row-check input').first();
  await first.check();
  await page.reload();
  await expect(page.locator('.row-check input').first()).toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByTestId('export-csv').click();
  expect((await download).suggestedFilename()).toBe('kakeklar-handleliste-10-gjester-6-ar.csv');
  await page.getByTestId('export-reset').click();
  await expect(page.locator('.row-check input:checked')).toHaveCount(0);
});
