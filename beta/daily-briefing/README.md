# 科技晨報

A buildless Traditional Chinese newspaper at `/beta/daily-briefing/`. `index.html`, `style.css` and `app.js` provide the layout, topic filters, edition selector and printing. No service worker or browser-side AI/API credentials are used.

## Update an edition

The existing ChatGPT Science and Technology Briefing automation researches and publishes editions through the connected GitHub app. GitHub Pages deploys after merge; a failed run leaves the previous dated edition visible.

Read `briefing.json` first. Its root is `{ "editions": [...] }`, newest first. Each edition has `date` (Europe/London calendar date, `YYYY-MM-DD`), `note` and exactly ten `stories`. Each story has:

- `topic`: `ai`, `space`, `maker`, `markets` or `hk`
- `published`: the original source's date, `YYYY-MM-DD`
- `headline`, `summary`, `takeaway`: Traditional Chinese text; clearly distinguish findings, claims, proposals and editorial interpretation
- `source`: `{ "name": "...", "url": "https://..." }`
- `image`: `{ "url": "https://...", "alt": "...", "caption": "...", "credit": "..." }`; use a verified relevant image, disclose illustrative/archive images, retain attribution and respect reuse terms

Replace an edition with the same date rather than duplicating it; preserve all other editions, including earlier five-story issues. Keep the page's design unchanged. Include Hong Kong headlines and relevant company/market developments alongside science, AI and maker stories. Keep personal investment holdings and the private monitoring list out of public files. Publish only verified stories; widen the news window on quiet days and explain it in `note`. Never change the displayed date without publishing a complete edition.

Use a `codex/` branch and a PR. Validate JSON, ten stories per new issue, dates, HTTPS links and script parsing; merge after repository checks pass. Change only `briefing.json` for routine editions. If publication fails, report the failure without claiming the site updated.
