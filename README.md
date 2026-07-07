# Tallyr — public static site

Small **static** marketing + legal pages for [Tallyr](https://github.com/). No build step: plain HTML + CSS.

## Assets

- **`assets/logo.png`** — Mark resized from the app splash asset (`app/assets/images/splash-logo-light.png`). Re-copy and re-run `sips -Z 160 …` if the master artwork changes.
- **`assets/styles.css`** — Site styles.

## Join from cafe QR (Expo web app — Phase Y)

Cafe poster QRs open the **Expo web app** join route (not a static JS signup on this site):

- **Canonical URL:** `https://app.tallyr.com.au/join?t=<cafe_token>`
- **Legacy marketing URL:** `https://tallyr.com.au/join?t=<cafe_token>` → redirects to the app (see `join/index.html`)

Implementation lives in the app repo: `src/app/join.tsx`, `src/features/join/`. Tasks **105–109** in `my_requirements/tasks/TASKS_STATUS.md`.

### This site (`public/`)

- **`join/index.html`** — redirect-only; forwards `?t=` to `app.tallyr.com.au/join`.
- **`assets/join.js`** — removed (Task 109); join is handled by the Expo web export.

### Backend (unchanged)

Pre-auth token resolve still uses anon-safe RPC `verify_cafe_qr_public(p_token text)`. Post-auth card attach uses `find_or_create_customer_card` in the app.

### Supabase settings checklist

In the Supabase dashboard (Authentication / URL configuration):

- **Site URL:** `https://app.tallyr.com.au` (Expo web app)
- **Additional Redirect URLs:** include:
  - `https://app.tallyr.com.au/**`
  - `https://tallyr.com.au/**` (legacy marketing redirect)
  - `http://localhost:*/*` (local dev)

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
   git commit -m "Initial Tallyr static site"
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

Support email in pages: **info@tallyr.com.au** (same as `SUPPORT_EMAIL` in the app).
