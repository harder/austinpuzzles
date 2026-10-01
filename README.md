# Austin Puzzle Exchange

Static Astro site for [austinpuzzles.com](https://austinpuzzles.com), with optional Cloudflare Worker endpoints for dynamic feeds and spam verification.

## Highlights

- Static-first Astro architecture for fast page loads
- Illustrated Austin puzzle hero and a responsive editorial design
- Content collections for location pages (address, hours, notes, photos, optional inventory)
- Interactive map with local search/filter (Leaflet + OpenStreetMap)
- Facebook-first community panel with direct Page and Group links, plus an opt-in X timeline
- System/light/dark theme switch with a persisted preference
- Reduced-motion-aware page transitions
- Affiliate support cards for puzzle gear
- Contact form with anti-spam (honeypot + time trap + optional Turnstile verification)
- GitHub Actions CI + GitHub Pages deploy workflows
- Cloudflare Worker API endpoints for legacy optional feeds and Turnstile verification

## Stack

- Astro 5
- Astro Content Collections
- Leaflet
- Cloudflare Workers (optional)

## Local Development

```bash
npm install
npm run dev
```

Site runs at `http://localhost:4321`.

The public pages are generated at build time. The map and optional social feeds run in the browser. The site does not require a database or a server to render its core content.

## Content Model

Location content is stored in Markdown:

- `src/content/locations/southwest-austin.md`
- `src/content/locations/nw-hills.md`

Add a new location by creating another Markdown file in `src/content/locations/` with valid frontmatter fields from `src/content/config.ts`.

Only list actual puzzle inventory in location frontmatter. Empty inventory is expected and the site labels snapshots as approximate.

## Design Assets

The Austin puzzle illustration used in the homepage hero is `public/images/austin-puzzle-hero.jpg`. It was generated for this project with the built-in image generation tool, then compressed for the static site. It depicts Austin landmarks, Lady Bird Lake, live oaks, and loose jigsaw pieces in a mid-century print style. Location photos remain separate from the illustration.

Social brand marks in `public/icons/social/*-brand.svg` come from [Simple Icons](https://github.com/simple-icons/simple-icons). The icon library is CC0; brand trademarks remain with their owners.

## Shop Maintenance

The public shop uses manually curated links in `src/components/AffiliateGrid.astro`. Check each destination and affiliate status before publishing new links. Keep product descriptions accurate to the actual link destination.

If Amazon Creators API access is approved later, keep credentials in Cloudflare Worker secrets. A Worker can fetch and cache approved product information and return only the fields the static site needs. Do not expose API credentials in Astro public environment variables or browser JavaScript. eBay Partner Network, Etsy's affiliate program, and Walmart Creator are possible secondary programs; they require their own approval and tracking links before use.

## Environment Variables

Copy `.env.example` to `.env` and set optional values.

- `PUBLIC_CONTACT_FORM_ACTION`: Contact form endpoint override
- `PUBLIC_TURNSTILE_SITE_KEY`: Turnstile widget site key
- `PUBLIC_TURNSTILE_VERIFY_URL`: Worker endpoint to verify Turnstile token

The default FormSubmit endpoint keeps its provider-side reCAPTCHA enabled. Browser-side honeypot, timing, and optional Turnstile checks are additional layers, not substitutes for server-side spam protection. Any custom `PUBLIC_CONTACT_FORM_ACTION` must enforce its own server-side checks.

If `PUBLIC_SOCIAL_API_URL` and `PUBLIC_NEWS_API_URL` are not set, the site falls back to direct public APIs client-side.

## Cloudflare Worker (Optional)

Worker source: `worker/src/index.ts`

Active endpoint:

- `POST /api/verify-turnstile` -> verifies Turnstile token with secret key

Legacy endpoints still available to existing callers but not displayed by the site:

- `GET /api/social` -> Bluesky feed proxy/cached response
- `GET /api/news` -> GitHub puzzle repo activity proxy/cached response

The feed endpoints accept no query parameters. The Bluesky actor is set with the Worker's `SOCIAL_ACTOR` variable, and the GitHub puzzle search is fixed so public requests share a cache key and cannot choose upstream queries.

### Deploy Worker

```bash
npm run worker:deploy
```

Before deploying:

1. `wrangler login`
2. Set secret:
```bash
wrangler secret put TURNSTILE_SECRET_KEY
```
3. Optional for higher GitHub API limits:
```bash
wrangler secret put GITHUB_TOKEN
```

Adjust `wrangler.toml` vars as needed.

## GitHub Actions

Workflows:

- `ci.yml`: runs checks and build on push/PR
- `deploy-pages.yml`: builds and deploys Astro `dist/` to GitHub Pages
- `deploy-worker.yml`: deploys Cloudflare Worker when worker files change

Required secrets for worker deployment workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Notes

- Legacy static files remain in repository root for reference during migration.
- Runtime functionality is client-side; Worker API is optional and runs on Cloudflare free tier.
