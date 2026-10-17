# «Hvor kjøpe» – affiliate links (off by default)

Kakeklar can show shop links next to the shopping list and in a few guides. They are **off** until you turn them on,
and nothing is shown for an entry whose `url` is empty.

## How it works

- Config: `content/affiliates.json`
  - `guides.<slug>`: links shown in a «Hvor kjøpe» box after the article text, before FAQ/sources (never next to an ad unit).
  - `calculator.<category>`: links shown under a category in the shopping list (`mat`, `drikke`, `servise`, `pynt`, `godteri`).
  - `disclosure`: the sentence shown under the links.
- Switch: build with `VITE_AFFILIATE_LINKS=1` (GitHub Actions: add a repository variable and pass it in `deploy.yml`
  next to `VITE_FEATURE_MENY_CART`). Without it, neither the prerendered pages nor the calculator render any link.
- Every link is labelled **«Annonselenke»** and rendered with `rel="sponsored nofollow noopener"`
  (Google: mark ads/paid links with `rel="sponsored"`, developers.google.com/search/docs/crawling-indexing/qualify-outbound-links).
- Clicks are tracked as `affiliate_click` (category, merchant) when analytics is on.

## Turning it on

1. Join a network (see the sign-up list in the PR / `notes-r2.md`): Adtraction, Partner-ads, Awin or Tradedoubler.
2. Apply to shops that sell what the list contains (party goods, disposable tableware, candy bags, baking tins).
3. Paste the tracking links into `content/affiliates.json` (`merchant` = shop name as shown to readers).
4. Update `content/sider/personvern.md`: say that shop links may set the network's tracking cookie when clicked.
5. Build with `VITE_AFFILIATE_LINKS=1`, check one guide and the calculator, then deploy.

Keep it honest: only link to products the guide actually recommends, and never change a quantity or a
recommendation because a shop pays commission.
