# Stamped — public static site

Small **static** marketing + legal pages for [Stamped](https://github.com/). No build step: plain HTML + CSS.

## Assets

- **`assets/logo.png`** — Mark resized from the app splash asset (`app/assets/images/splash-logo-light.png`). Re-copy and re-run `sips -Z 160 …` if the master artwork changes.
- **`assets/styles.css`** — Site styles.

## Join from cafe QR (planned — Phase U)

Acquisition join flow will live **on this same static site** (HTML + minimal JS, Supabase **anon** key only in the browser — **never** the service role). Locked product/engineering tasks live in the app repo: `my_requirements/tasks/task-93-…` through `task-97-…` and **Phase U** in `my_requirements/tasks/TASKS_STATUS.md`.

### Join route (Task 94)

- **Path**: `/join` → `join/index.html`
- **QR payload** (from spec): `https://<marketing-host>/join?t=<cafe_token>`
- **JS entry**: `assets/join.js` (live join flow: resolves token, email OTP, profile upsert, attach card)

### Public config (Supabase anon only)

The join page requires **two public values**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

These are injected into **`assets/config.js`**.

**Rules:**

- Only publish the **anon** key. **Never** publish the **service role** key.
- Treat `assets/config.js` as a generated file (deploy-time).

#### GitHub Pages workflow (recommended)

Set repository **Actions secrets**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The workflow generates `assets/config.js` during deploy.

#### Local testing

Copy the example file:

```bash
cp assets/config.example.js assets/config.js
```

Then edit `assets/config.js` with your Supabase URL + anon key.

### Backend prerequisite (Task 95)

The join page resolves the cafe token before auth via an anon-safe RPC:

- `verify_cafe_qr_public(p_token text)` (granted to `anon`)

And after OTP verification it attaches the card via:

- `find_or_create_customer_card(p_customer_id, p_brand_id, p_cafe_id)` (authenticated)

### Supabase settings checklist (marketing origin)

In the Supabase dashboard (Authentication / URL configuration):

- **Site URL**: set to your production marketing origin (e.g. `https://stamped.umair.au`)
- **Additional Redirect URLs**: include:
  - `https://stamped.umair.au/*`
  - `http://localhost:*/*` (optional for local testing)

If you use Edge Functions for any join endpoints, ensure their CORS handling allows the marketing origin.

### Staging (QA)

Simplest approach: create a second GitHub Pages repo like `stamped-site-staging` and deploy this same folder there.

- Staging URL example: `https://YOUR_USER.github.io/stamped-site-staging/`
- Use a separate Supabase project or separate OAuth redirect allowlist entries (recommended).

## Pages

| Path | File |
|------|------|
| `/` | `index.html` |
| `/privacy/` | `privacy/index.html` |
| `/terms/` | `terms/index.html` |
| `/join/` | `join/index.html` |

The mobile app expects these URLs (see `app/src/constants/appLinks.ts`):

- `https://stamped.umair.au/privacy`
- `https://stamped.umair.au/terms`

Configure your host so **`/privacy` and `/terms` without a trailing slash** still serve the same content (many CDNs do this automatically for `*/index.html`).

## Content sync

Legal copy is aligned with the in-app sources:

- `app/src/features/legal/privacyPolicySections.ts`
- `app/src/features/legal/termsOfServiceSections.ts`
- `app/src/features/legal/legalConstants.ts` (`LEGAL_DOCUMENT_LAST_UPDATED`)

When you change the in-app policy, update the matching HTML here (or automate export later).

## Deploy

### GitHub Pages (recommended for this folder)

Your Expo app git repo is only `app/`; **`public/` is usually its own GitHub repo** so Pages can publish from the repo root.

1. **Create a new repository** on GitHub (e.g. `stamped-site`) — do **not** add a README if you want a clean first push.

2. **From your machine** (adjust remote URL):

   ```bash
   cd /Users/umair/coffeeloyalty/public
   git init
   git add -A
   git commit -m "Initial Stamped static site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/stamped-site.git
   git push -u origin main
   ```

3. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (not “Deploy from a branch”).

4. Open **Actions**, approve the **“Deploy to GitHub Pages”** workflow if GitHub asks for first-time permissions.

5. After the workflow succeeds, Pages shows a URL like `https://YOUR_USER.github.io/stamped-site/`. Your relative links (`assets/…`, `privacy/`) already work for a **project site** at that path.

6. **Custom domain** (e.g. `stamped.umair.au`): **Settings → Pages → Custom domain** → add the domain and follow DNS instructions. Optional: add a `CNAME` file in this folder containing one line, the hostname GitHub shows (often `YOUR_USER.github.io`), and commit — GitHub will manage it on deploy.

**Note:** `_redirects` is for **Netlify** only; GitHub Pages ignores it. `/privacy` and `/terms` usually still resolve; if not, use trailing slashes in links or add server rules on a reverse proxy in front of Pages.

The workflow (`.github/workflows/deploy-pages.yml`) **rsyncs** the tree into `out/` **excluding** `.github/`, then uploads `out/` so workflow files are never published.

### Other hosts

Upload this folder’s contents to Netlify, Cloudflare Pages, S3 + CloudFront, etc. Example with [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
cd public && npx netlify deploy --prod --dir .
```

Example with **nginx**:

```nginx
root /var/www/stamped-public;
try_files $uri $uri/ $uri.html =404;
```

Support email in pages: **hello@umair.au** (same as `SUPPORT_EMAIL` in the app).
