// Builds public/content.json from content/**/*.md so the Vite dev server and the SPA
// fallback (src/components/ContentPage.tsx) can render the same pages the prerenderer writes.
import fs from 'node:fs';
import path from 'node:path';
import { loadPages, renderBody, hubPages, breadcrumbsHtml, pageMeta } from './content.mjs';

const { pages, bySlug } = loadPages();
const out = [...pages.map((p) => ({ ...p, html: renderBody(p, bySlug) })), ...hubPages(pages)].map((p) => {
  const { eyebrow, dates } = pageMeta(p);
  return { path: p.path, section: p.section, title: p.title, description: p.description, lead: p.lead || '', eyebrow, dates,
    breadcrumbs: breadcrumbsHtml(p), html: p.html };
});
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(path.join('public', 'content.json'), JSON.stringify(out));
console.log(`content.json: ${out.length} pages (${pages.length} articles, ${out.length - pages.length} hubs), ${(fs.statSync('public/content.json').size / 1024).toFixed(0)} KB`);
