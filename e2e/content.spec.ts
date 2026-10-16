import { expect, test } from '@playwright/test';

const redirects = [
  ['/barnehagebursdag', '/guider/barnehagebursdag'],
  ['/allergier-i-barnebursdag', '/guider/allergier-i-barnebursdag'],
  ['/slik-beregner-kakeklar', '/guider/slik-beregner-kakeklar']
];

test('legacy guide links redirect permanently before static serving', async ({ request }) => {
  for (const [from, to] of redirects) {
    for (const suffix of ['', '/']) {
      const response = await request.get(from + suffix, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe(to);
    }
    expect((await request.get(to)).status()).toBe(200);
  }
});

test('content is crawlable with unique metadata and real not-found responses', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of ['/guider/barnehagebursdag', '/oppskrifter/sjokoladekake-i-langpanne', '/kontakt']) {
    const response = await page.goto(`http://localhost:8080${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://kakeklar.no${path}`);
    expect(await page.title()).not.toBe('Kakeklar');
  }
  const missing = await request.get('/en-side-som-ikke-finnes');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Fant ikke siden');
  const sitemap = await request.get('/sitemap.xml');
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(29);
  await context.close();
});

test('main navigation and breadcrumbs have 40px touch targets', async ({ page }) => {
  await page.goto('/guider/barnehagebursdag');
  const links = page.locator('.site-nav a, .breadcrumbs a');
  expect(await links.count()).toBeGreaterThan(3);
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );
});

test('static and React contact pages contain resolved contact information', async ({ page, request }) => {
  const response = await request.get('/content.json');
  const pages: { path: string; html: string }[] = await response.json();
  const contact = pages.find((entry) => entry.path === '/kontakt');
  if (!contact) throw new Error('Built content is missing /kontakt');
  expect(contact.html).not.toContain('{{contact_email}}');

  await page.goto('/kontakt');
  await expect(page.locator('.content-body')).not.toContainText('{{contact_email}}');
  await expect(page.locator('.content-body a').first()).toBeVisible();

  const shell = await (await request.get('/')).text();
  await page.route('**/kontakt', (route) => route.fulfill({ contentType: 'text/html', body: shell }));
  await page.goto('/kontakt');
  await expect(page.locator('.content-body > div')).toHaveJSProperty('innerHTML', contact.html);
});

test('offline home aliases use the shell refreshed by an online visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
    const names = await caches.keys();
    const name = names.find((entry) => entry.startsWith('bursdag-'));
    if (!name) throw new Error('Service worker did not create its cache');
    const cache = await caches.open(name);
    await cache.put('/', new Response('<title>Stale install shell</title>', { headers: { 'Content-Type': 'text/html' } }));
  });
  await page.goto('/?gjester=12');
  await expect(page).toHaveTitle(/Kakeklar/);
  await context.setOffline(true);
  for (const path of ['/', '/?gjester=8', '/index.html']) {
    await page.goto(path);
    await expect(page).toHaveTitle(/Kakeklar/);
    await expect(page.getByTestId('wizard').or(page.getByTestId('app'))).toBeVisible();
  }
});
