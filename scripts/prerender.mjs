// Post-build prerender: writes a real, static HTML document for every content page into dist/,
// plus sitemap.xml, 404.html, llms.txt and the Static Web Apps route config.
// Why: the SPA served the same index.html (same <title>, canonical → "/") for every URL, so to
// crawlers the whole site was one page. Google needs each page's own HTML, title and canonical.
import fs from 'node:fs';
import path from 'node:path';
import { loadPages, renderBody, hubPages, jsonLd, breadcrumbsHtml, pageMeta, esc, SITE, SITE_NAME, REDIRECTS } from './content.mjs';

const dist = path.resolve('dist');
const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const cssLinks = [...indexHtml.matchAll(/<link rel="stylesheet"[^>]*>/g)].map((m) => m[0]).join('\n    ');
if (!cssLinks) throw new Error('prerender: no stylesheet link found in dist/index.html');
const adsenseClient = process.env.VITE_ADSENSE_CLIENT || '';
const contactEmail = process.env.VITE_CONTACT_EMAIL || '';
const today = new Date().toISOString().slice(0, 10);

const { pages, bySlug } = loadPages();
const all = [...pages.map((p) => ({ ...p, html: renderBody(p, bySlug) })), ...hubPages(pages)];

const adsenseTag = adsenseClient
  ? `<meta name="google-adsense-account" content="${esc(adsenseClient)}" />\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(adsenseClient)}" crossorigin="anonymous"></script>`
  : '';

const footer = `<footer class="foot">
      <p>Kakeklar er gratis · ingen innlogging · for norske foreldre. Mengdene er anbefalinger – juster fritt.</p>
      <nav class="foot-nav" aria-label="Informasjon">
        <a href="/om-kakeklar">Om Kakeklar</a><a href="/guider">Guider</a><a href="/oppskrifter">Oppskrifter</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a><a href="/kontakt">Kontakt</a>
      </nav>
      <p class="foot-credit">Made in Norway by <a href="https://www.linkedin.com/in/webmax/" target="_blank" rel="noopener noreferrer">Maxim Salnikov</a> · <a href="https://github.com/webmaxru/barnebursdag-planlegger" target="_blank" rel="noopener noreferrer">GitHub</a></p>
    </footer>`;

function document(page) {
  const url = SITE + page.path;
  const { eyebrow, dates } = pageMeta(page);
  let html = page.html;
  if (page.path === '/kontakt') {
    html = html.replace('{{contact_email}}', contactEmail
      ? `<p>Send gjerne en e-post til <a href="mailto:${esc(contactEmail)}">${esc(contactEmail)}</a>. Vi svarer normalt innen noen dager.</p>`
      : `<p>Den raskeste veien er <a href="https://github.com/webmaxru/barnebursdag-planlegger/issues">GitHub Issues</a>, eller en melding til utvikleren på <a href="https://www.linkedin.com/in/webmax/" rel="noopener noreferrer">LinkedIn</a>.</p>`);
  }
  const ld = JSON.stringify(jsonLd(page, bySlug)).replace(/</g, '\\u003c');
  const ogType = page.section === 'guider' || page.section === 'oppskrifter' ? 'article' : 'website';
  return `<!doctype html>
<html lang="nb">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(page.title)} · ${SITE_NAME}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="theme-color" content="#D7264A" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="nb" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="nb_NO" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${SITE}/og-image.png" />
    ${cssLinks}
    <script type="application/ld+json">${ld}</script>
    ${adsenseTag}
  </head>
  <body>
    <div class="content-page">
      <nav class="site-nav" aria-label="Hovedmeny">
        <a class="content-back" href="/">← Til Kakeklar</a>
        <a href="/guider"${page.section === 'guider' || page.path === '/guider' ? ' aria-current="page"' : ''}>Guider</a>
        <a href="/oppskrifter"${page.section === 'oppskrifter' || page.path === '/oppskrifter' ? ' aria-current="page"' : ''}>Oppskrifter</a>
      </nav>
      ${breadcrumbsHtml(page)}
      <header class="content-header">
        <p class="hero-eyebrow">${esc(eyebrow)}</p>
        <h1>${esc(page.title)}</h1>
        <p>${esc(page.lead || page.description)}</p>
        ${dates ? `<p class="content-meta">${esc(dates)}</p>` : ''}
      </header>
      <main class="content-body">${html}</main>
      ${footer}
    </div>
  </body>
</html>
`;
}

let count = 0;
for (const page of all) {
  const dir = path.join(dist, page.path.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), document(page));
  count++;
}

// 404 page (real 404 status via staticwebapp.config.json responseOverrides).
fs.writeFileSync(path.join(dist, '404.html'), document({
  path: '/404', section: 'sider', title: 'Fant ikke siden', description: 'Siden du lette etter finnes ikke.',
  lead: 'Siden er flyttet eller har aldri eksistert.', html: `<p>Prøv <a href="/">kalkulatoren på forsiden</a>, eller finn det du leter etter i <a href="/guider">guidene</a> og <a href="/oppskrifter">oppskriftene</a>.</p>`
}).replace('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />', '<meta name="robots" content="noindex" />').replace(/<link rel="canonical"[^>]*>\n/, ''));

// Inject the AdSense tag into the app shell too (only when VITE_ADSENSE_CLIENT is set at build time).
if (adsenseTag) {
  fs.writeFileSync(path.join(dist, 'index.html'), indexHtml.replace('</head>', `    ${adsenseTag}\n  </head>`));
}

// sitemap.xml: home + every content page, with real lastmod dates.
const urls = [{ loc: SITE + '/', lastmod: all.reduce((m, p) => (p.updated || p.date) > m ? (p.updated || p.date) : m, '2026-08-07'), priority: '1.0' },
  ...all.map((p) => ({ loc: SITE + p.path, lastmod: p.updated || p.date || today, priority: p.section === 'hub' ? '0.8' : p.section === 'sider' ? '0.4' : '0.7' }))];
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`);

// llms.txt: keep the hand-written header, append the page list.
const llms = fs.existsSync(path.join(dist, 'llms.txt')) ? fs.readFileSync(path.join(dist, 'llms.txt'), 'utf8').split('\n## Sider')[0].trimEnd() : `# ${SITE_NAME}`;
fs.writeFileSync(path.join(dist, 'llms.txt'), `${llms}\n\n## Sider\n${all.map((p) => `- [${p.title}](${SITE + p.path}): ${p.description}`).join('\n')}\n`);

// Static Web Apps config: explicit routes for every prerendered page, 301s for moved URLs,
// a real 404, and no catch-all rewrite to index.html (that was the soft-404 / duplicate-content cause).
const base = JSON.parse(fs.readFileSync(path.join(dist, 'staticwebapp.config.json'), 'utf8'));
const routes = [
  ...(base.routes || []).filter((r) => r.route !== '/sw.js' || true),
  ...Object.entries(REDIRECTS).map(([from, to]) => ({ route: from, redirect: to, statusCode: 301 })),
  ...all.map((p) => ({ route: p.path, rewrite: `${p.path}/index.html` }))
];
delete base.navigationFallback;
base.routes = routes;
base.trailingSlash = 'never';
base.responseOverrides = { ...(base.responseOverrides || {}), 404: { rewrite: '/404.html', statusCode: 404 } };
fs.writeFileSync(path.join(dist, 'staticwebapp.config.json'), JSON.stringify(base, null, 2) + '\n');

console.log(`prerender: ${count} pages, sitemap ${urls.length} urls, ${routes.length} routes${adsenseClient ? ', AdSense tag on' : ', AdSense tag off (set VITE_ADSENSE_CLIENT)'}${contactEmail ? ', contact e-mail on' : ''}`);
