# Somnia Magna site

- `index.html`, `cities.js`, `content.json`, `images/` : the public site (edit text in Pages CMS, which edits `content.json`).
- `admin/index.html` : owner-only page to publish posts with photos (behind Cloudflare Access).
- `worker/` : the Cloudflare Worker (API, login-token check, photo serving). `wrangler.jsonc` wires it to D1 (database) and R2 (photos).
- Everything deploys from GitHub `main` through Cloudflare Workers Builds. Posts and photos are NOT in GitHub; they live in D1 and R2.

## One-time Cloudflare setup (dashboard)
1. R2: create bucket `somniamagna-photos`.
2. D1: create database `somniamagna`, copy its Database ID into `wrangler.jsonc`.
3. Zero Trust: pick a team name (free plan). Put `https://<team>.cloudflareaccess.com` in `TEAM_DOMAIN`.
4. Zero Trust > Access > Applications > Add > Self-hosted. Destinations `somniamagna.ca/admin` and `somniamagna.ca/api/admin`. Policy: Allow, emails = the two owner emails. Login method: One-time PIN. Copy the Application Audience tag into `POLICY_AUD`.
5. Merge to `main`. Workers Builds deploys it.
6. Optional but recommended: turn off the workers.dev route in the Worker's Domains & Routes settings.

## Changing who can sign in
Edit BOTH: the Access policy (dashboard) and `OWNER_EMAILS` in `wrangler.jsonc`.

## Local testing
`npm install`, put `DEV_EMAIL=you@example.com` in `.dev.vars` (git-ignored, never set it in the dashboard), run `npx wrangler dev`, send header `x-dev-email: you@example.com`. `npm test` checks the login-token logic.
