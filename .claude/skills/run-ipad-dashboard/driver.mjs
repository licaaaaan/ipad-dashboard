// Drives the running iPad Dashboard in a headless browser and saves screenshots.
//
// Usage:
//   node .claude/skills/run-ipad-dashboard/driver.mjs [url] [outDir]
//   url    default http://localhost:3000  (start `npm run dev` first)
//   outDir default screenshot/
//
// Geolocation is pinned to Canberra so the weather tile renders real data
// without an interactive permission prompt. Viewport is iPad Air 2 landscape.
//
// Playwright is NOT a project dependency. This resolver finds it in the local
// node_modules if present, otherwise in the npm/npx cache (its folder hash
// changes per machine, so we glob). Run `npx playwright install chromium` once
// to make sure the chromium binary + an npx-cached playwright both exist.

import { createRequire } from 'node:module'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { homedir } from 'node:os'

function resolvePlaywright() {
  const require = createRequire(import.meta.url)
  // 1. Local install (devDependency), if the project ever adds it.
  try {
    return require.resolve('playwright')
  } catch {}
  // 2. npx cache: ~/AppData/Local/npm-cache/_npx/<hash>/node_modules/playwright
  const npxDir = join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
  if (existsSync(npxDir)) {
    for (const hash of readdirSync(npxDir)) {
      const candidate = join(npxDir, hash, 'node_modules', 'playwright', 'index.js')
      if (existsSync(candidate)) return candidate
    }
  }
  throw new Error('playwright not found — run: npx playwright install chromium')
}

const pwPath = resolvePlaywright()
const pw = await import(pathToFileURL(pwPath).href)
// playwright is CommonJS: dynamic import puts exports on .default
const chromium = pw.chromium ?? pw.default?.chromium

const url = process.argv[2] ?? 'http://localhost:3000'
const outDir = process.argv[3] ?? 'screenshot'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1024, height: 768 }, // iPad Air 2 landscape
  deviceScaleFactor: 2,
  geolocation: { latitude: -35.2809, longitude: 149.13 }, // Canberra
  permissions: ['geolocation'],
})
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(4000) // let the weather fetch resolve and render

await page.screenshot({ path: join(outDir, 'dashboard.png') })

// Crop to the clock/weather tile (the card containing the HH:mm clock).
try {
  const clock = page.locator('text=/^\\d{2}:\\d{2}$/').first()
  const card = await clock.evaluateHandle((el) => el.closest('div[class*="rounded"]') ?? el)
  const el = card.asElement()
  if (el) await el.screenshot({ path: join(outDir, 'clock-tile.png') })
} catch (e) {
  console.log('clock-tile crop skipped:', e.message)
}

await browser.close()
console.log(`screenshots written to ${outDir}/dashboard.png and ${outDir}/clock-tile.png`)
