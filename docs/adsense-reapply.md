# AdSense: what this PR fixes, and the re-apply checklist

## Why the site was rejected ("low value content")

Google's policy (Google Publisher Policies → Inventory value, read 16 Oct 2026):

> We do not allow Google-served ads on screens: without publisher-content or with low-value content, that are
> under construction, that are used for alerts, navigation or other behavioral purposes.
> — https://support.google.com/publisherpolicies/answer/11112688

> The content you provide should be of value to the user and be the focal point for users visiting your site
> or app. For this reason, we may limit or disable ad serving on pages with low value content and/or still
> being constructed until changes are made. […] Don't place ads on automatically generated content without
> manual review or curation.
> — same page

> Do you have your own unique and interesting content? Your content must be high-quality, original, and attract
> an audience.
> — https://support.google.com/adsense/answer/9724 (Eligibility requirements)

> For your site to succeed with AdSense, it needs to have unique content that's relevant to your visitors and
> provides a great user experience. […] Do your pages have clear, easy-to-use navigation? Do your pages have
> unique and interesting content?
> — https://support.google.com/adsense/answer/7299563 (Make sure your site's pages are ready for AdSense)

What the crawler actually saw on kakeklar.no before this PR:

1. Every URL — including `/om-kakeklar`, `/personvern`, `/kontakt` and any random path — returned HTTP 200 with
   the **same** `index.html`: same `<title>`, same meta description, `<link rel="canonical" href="https://kakeklar.no/">`.
   The real page content was only injected client-side. To Google the site was **one page** plus duplicates.
2. The whole site had roughly 1,500 words. The seven sub-pages were 120–260 words each.
3. No terms page; the privacy page did not cover cookies, third-party ads or consent; the contact page had no e-mail.
4. Unknown URLs were soft-404s (200 + app shell).

## What the PR changes

- Build-time prerendering of every content page to its own static HTML (title, description, canonical,
  Open Graph, JSON-LD, breadcrumbs, internal links), a generated `sitemap.xml`, a real `404.html`,
  Static Web Apps routes (301s for the three moved guide URLs), and no catch-all rewrite.
- Trust pages rewritten: Om Kakeklar, Kontakt, Personvern (cookies, Google AdSense disclosure with the links
  Google asks for, consent/CMP and a "change consent" button), Vilkår (new).
- A content hub (`/guider`, `/oppskrifter`) with ~22 original Norwegian guides and recipes, 600–1,500 words each,
  with Article/Recipe/FAQPage structured data and cross-links. Content is Markdown in `content/`.
- Footer and home page link to the hub and all trust pages.

## Consent (CMP) — required in the EEA

Google's requirement (read 16 Oct 2026, https://support.google.com/adsense/answer/13554116):

> To comply with the EU User Consent Policy, partners using our publisher products—Google AdSense, Ad Manager,
> or AdMob—are required to use a consent management platform (CMP) that has been certified by Google and
> integrates with the IAB's Transparency and Consent Framework (TCF) when serving personalized ads to users in
> the following regions: EEA and UK: As of 16 January 2024, a certified CMP integrated with the TCF is required
> when serving personalized ads to users in the EEA and UK.

Recommendation: use **Google's own CMP** (AdSense → Privacy & messaging → European regulations → create a GDPR
message). It is free, Google-certified, TCF 2.2-integrated, needs no extra script (it rides on `adsbygoogle.js`),
and the "Endre samtykke til annonser" button on `/personvern` already calls its revocation API
(`googlefc.showRevocationMessage()`). Alternatives if you want more control: Cookiebot, Usercentrics or
CookieYes — all on Google's certified list (check the current list in AdSense before choosing).

## ads.txt

`public/ads.txt` already contains `google.com, pub-6118980043742623, DIRECT, f08c47fec0942fa0` and is served at
https://kakeklar.no/ads.txt — keep it; verify the publisher ID matches the one in your AdSense account.

## Re-apply checklist (Maxim)

1. **Before merging — AdSense → Privacy & messaging**: create and publish the GDPR (European regulations) consent
   message (Google's own certified CMP; it is delivered by `adsbygoogle.js`, which is loaded on guide and recipe pages — the pages with ad units). Choose
   the "Ad serving if no consent" behaviour you prefer.
   Then **merge and deploy** this PR. The workflow now also runs on `content/**` changes (`.md` files were ignored before).
2. **Verify the live site** (replace nothing, just open):
   - `https://kakeklar.no/guider` and 3–4 guides: each has its own `<title>`, canonical and visible content with JS disabled
     (`curl -s https://kakeklar.no/guider/hvor-mye-mat-til-barnebursdag | grep -c '<h2'` should be > 3).
   - `https://kakeklar.no/en-side-som-ikke-finnes` → HTTP **404**.
   - `https://kakeklar.no/barnehagebursdag` → **301** to `/guider/barnehagebursdag`.
   - `https://kakeklar.no/sitemap.xml` lists ~27 URLs; `https://kakeklar.no/robots.txt` still points to it.
   - `https://kakeklar.no/personvern`, `/vilkar`, `/kontakt`, `/om-kakeklar` render.
   - Rich results test on one guide and one recipe: https://search.google.com/test/rich-results
3. **Contact e-mail**: set the GitHub Actions variable `CONTACT_EMAIL`; `deploy.yml` passes it as
   `VITE_CONTACT_EMAIL` so `/kontakt` shows a real address — Google reviewers look for one. Without it,
   both the static page and the React fallback show usable GitHub/LinkedIn contact links.
4. **Search Console**: add the property if missing, submit `https://kakeklar.no/sitemap.xml`, then use URL
   Inspection → "Request indexing" on `/`, `/guider`, `/oppskrifter` and 3–5 guides. Wait until Pages → Indexed
   shows the new URLs (typically days to 2–3 weeks). Fix anything under "Not indexed" → "Duplicate, Google chose
   different canonical" / "Soft 404" — there should be none now.
5. **Check the consent message shows** on a guide, e.g. https://kakeklar.no/guider/hvor-mye-mat-til-barnebursdag, from an EU browser profile (incognito). The home page/calculator, hubs and trust pages load no ad script (only the `google-adsense-account` meta tag), so no consent banner appears there.
6. **Ad code is already on** (same account and units as bpmtech.no): every page carries the
   `google-adsense-account` meta tag (site connection, support.google.com/adsense/answer/7584263); the loader
   `adsbygoogle.js?client=ca-pub-6118980043742623` is loaded once, only on guides and recipes, which carry one
   in-article unit (slot 4250080584) mid-article and one multiplex unit (slot 3563684870) at the end, each labelled
   «Annonser» (one of the two labels AdSense allows in Norwegian: «Annonser» or «Sponsede linker», support.google.com/adsense/answer/1346295?hl=no), height reserved and lazy-activated near the viewport. No units on Om/Kontakt/Personvern/Vilkår, hubs,
   the 404 or the calculator. Units stay blank until the site is approved. Kill switch: build with
   `VITE_ADSENSE_CLIENT=off`. Optionally enable Auto ads after approval and tune from there.
7. **Request review**: AdSense → Sites → kakeklar.no → "Request review" (only after steps 1–6 and after the new
   pages are indexed; the review typically takes a few days, up to 2–4 weeks).
8. While waiting: the four recipes now carry Kakeklar's own illustrations (SVG on the page, PNG in the Recipe
   schema). Real photos of your own bakes would be even better — replace `image` in the front matter. Keep
   publishing: one new guide every week or two beats a one-off batch.
9. **E-E-A-T** (round 2): every guide and recipe shows «Sist oppdatert», a byline linking to `/om-utvikleren`
   and an author box. Fill in the TODO comments in `content/sider/om-utvikleren.md` (they are stripped from the
   build, so nothing half-finished ships) and read through the guides — they carry your name.
