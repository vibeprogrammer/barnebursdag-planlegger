import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPages, SITE } from '../content.mjs';
import { REDIRECTS, canonicalLocation, isNonCanonicalProductionHost, staticWebAppConfig } from '../content-routes.mjs';

test('trailing slashes and legacy paths redirect once, without touching the canonical host', () => {
  assert.equal(canonicalLocation({ hostname: 'localhost', pathname: '/kontakt' }), null);
  assert.equal(canonicalLocation({ hostname: 'localhost', pathname: '/' }), null);
  assert.equal(canonicalLocation({ hostname: 'kakeklar.no', pathname: '/kontakt/' }), '/kontakt');
  assert.equal(canonicalLocation({ hostname: 'localhost', pathname: '/kontakt///', search: '?a=1' }), '/kontakt?a=1');
  assert.equal(canonicalLocation({ hostname: 'localhost', pathname: '/guider/' }), '/guider');
  assert.equal(canonicalLocation({ hostname: '127.0.0.1', pathname: '/ads.txt/' }), '/ads.txt');
  for (const [from, to] of Object.entries(REDIRECTS)) {
    assert.equal(canonicalLocation({ hostname: 'localhost', pathname: from }), to);
    assert.equal(canonicalLocation({ hostname: 'localhost', pathname: from + '/' }), to);
  }
});

test('known non-canonical production hosts redirect to the apex, including the path fix', () => {
  const hosts = [
    'www.kakeklar.no',
    'jolly-cliff-01972b603.7.azurestaticapps.net',
    'example.azurestaticwebsites.net',
    'kakeklar.northeurope.azurecontainerapps.io',
    'kakeklar.push.foo',
    'www.kakeklar.push.foo'
  ];
  for (const host of hosts) {
    assert.equal(isNonCanonicalProductionHost(host), true, host);
    assert.equal(canonicalLocation({ hostname: host, pathname: '/kontakt/' }), `${SITE}/kontakt`);
    assert.equal(canonicalLocation({ hostname: host, pathname: '/' }), `${SITE}/`);
    assert.equal(
      canonicalLocation({ hostname: host, pathname: '/barnehagebursdag/', search: 'x=1' }),
      `${SITE}/guider/barnehagebursdag?x=1`
    );
  }
  for (const host of ['kakeklar.no', 'localhost', '127.0.0.1', '0.0.0.0', '[::1]', '']) {
    assert.equal(isNonCanonicalProductionHost(host), false, host);
  }
});

test('Static Web Apps config 301s legacy URLs and does not rewrite slash-insensitive page routes', () => {
  const { pages } = loadPages();
  const cfg = staticWebAppConfig({
    routes: [{ route: '/sw.js', headers: { 'Cache-Control': 'no-cache' } }],
    navigationFallback: { rewrite: '/index.html' },
    globalHeaders: { 'X-Content-Type-Options': 'nosniff' }
  });
  assert.equal(cfg.trailingSlash, 'never');
  assert.equal(cfg.navigationFallback, undefined);
  assert.equal(cfg.responseOverrides[404].rewrite, '/404.html');
  assert.equal(cfg.responseOverrides[404].statusCode, 404);
  assert.equal(cfg.globalHeaders['X-Content-Type-Options'], 'nosniff');
  assert.ok(cfg.routes.some((r) => r.route === '/sw.js' && !r.rewrite));
  assert.ok(cfg.routes.every((r) => !r.rewrite));
  const routed = new Set(cfg.routes.map((r) => r.route));
  for (const page of pages) assert.equal(routed.has(page.path), false, page.path);
  for (const hub of ['/guider', '/oppskrifter']) assert.equal(routed.has(hub), false);
  for (const [from, to] of Object.entries(REDIRECTS)) {
    const rule = cfg.routes.find((r) => r.route === from);
    assert.equal(rule.redirect, to);
    assert.equal(rule.statusCode, 301);
  }
});
