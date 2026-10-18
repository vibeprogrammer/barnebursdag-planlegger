import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');

function worker() {
  const handlers = new Map();
  const entries = new Map();
  const key = (request) => typeof request === 'string' ? request : request.url;
  const cache = {
    async addAll(assets) {
      for (const asset of assets) entries.set(asset, new Response('install-time shell'));
    },
    async put(request, response) { entries.set(key(request), response); }
  };
  let offline = false;
  let body = 'new deployment shell';
  vm.runInNewContext(source, {
    URL,
    Response,
    self: {
      location: { origin: 'https://kakeklar.no' },
      addEventListener: (event, handler) => handlers.set(event, handler),
      skipWaiting() {}
    },
    caches: {
      async open() { return cache; },
      async match(request) { return entries.get(key(request))?.clone(); }
    },
    async fetch() {
      if (offline) throw new TypeError('offline');
      return new Response(body);
    }
  });
  return {
    entries,
    setOffline() { offline = true; },
    setBody(text) { body = text; },
    async install() {
      let done;
      handlers.get('install')({ waitUntil: (promise) => { done = promise; } });
      await done;
    },
    navigate(path) {
      let response;
      handlers.get('fetch')({
        request: { url: new URL(path, 'https://kakeklar.no').href, mode: 'navigate', method: 'GET' },
        respondWith: (promise) => { response = promise; }
      });
      return response;
    },
    get(path) {
      let response;
      handlers.get('fetch')({
        request: { url: new URL(path, 'https://kakeklar.no').href, mode: 'cors', method: 'GET' },
        respondWith: (promise) => { response = promise; }
      });
      return response;
    }
  };
}

test('online home visits replace the install shell for every offline home alias', async () => {
  for (const onlinePath of ['/', '/?gjester=12', '/index.html']) {
    const sw = worker();
    await sw.install();
    assert.equal(await sw.entries.get('/').clone().text(), 'install-time shell');
    assert.equal(await (await sw.navigate(onlinePath)).text(), 'new deployment shell');
    sw.setOffline();
    for (const offlinePath of ['/', '/?gjester=8', '/index.html']) {
      assert.equal(await (await sw.navigate(offlinePath)).text(), 'new deployment shell');
    }
  }
});

test('guide navigation never overwrites the offline calculator shell', async () => {
  const sw = worker();
  await sw.install();
  await sw.navigate('/guider/barnehagebursdag');
  sw.setOffline();
  assert.equal(await (await sw.navigate('/')).text(), 'install-time shell');
  assert.equal(await (await sw.navigate('/guider/barnehagebursdag')).text(), 'new deployment shell');
});

test('API and third-party requests bypass the service worker', () => {
  const sw = worker();
  assert.equal(sw.navigate('/api/health'), undefined);
  assert.equal(sw.navigate('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), undefined);
});

test('the AI-agent index is fetched fresh while online and served from cache only offline', async () => {
  const sw = worker();
  await sw.install();
  sw.setBody('{"posts":["v1"]}');
  assert.equal(await (await sw.get('/agentprose.json')).text(), '{"posts":["v1"]}');
  sw.setBody('{"posts":["v2"]}');
  assert.equal(await (await sw.get('/agentprose.json')).text(), '{"posts":["v2"]}', 'a new deploy is not hidden behind the cache');
  sw.setOffline();
  assert.equal(await (await sw.get('/agentprose.json')).text(), '{"posts":["v2"]}');
});
