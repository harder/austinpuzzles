# Austin Puzzle Exchange (Astro Rebuild)

Modern static/client-side rebuild of [austinpuzzles.com](https://austinpuzzles.com) using Astro, with optional free Cloudflare Worker APIs for dynamic feeds and spam verification.

## Highlights

- Static-first Astro architecture for fast page loads
- Content collections for location pages (address, hours, notes, photos, optional inventory)
- Interactive map with local search/filter (Leaflet + OpenStreetMap)
- Social panel with Facebook timeline embed and Bluesky feed snippets
- Open-source puzzle news feed (GitHub repo activity)
- Light/dark mode toggle with persisted preference
- Glassmorphism UI cards and subtle scroll animations
- Affiliate support cards for puzzle gear
- Contact form with anti-spam (honeypot + time trap + optional Turnstile verification)
- GitHub Actions CI + GitHub Pages deploy workflows
- Cloudflare Worker API endpoints for cached social/news fetches and Turnstile verification

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

## Content Model

Location content is stored in Markdown:

- `src/content/locations/southwest-austin.md`
- `src/content/locations/nw-hills.md`

Add a new location by creating another Markdown file in `src/content/locations/` with valid frontmatter fields from `src/content/config.ts`.

## Environment Variables

Copy `.env.example` to `.env` and set optional values.

- `PUBLIC_SOCIAL_API_URL`: Worker endpoint for social feed JSON
- `PUBLIC_NEWS_API_URL`: Worker endpoint for puzzle news JSON
- `PUBLIC_CONTACT_FORM_ACTION`: Contact form endpoint override
- `PUBLIC_TURNSTILE_SITE_KEY`: Turnstile widget site key
- `PUBLIC_TURNSTILE_VERIFY_URL`: Worker endpoint to verify Turnstile token

If `PUBLIC_SOCIAL_API_URL` and `PUBLIC_NEWS_API_URL` are not set, the site falls back to direct public APIs client-side.

## Cloudflare Worker (Optional)

Worker source: `worker/src/index.ts`

Endpoints:

- `GET /api/social` -> Bluesky feed proxy/cached response
- `GET /api/news` -> GitHub puzzle repo activity proxy/cached response
- `POST /api/verify-turnstile` -> verifies Turnstile token with secret key

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
