// Shared content model for Kakeklar's static pages (guides, recipes, trust pages).
// Used by scripts/build-content.mjs (→ public/content.json for the SPA / dev server)
// and scripts/prerender.mjs (→ dist/<path>/index.html, sitemap.xml, 404.html, SWA routes).
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { REDIRECTS } from './content-routes.mjs';

export { REDIRECTS };

export const SITE = 'https://kakeklar.no';
export const SITE_NAME = 'Kakeklar';
export const AUTHOR = { name: 'Maxim Salnikov', url: 'https://www.linkedin.com/in/webmax/' };
export const CONTENT_DIR = path.resolve('content');

export const CATEGORIES = {
  mengder: 'Mengder',
  planlegging: 'Planlegging',
  barnehage: 'Barnehage',
  allergier: 'Allergier',
  aktiviteter: 'Leker og aktiviteter',
  oppskrifter: 'Oppskrifter'
};
export const CATEGORY_ORDER = ['mengder', 'planlegging', 'barnehage', 'allergier', 'aktiviteter', 'oppskrifter'];

marked.setOptions({ gfm: true, breaks: false });

function parseFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter: ${file}`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`Invalid JSON front matter in ${file}: ${e.message}`); }
  const section = meta.section || path.basename(path.dirname(file));
  const slug = meta.slug || path.basename(file, '.md');
  const urlPath = section === 'sider' ? `/${slug}` : `/${section}/${slug}`;
  const body = m[2].trim();
  const words = body.replace(/\{\{recipe\}\}/g, '').split(/\s+/).filter(Boolean).length
    + (meta.recipe ? (meta.recipe.ingredients || []).length * 3 + (meta.recipe.instructions || []).reduce((n, s) => n + (s.text || '').split(/\s+/).length, 0) : 0);
  return { ...meta, section, slug, path: urlPath, body, words, readMinutes: Math.max(1, Math.round(words / 200)), file };
}

export function loadPages() {
  const files = [];
  for (const dir of fs.readdirSync(CONTENT_DIR)) {
    const full = path.join(CONTENT_DIR, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) if (f.endsWith('.md')) files.push(path.join(full, f));
  }
  const pages = files.map(parseFile);
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  // Validate internal links and related slugs so a typo never ships as a 404.
  const errors = [];
  for (const p of pages) {
    for (const s of p.related || []) if (!bySlug.has(s)) errors.push(`${p.file}: related slug not found: ${s}`);
    for (const m of p.body.matchAll(/\]\((\/[^)\s#]*)/g)) {
      const href = m[1].replace(/\/$/, '') || '/';
      if (href !== '/' && !byPath.has(href) && !REDIRECTS[href] && !['/guider', '/oppskrifter'].includes(href)) errors.push(`${p.file}: link to unknown page ${href}`);
    }
  }
  if (errors.length) {
    if (process.env.CONTENT_LENIENT) console.warn(`content: ${errors.length} link warnings (CONTENT_LENIENT set)`);
    else throw new Error('Content validation failed:\n' + errors.join('\n'));
  }
  pages.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, 'nb'));
  return { pages, byPath, bySlug };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

function recipeCard(r) {
  if (!r) return '';
  const ing = (r.ingredients || []).map((i) => `<li>${esc(i)}</li>`).join('');
  const steps = (r.instructions || []).map((s) => `<li>${s.name ? `<strong>${esc(s.name)}.</strong> ` : ''}${esc(s.text)}</li>`).join('');
  const meta = [
    r.yield && `<span><b>Gir</b> ${esc(r.yield)}</span>`,
    r.prepTime && `<span><b>Forberedelse</b> ${esc(humanDuration(r.prepTime))}</span>`,
    r.cookTime && `<span><b>Steketid</b> ${esc(humanDuration(r.cookTime))}</span>`,
    r.totalTime && `<span><b>Totalt</b> ${esc(humanDuration(r.totalTime))}</span>`
  ].filter(Boolean).join('');
  const allergens = (r.allergens || []).length ? `<p class="recipe-allergens">Inneholder: ${r.allergens.map(esc).join(', ')}. Sjekk alltid emballasjen på varene du bruker.</p>` : '';
  return `<section class="recipe-card" aria-label="Oppskrift">
<div class="recipe-meta">${meta}</div>
<h2>Ingredienser</h2><ul class="recipe-ingredients">${ing}</ul>
<h2>Slik gjør du</h2><ol class="recipe-steps">${steps}</ol>
${allergens}</section>`;
}

export function humanDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso || '');
  if (!m) return iso || '';
  const h = Number(m[1] || 0), min = Number(m[2] || 0);
  return [h ? `${h} t` : '', min ? `${min} min` : ''].filter(Boolean).join(' ');
}

function faqHtml(faq) {
  if (!faq?.length) return '';
  return `<section class="content-faq" aria-labelledby="faq-h"><h2 id="faq-h">Ofte stilte spørsmål</h2>${faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
}

function sourcesHtml(sources) {
  if (!sources?.length) return '';
  return `<section class="content-sources"><h2>Kilder</h2><ul>${sources
    .map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer nofollow" target="_blank">${esc(s.title || s.url)}</a></li>`).join('')}</ul></section>`;
}

function relatedHtml(page, bySlug) {
  const rel = (page.related || []).map((s) => bySlug.get(s)).filter(Boolean);
  if (!rel.length) return '';
  return `<aside class="content-related" aria-labelledby="rel-h"><h2 id="rel-h">Les også</h2><div class="content-links">${rel
    .map((p) => `<a class="content-link" href="${p.path}"><strong>${esc(p.title)}</strong><span>${esc(p.description)}</span></a>`).join('')}</div></aside>`;
}

/** Renders the inner article HTML (shared by the prerendered page and the SPA fallback). */
export function renderBody(page, bySlug, contactEmail = process.env.VITE_CONTACT_EMAIL || '') {
  let html = marked.parse(page.body);
  if (page.path === '/kontakt') {
    const contact = contactEmail.trim();
    const paragraph = contact
      ? `<p>Send gjerne en e-post til <a href="mailto:${esc(contact)}">${esc(contact)}</a>. Vi svarer normalt innen noen dager.</p>`
      : `<p>Den raskeste veien er <a href="https://github.com/webmaxru/barnebursdag-planlegger/issues">GitHub Issues</a>, eller en melding til utvikleren på <a href="https://www.linkedin.com/in/webmax/" rel="noopener noreferrer">LinkedIn</a>.</p>`;
    html = html.replace(/<p>\{\{contact_email\}\}<\/p>|\{\{contact_email\}\}/g, paragraph);
  }
  const card = recipeCard(page.recipe);
  if (html.includes('{{recipe}}')) html = html.replace(/<p>\{\{recipe\}\}<\/p>|\{\{recipe\}\}/, card);
  else if (card) html += card;
  return `${html}${faqHtml(page.faq)}${sourcesHtml(page.sources)}${relatedHtml(page, bySlug)}`;
}

export function hubPages(pages) {
  const guides = pages.filter((p) => p.section === 'guider');
  const recipes = pages.filter((p) => p.section === 'oppskrifter');
  const list = (items) => `<div class="content-links">${items
    .map((p) => `<a class="content-link" href="${p.path}"><strong>${esc(p.title)}</strong><span>${esc(p.description)}</span><small>${p.readMinutes} min lesetid</small></a>`).join('')}</div>`;
  const guiderBody = CATEGORY_ORDER.filter((c) => c !== 'oppskrifter').map((c) => {
    const items = guides.filter((p) => p.category === c);
    return items.length ? `<section class="hub-section" aria-labelledby="hub-${c}"><h2 id="hub-${c}">${CATEGORIES[c]}</h2>${list(items)}</section>` : '';
  }).join('') + (recipes.length ? `<section class="hub-section" aria-labelledby="hub-opp"><h2 id="hub-opp">Oppskrifter til bursdagen</h2>${list(recipes.slice(0, 4))}<p><a href="/oppskrifter">Alle oppskrifter →</a></p></section>` : '');
  return [
    {
      path: '/guider', slug: 'guider', section: 'hub', title: 'Guider til barnebursdag',
      description: 'Praktiske guider om matmengder, drikke, kake, planlegging, barnehagebursdag, allergier, leker og budsjett – skrevet for norske foreldre.',
      eyebrow: 'Kakeklar · guider', date: '2026-10-17', updated: pages[0]?.updated || '2026-10-17',
      lead: 'Alt du trenger for å planlegge en barnebursdag for barn mellom 3 og 9 år: hvor mye du skal kjøpe, hva du bør huske, og hvordan du får det til uten stress.',
      html: guiderBody, words: 0
    },
    {
      path: '/oppskrifter', slug: 'oppskrifter', section: 'hub', title: 'Oppskrifter til barnebursdag',
      description: 'Enkle, gjennomprøvde oppskrifter på bursdagskake, bløtkake, muffins og sunn bursdagsmat – med mengder som passer antall barn.',
      eyebrow: 'Kakeklar · oppskrifter', date: '2026-10-17', updated: pages[0]?.updated || '2026-10-17',
      lead: 'Kaker og mat som fungerer i barnebursdag: enkle å lage, lette å dele opp, og med tips til allergivennlige varianter.',
      html: list(recipes), words: 0
    }
  ];
}

export function jsonLd(page, bySlug) {
  const url = SITE + page.path;
  const crumbs = [{ name: 'Hjem', item: SITE + '/' }];
  if (page.section === 'guider') crumbs.push({ name: 'Guider', item: SITE + '/guider' });
  if (page.section === 'oppskrifter') crumbs.push({ name: 'Oppskrifter', item: SITE + '/oppskrifter' });
  crumbs.push({ name: page.title, item: url });
  const graph = [{
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item }))
  }];
  const publisher = { '@type': 'Organization', name: SITE_NAME, url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png' } };
  const author = { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url };
  if (page.section === 'guider') {
    graph.push({ '@type': 'Article', '@id': url + '#article', headline: page.title, description: page.description, inLanguage: 'nb',
      mainEntityOfPage: url, datePublished: page.date, dateModified: page.updated || page.date, author, publisher,
      image: SITE + '/og-image.png', wordCount: page.words, articleSection: CATEGORIES[page.category] || page.category });
  } else if (page.section === 'oppskrifter' && page.recipe) {
    const r = page.recipe;
    graph.push({ '@type': 'Recipe', '@id': url + '#recipe', name: r.name || page.title, description: page.description, inLanguage: 'nb',
      mainEntityOfPage: url, datePublished: page.date, dateModified: page.updated || page.date, author, publisher,
      image: r.image ? SITE + r.image : SITE + '/og-image.png',
      recipeYield: r.yield, prepTime: r.prepTime, cookTime: r.cookTime, totalTime: r.totalTime,
      recipeCategory: r.category, recipeCuisine: r.cuisine, keywords: r.keywords,
      recipeIngredient: r.ingredients, recipeInstructions: (r.instructions || []).map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text })) });
  } else if (page.section === 'hub') {
    graph.push({ '@type': 'CollectionPage', name: page.title, description: page.description, url, inLanguage: 'nb', isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' } });
  } else {
    graph.push({ '@type': 'WebPage', name: page.title, description: page.description, url, inLanguage: 'nb', dateModified: page.updated || page.date, isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' } });
  }
  if (page.faq?.length) graph.push({ '@type': 'FAQPage', mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function breadcrumbsHtml(page) {
  const items = [`<li><a href="/">Hjem</a></li>`];
  if (page.section === 'guider') items.push(`<li><a href="/guider">Guider</a></li>`);
  if (page.section === 'oppskrifter') items.push(`<li><a href="/oppskrifter">Oppskrifter</a></li>`);
  items.push(`<li aria-current="page">${esc(page.title)}</li>`);
  return `<nav class="breadcrumbs" aria-label="Brødsmuler"><ol>${items.join('')}</ol></nav>`;
}

export function pageMeta(page) {
  const eyebrow = page.eyebrow || (page.section === 'guider' ? `Kakeklar · guider · ${CATEGORIES[page.category] || ''}` : page.section === 'oppskrifter' ? 'Kakeklar · oppskrifter' : 'Kakeklar');
  const dates = page.section === 'guider' || page.section === 'oppskrifter'
    ? `Publisert ${fmtDate(page.date)}${page.updated && page.updated !== page.date ? ` · Oppdatert ${fmtDate(page.updated)}` : ''} · ${page.readMinutes} min lesetid · Av ${AUTHOR.name}`
    : page.updated || page.date ? `Sist oppdatert ${fmtDate(page.updated || page.date)}` : '';
  return { eyebrow, dates };
}

export { esc };
