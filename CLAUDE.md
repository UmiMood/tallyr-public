# Tallyr — public static site

Small **static** marketing + legal site for Tallyr. **No build step** — plain, self-contained HTML
(assets embedded). Its own git repo (`tallyr-public`), separate from the app. Deployed via GitHub
Pages (`.github/workflows/deploy-pages.yml`); `.nojekyll` disables Jekyll processing.

## Pages (flat layout)

| Path | File |
| --- | --- |
| `/` | `index.html` — landing (assets embedded, ~1 MB) |
| `/contact` | `contact.html` |
| `/privacy` | `privacy.html` |
| `/terms` | `terms.html` (includes Refund Policy at `#refund-policy`) |

There is **no `/join` page here** — join is handled by the Expo web app (app.tallyr.com.au), not this
repo. App CTAs link out to the app.

## Conventions

- Keep it dependency-free and static — no framework, no bundler. Edit HTML/CSS directly; verify by
  opening the file in a browser.
- Don't reintroduce a client-side join form here — join is handled by the app's web export.
- The full app product/domain rules live in `../mobileapp/CLAUDE.md` and `../mobileapp/.claude/rules/`.

## Plan (PhaseBoard)

The plan/backlog for this site lives in **PhaseBoard** — project **TLRW** (`.phase/project.json`;
board `https://phaseboard.umair.au`). Read/update tasks over the `/api/v1` API (`phase` skill /
`phaseboard` MCP tools).
