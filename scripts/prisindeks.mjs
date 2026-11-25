// Current month of the party-basket price index. The guide prose is written by hand;
// this file drives the homepage teaser, the calculator note and the Dataset JSON-LD.
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('content/prisindeks/latest.json');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function loadPrisindeks() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!data.guide?.startsWith('/guider/') || !data.csv?.startsWith('/prisindeks/') || !data.csv.endsWith('.csv')) {
    throw new Error('content/prisindeks/latest.json needs a /guider/ path and a /prisindeks/*.csv file');
  }
  if (!Array.isArray(data.stores) || data.stores.length < 2) throw new Error('content/prisindeks/latest.json needs at least two stores');
  if (data.stores.filter((s) => s.cheapest).length !== 1) throw new Error('content/prisindeks/latest.json must mark exactly one store as cheapest');
  for (const store of data.stores) {
    if (!store.name || !store.total || !store.perChild) throw new Error(`Store ${store.name || '(unnamed)'} is missing total or perChild`);
  }
  const csvFile = path.resolve('public' + data.csv);
  const publicRoot = path.resolve('public');
  if (!csvFile.startsWith(publicRoot + path.sep) || !fs.existsSync(csvFile)) {
    throw new Error(`Price index CSV is missing: public${data.csv}`);
  }
  return data;
}

/** Homepage teaser. Numbers come from latest.json so a new month does not require an HTML edit. */
export function prisindeksTeaserHtml(data = loadPrisindeks()) {
  const rows = data.stores.map((store) => `<li${store.cheapest ? ' class="is-cheapest"' : ''}>
        <span class="pi-store">${esc(store.name)}${store.cheapest ? '<em>Billigst</em>' : ''}</span>
        <strong>${esc(store.total)} kr</strong>
        <small>${esc(store.perChild)}</small>
      </li>`).join('');
  return `<aside class="prisindeks-teaser" aria-labelledby="prisindeks-teaser-title">
      <p class="pi-kicker">Ny</p>
      <h2 id="prisindeks-teaser-title">${esc(data.title)}</h2>
      <p>${esc(data.lead)}</p>
      <ol class="pi-prices">${rows}</ol>
      <a class="pi-link" href="${esc(data.guide)}">Se hva som ligger i kurven</a>
    </aside>`;
}

export function prisindeksDataset(data, site) {
  const cheapest = data.stores.find((store) => store.cheapest);
  const url = site + data.guide;
  return {
    '@type': 'Dataset',
    '@id': url + '#dataset',
    name: `Prisindeks for barnebursdag, ${data.periodLabel}`,
    description: `${data.lead} ${cheapest.name}: ${cheapest.total} kr.`,
    url,
    inLanguage: 'nb',
    creator: { '@id': 'https://kakeklar.no/om-utvikleren#person' },
    datePublished: data.collected,
    dateModified: data.collected,
    temporalCoverage: data.collected,
    spatialCoverage: { '@type': 'Country', name: 'Norge' },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/csv',
      contentUrl: site + data.csv
    },
    isPartOf: { '@type': 'WebPage', url }
  };
}
