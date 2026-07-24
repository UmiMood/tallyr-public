# Tallyr — public static site

Small **static** marketing + legal site for Tallyr. **No build step** — self-contained HTML.
Deployed to GitHub Pages via `.github/workflows/deploy-pages.yml`.

## Pages

| Path | File |
| --- | --- |
| `/` | `index.html` |
| `/contact` | `contact.html` |
| `/privacy` | `privacy.html` |
| `/terms` | `terms.html` (includes the Refund Policy at `#refund-policy`) |

Pages are flat, self-contained HTML (fonts and assets are embedded). GitHub Pages
serves `privacy.html` at `/privacy` (extensionless), so the mobile app's `/privacy`
and `/terms` deep links resolve without trailing slashes.

The app itself lives at `https://app.tallyr.com.au` (separate repo); the marketing
CTAs link there directly.

## Deploy

Push to `main` — the **Deploy to GitHub Pages** workflow rsyncs the tree into `out/`
(excluding `.git/`, `.github/`, `README.md`, `CLAUDE.md`) and publishes it.

First-time setup on GitHub: **Settings → Pages → Source: GitHub Actions**, then approve
the workflow run if prompted. For a custom domain (`tallyr.com.au`): **Settings → Pages →
Custom domain**, then add a `CNAME` file with the hostname and commit.

## Editing

Edit the HTML directly and verify by opening the file in a browser (or `python3 -m
http.server` from this folder). Keep it dependency-free and static — no framework,
no bundler, no build.

Support email used in pages: **info@tallyr.com.au**.
