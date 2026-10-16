# Content: guides, recipes and trust pages

All editorial pages live as Markdown in `content/`:

| Folder | URL | Used for |
|---|---|---|
| `content/guider/<slug>.md` | `/guider/<slug>` | Guides (Article JSON-LD) |
| `content/oppskrifter/<slug>.md` | `/oppskrifter/<slug>` | Recipes (Recipe JSON-LD) |
| `content/sider/<slug>.md` | `/<slug>` | Trust pages: om-kakeklar, kontakt, personvern, vilkar |

The hubs `/guider` and `/oppskrifter` are generated from the lists.

## File format

JSON front matter between two `---` lines, then Markdown (GFM tables and lists are fine):

```md
---
{
  "title": "≤ 65 chars",
  "description": "120–155 chars, written for the search snippet",
  "slug": "same-as-filename",
  "section": "guider",
  "category": "mengder | planlegging | barnehage | allergier | aktiviteter | oppskrifter",
  "date": "2026-10-17",
  "updated": "2026-10-17",
  "related": ["other-slug", "another-slug"],
  "faq": [{ "q": "…", "a": "…" }],
  "sources": [{ "title": "…", "url": "https://…" }],
  "recipe": { "name": "…", "yield": "…", "prepTime": "PT20M", "cookTime": "PT30M", "totalTime": "PT50M",
              "category": "Kake", "cuisine": "Norsk", "keywords": "…",
              "ingredients": ["…"], "instructions": [{ "name": "…", "text": "…" }], "allergens": ["gluten"] }
}
---
Lead paragraph …

## Section
```

- `{{recipe}}` on its own line marks where the ingredient/step card is rendered from the `recipe` object.
- `{{contact_email}}` (kontakt page only) becomes a mailto paragraph when `VITE_CONTACT_EMAIL` is set at build time.
- Internal links (`/guider/...`, `/oppskrifter/...`) and `related` slugs are validated at build time; an unknown
  target fails the build (set `CONTENT_LENIENT=1` to warn instead while drafting).

## Build pipeline

```
npm run content      # content/**/*.md → public/content.json (dev server + SPA fallback renderer)
npm run build        # prebuild: content → vite build → postbuild: scripts/prerender.mjs
```

`scripts/prerender.mjs` writes one static HTML document per page into `dist/<path>/index.html` with its own
`<title>`, meta description, canonical, Open Graph tags, JSON-LD (Article/Recipe/WebPage + BreadcrumbList +
FAQPage), breadcrumbs and footer, plus `dist/sitemap.xml`, `dist/404.html`, `dist/llms.txt` and the
`staticwebapp.config.json` routes (one rewrite per page, 301s for moved URLs, a real 404, no SPA catch-all).

Why: the SPA used to serve the same `index.html` (same title, canonical → `/`) for every URL, so crawlers saw
the whole site as one page — the direct cause of the AdSense "low value content" rejection.

Optional build-time env:

- `VITE_ADSENSE_CLIENT=ca-pub-…` — injects the AdSense loader (`adsbygoogle.js`) and the
  `google-adsense-account` meta into every page. Leave unset until the consent message (CMP) is enabled in AdSense.
- `VITE_CONTACT_EMAIL=…` — shows an e-mail address on `/kontakt`.
