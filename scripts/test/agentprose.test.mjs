import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { AGENTPROSE_KEY, AGENTPROSE_SNIPPET } from '../content.mjs';

test('agentprose snippet is the registered Cloud snippet: evergreen 0.x channel, public key, deferred', () => {
  assert.match(AGENTPROSE_KEY, /^pk_[A-Za-z0-9_-]{8,}$/);
  assert.equal(
    AGENTPROSE_SNIPPET,
    `<script src="https://agentprose.cloud/v/0/agentprose.min.js" data-cloud="https://agentprose.cloud" data-key="${AGENTPROSE_KEY}" defer></script>`
  );
});

// Runs against the build output when it exists (CI builds before the e2e step; `npm run build` locally).
const dist = 'dist';
test('built pages load the snippet exactly once and ship an agentprose.json index', { skip: !fs.existsSync(`${dist}/agentprose.json`) && 'no dist/ build' }, () => {
  const htmlFiles = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = `${dir}/${e.name}`;
      if (e.isDirectory() && e.name !== 'assets' && e.name !== 'agentprose') walk(f);
      else if (e.name.endsWith('.html')) htmlFiles.push(f);
    }
  };
  walk(dist);
  assert.ok(htmlFiles.length > 20, `found ${htmlFiles.length} pages`);
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, 'utf8');
    assert.equal(html.split('agentprose.min.js').length - 1, 1, f);
    assert.ok(html.indexOf(AGENTPROSE_SNIPPET) < html.indexOf('</head>'), `${f}: snippet in <head>`);
  }
  const index = JSON.parse(fs.readFileSync(`${dist}/agentprose.json`, 'utf8'));
  assert.equal(index.version, 1);
  assert.equal(index.site.url, 'https://kakeklar.no/');
  const guides = fs.readdirSync('content/guider').filter((f) => f.endsWith('.md')).length;
  const recipes = fs.readdirSync('content/oppskrifter').filter((f) => f.endsWith('.md')).length;
  assert.equal(index.posts.length, guides + recipes, 'every guide and recipe is indexed');
  for (const p of index.posts) {
    assert.match(p.url, /^https:\/\/kakeklar\.no\/(guider|oppskrifter)\/[a-z0-9-]+$/);
    assert.ok(p.title && p.summary && p.published, p.url);
    assert.ok(p.markdown && p.markdown.length > 500, `${p.url}: full markdown inline`);
    assert.doesNotMatch(p.markdown, /adsbygoogle|calc-cta|author-box/, `${p.url}: no ads or page chrome`);
  }
});
