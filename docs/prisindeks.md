# Prisindeks for barnebursdag

The index is one ordinary guide plus a small data file and a CSV. The homepage teaser, the note under the calculator total, and the Dataset structured data all read `content/prisindeks/latest.json`. The article itself is written by hand in `content/guider/prisindeks-bursdagskurv.md`.

## Files

| File | What it is |
|---|---|
| `content/guider/prisindeks-bursdagskurv.md` | The article. Same URL every month: `/guider/prisindeks-bursdagskurv`. |
| `content/prisindeks/latest.json` | The current totals. This is what the teaser and the calculator note show. |
| `public/prisindeks/YYYY-MM.csv` | The raw rows for that month, linked from the article. Keep old files. |

`latest.json` looks like this:

```json
{
  "title": "Ny: Prisindeks for barnebursdag – november 2026",
  "lead": "Kjernekurv for 10 barn, samlet 25. november 2026. REMA 1000 var billigst.",
  "collected": "2026-11-25",
  "period": "2026-11",
  "periodLabel": "november 2026",
  "guide": "/guider/prisindeks-bursdagskurv",
  "csv": "/prisindeks/2026-11.csv",
  "guests": 10,
  "stores": [
    { "name": "REMA 1000", "total": "679,50", "perChild": "ca. 68 kr per barn", "cheapest": true },
    { "name": "MENY", "total": "813,10", "perChild": "81,31 kr per barn" },
    { "name": "Oda", "total": "825,00", "perChild": "82,50 kr per barn" }
  ]
}
```

Mark exactly one store with `"cheapest": true`. `total` and `perChild` are already formatted for Norwegian (comma as decimal mark). `csv` must point at a file under `public/prisindeks/`.

## Monthly refresh

Do this around the 25th. The basket and the rules stay the same; only the prices change.

1. Collect the prices the same way as last time (ordinary price at Oda and MENY, latest registered REMA 1000 price from SeSum). Same products where they still exist. If a product is gone, pick the nearest substitute and say so in the article.
2. Save the rows as `public/prisindeks/YYYY-MM.csv`. Do not delete older CSVs.
3. Update `content/prisindeks/latest.json`: `title`, `lead`, `collected`, `period`, `periodLabel`, `csv`, and each store's `total`, `perChild` and `cheapest`.
4. Update the article: the date line at the top, the totals, the table, the conclusions that depend on this month, `updated` in the front matter, and the CSV link (`/prisindeks/YYYY-MM.csv`). Leave the method sections unless a rule actually changed.
5. `npm run test:content` checks that the CSV exists, that exactly one store is cheapest, and that each store total appears in the article.
6. Build and deploy as usual. The homepage teaser and the calculator note pick up `latest.json` with no other edit.

The sentences in the budget, quantity and planning guides only link to the index. They do not contain the month's prices, so they stay as they are.
