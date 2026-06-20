---
name: run-ipad-dashboard
description: Build, run, and screenshot the iPad Dashboard Next.js app. Use when asked to run, start, launch, preview, or take a screenshot of the dashboard, or to verify a tile/UI change renders correctly at iPad resolution.
---

# Run the iPad Dashboard

A Next.js (App Router) web dashboard meant for a wall-mounted iPad Air 2.
Tiles: clock + weather, calendar, music, photos, tasks, news. You run it
with `npm run dev` and drive it headless with **Playwright** via
`.claude/skills/run-ipad-dashboard/driver.mjs`, which loads the page at
iPad-Air-2 resolution, pins geolocation to Canberra so the weather tile
renders real data, and writes screenshots to `screenshot/`.

All paths below are relative to the repo root (`<unit>/`). Commands are
PowerShell/Bash-agnostic; this project runs on Windows.

## Prerequisites

- Node 24 (verified on v24.15.0).
- Project deps installed: `npm install`.
- Playwright + the Chromium binary. Playwright is **not** a project
  dependency — `npx` caches it and the driver finds it automatically.
  Run this once to populate both the cache and the browser binary:

  ```bash
  npx playwright install chromium
  ```

  This downloads Chromium to `~/AppData/Local/ms-playwright/`. The driver
  resolves the `playwright` package from either `node_modules` (if ever
  added as a devDependency) or the `_npx` cache.

## Run (agent path) — screenshot the dashboard

Start the dev server (background), wait for it, then run the driver:

```bash
# 1. start the server in the background
npm run dev   # serves http://localhost:3000

# 2. wait until it answers, then drive it
node .claude/skills/run-ipad-dashboard/driver.mjs
```

Output:

```
screenshots written to screenshot/dashboard.png and screenshot/clock-tile.png
```

- `screenshot/dashboard.png` — full 1024×768 dashboard.
- `screenshot/clock-tile.png` — cropped clock/weather tile.

**Look at the screenshot.** A correct clock tile shows a large `HH:MM`,
the date, a weather icon + temperature (e.g. `11°`), the condition, and
`📍 Canberra`, with a Sun/Mon/Tue forecast row below a divider.

Override the URL or output dir if needed:

```bash
node .claude/skills/run-ipad-dashboard/driver.mjs http://localhost:3000 screenshot
```

## Run (human path)

```bash
npm run dev
```

Then open `http://localhost:3000` in a real browser. The browser will
prompt for location permission; deny it and the weather tile falls back
to Canberra. Useless headless — use the driver above instead.

## Other commands

```bash
npm test            # vitest run
npm run lint        # next lint
npx tsc --noEmit    # type-check
npm run build       # production build
```

## Gotchas

- **Weather needs geolocation set in the browser context.** Without it,
  `navigator.geolocation` either prompts (headed) or, in the app's iOS
  path, times out after 10s and falls back to Canberra. The driver sets
  `geolocation` + `permissions: ['geolocation']` so weather renders
  immediately. The app calls keyless Open-Meteo, so no API key is needed —
  but the machine needs internet.
- **The weather fetch is async after load.** The driver waits 4s
  (`waitForTimeout`) after `networkidle` before screenshotting; remove
  that and you capture the tile before weather arrives.
- **Playwright is CommonJS.** A dynamic `import()` puts exports on
  `.default`, so `const { chromium } = await import(...)` gives
  `undefined`. The driver reads `pw.chromium ?? pw.default?.chromium`.
- **`NODE_PATH` does not work for ESM.** That's why the driver resolves
  Playwright to an absolute path and imports the file URL directly,
  rather than relying on module resolution.
- **The clock updates every second**, so `clock-tile.png` shows a
  different time on each run — that's expected, not a flake.
- **iPad Air 2 is 4:3**; the driver uses 1024×768 landscape with
  `deviceScaleFactor: 2`. Fonts are deliberately large for across-the-room
  reading.

## Troubleshooting

- `playwright not found — run: npx playwright install chromium` — the
  driver couldn't locate Playwright in `node_modules` or the `_npx`
  cache. Run that command.
- `Executable doesn't exist at ...chrome-headless-shell.exe` — Playwright
  is present but the Chromium binary isn't. Run
  `npx playwright install chromium`.
- Driver hangs on `page.goto` — the dev server isn't up yet. Confirm
  `curl http://localhost:3000` returns 200 before running the driver.
- Screenshot shows the clock but no weather — no internet (Open-Meteo
  unreachable), or you removed the post-load wait.
