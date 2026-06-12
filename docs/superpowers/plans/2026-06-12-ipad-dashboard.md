# iPad Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen iPad dashboard Next.js app with live weather, calendar (Google + Apple), and music (Spotify + YouTube) tiles, deployed on Vercel.

**Architecture:** Next.js 14 App Router with API routes handling all OAuth and external API calls server-side. Encrypted httpOnly cookies store OAuth tokens. The client polls API routes for live data and handles swipe gestures between sources.

**Tech Stack:** Next.js 14, Tailwind CSS, TypeScript, iron-session (cookie encryption), googleapis (Google Calendar), tsdav (iCloud CalDAV), Vitest (unit tests), deployed on Vercel.

---

## File Map

```
app/
  layout.tsx                          # Root layout, viewport meta, PWA meta tags
  page.tsx                            # Dashboard assembly — BentoGrid + all tiles
  globals.css                         # Aurora background animation keyframes
  api/
    auth/spotify/route.ts             # Spotify OAuth initiation
    auth/spotify/callback/route.ts    # Spotify OAuth callback → stores tokens
    auth/google/route.ts              # Google OAuth initiation
    auth/google/callback/route.ts     # Google OAuth callback → stores tokens
    spotify/now-playing/route.ts      # Proxies Spotify currently-playing
    spotify/control/route.ts          # Proxies Spotify playback control
    calendar/google/route.ts          # Fetches Google Calendar events
    calendar/apple/route.ts           # Proxies iCloud CalDAV
    weather/route.ts                  # Fetches OpenWeatherMap
components/
  ui/
    GlassTile.tsx                     # Aurora glass tile base component
    SwipeContainer.tsx                # Touch + mouse swipe wrapper
    DotIndicator.tsx                  # Active-source dot indicators
  tiles/
    ClockTile.tsx                     # Live clock + date, client-side only
    WeatherTile.tsx                   # Weather data + 3-day forecast
    CalendarTile.tsx                  # Swipeable Google ↔ Apple Calendar
    MusicTile.tsx                     # Swipeable Spotify ↔ YouTube
  calendar/
    GoogleCalendar.tsx                # Renders Google Calendar events list
    AppleCalendar.tsx                 # Renders Apple Calendar events list + setup
  music/
    SpotifyPlayer.tsx                 # Album art, track info, playback controls
    YouTubePlayer.tsx                 # YouTube IFrame + IFrame API controls
  settings/
    SettingsPanel.tsx                 # Gear icon + slide-up settings modal
lib/
  cookies.ts                          # iron-session encrypt/decrypt helpers
  spotify.ts                          # Spotify API fetch + token auto-refresh
  google-calendar.ts                  # Google Calendar API client
  apple-caldav.ts                     # iCloud CalDAV PROPFIND/REPORT client
  weather.ts                          # OpenWeatherMap fetch helper
types/index.ts                        # Shared TypeScript interfaces
.env.local                            # Local secrets (gitignored)
.env.example                          # Committed example with placeholder values
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env.example`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create the Next.js app**

```bash
cd "C:\Users\lican\OneDrive\Desktop\iPad Dashbooard"
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted: accept all defaults.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install iron-session googleapis tsdav
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create `.env.example`**

```bash
# .env.example
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENWEATHER_API_KEY=your_openweathermap_api_key
SESSION_SECRET=32_character_random_string_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Create `.env.local`** (fill in real values — never commit this)

```bash
cp .env.example .env.local
# Edit .env.local and fill in your real API keys
```

Generate a SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 6: Add `.env.local` to `.gitignore`**

Verify `.gitignore` contains `.env.local` (create-next-app adds it by default).

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000` with no errors.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js 14 project with Tailwind and Vitest"
```

---

## Task 2: Shared Types + Cookie Utilities

**Files:**
- Create: `types/index.ts`
- Create: `lib/cookies.ts`
- Create: `lib/cookies.test.ts`

- [ ] **Step 1: Write failing tests for cookie utilities**

Create `lib/cookies.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encryptToken, decryptToken } from './cookies'

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-32-chars-padding-xxx!'
})

describe('cookie encryption', () => {
  it('round-trips a token object', async () => {
    const token = { access_token: 'abc123', refresh_token: 'def456', expires_at: 9999999999 }
    const encrypted = await encryptToken(token)
    const decrypted = await decryptToken(encrypted)
    expect(decrypted).toEqual(token)
  })

  it('returns null for invalid ciphertext', async () => {
    const result = await decryptToken('not-valid-ciphertext')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/cookies.test.ts
```

Expected: FAIL — `encryptToken` not found.

- [ ] **Step 3: Create shared types**

Create `types/index.ts`:

```ts
export interface OAuthToken {
  access_token: string
  refresh_token: string
  expires_at: number  // Unix timestamp in ms
}

export interface AppleCredentials {
  email: string
  app_password: string
}

export interface WeatherData {
  temp: number
  feels_like: number
  condition: string
  icon: string
  city: string
  forecast: Array<{ date: string; icon: string; high: number; low: number }>
}

export interface CalendarEvent {
  id: string
  title: string
  start: string   // ISO 8601
  end: string
  allDay: boolean
}

export interface NowPlaying {
  isPlaying: boolean
  trackName: string
  artistName: string
  albumName: string
  albumArtUrl: string
  progressMs: number
  durationMs: number
}
```

- [ ] **Step 4: Implement cookie utilities using iron-session**

Create `lib/cookies.ts`:

```ts
import { sealData, unsealData } from 'iron-session'

const SESSION_SECRET = process.env.SESSION_SECRET!
const TTL = 60 * 60 * 24 * 30  // 30 days

export async function encryptToken(data: object): Promise<string> {
  return sealData(data, { password: SESSION_SECRET, ttl: TTL })
}

export async function decryptToken<T>(sealed: string): Promise<T | null> {
  try {
    return await unsealData<T>(sealed, { password: SESSION_SECRET, ttl: TTL })
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run lib/cookies.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/cookies.ts lib/cookies.test.ts vitest.config.ts vitest.setup.ts
git commit -m "feat: add shared types and cookie encryption utilities"
```

---

## Task 3: Aurora Glass Tile + Bento Grid Layout

**Files:**
- Create: `components/ui/GlassTile.tsx`
- Create: `app/globals.css` (replace generated)
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/globals.css` with aurora styles**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #020617;
}

@keyframes aurora {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.aurora-bg {
  background: linear-gradient(
    -45deg,
    #020617,
    #0a0a2e,
    #0d1f3c,
    #120a2e,
    #020617
  );
  background-size: 400% 400%;
  animation: aurora 20s ease infinite;
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'iPad Dashboard',
  description: 'Personal dashboard',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Create `GlassTile` component**

Create `components/ui/GlassTile.tsx`:

```tsx
interface GlassTileProps {
  gradient: string       // Tailwind gradient classes, e.g. "from-purple-700 to-cyan-500"
  className?: string
  children: React.ReactNode
}

export default function GlassTile({ gradient, className = '', children }: GlassTileProps) {
  return (
    <div
      className={`
        relative rounded-2xl p-4 overflow-hidden
        bg-gradient-to-br ${gradient} bg-opacity-50
        border border-white/15 backdrop-blur-md
        transition-transform duration-150 active:scale-[0.98]
        ${className}
      `}
      style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
    >
      <div className="absolute inset-0 bg-black/40 rounded-2xl" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Create the Bento Grid dashboard skeleton in `app/page.tsx`**

```tsx
'use client'
import GlassTile from '@/components/ui/GlassTile'

export default function DashboardPage() {
  return (
    <main className="aurora-bg w-screen h-screen p-4 grid gap-3"
      style={{
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      {/* Weather — spans col 1-2, row 1 */}
      <GlassTile gradient="from-purple-700 to-cyan-500"
        className="col-span-2"
        style={{ gridColumn: '1 / 3', gridRow: '1' }}
      >
        <p className="text-white/60 text-sm">Weather</p>
      </GlassTile>

      {/* Clock — col 3, row 1 */}
      <GlassTile gradient="from-amber-400 to-amber-600"
        style={{ gridColumn: '3', gridRow: '1' }}
      >
        <p className="text-white/60 text-sm">Clock</p>
      </GlassTile>

      {/* Calendar — col 1, row 2 */}
      <GlassTile gradient="from-emerald-500 to-teal-600"
        style={{ gridColumn: '1', gridRow: '2' }}
      >
        <p className="text-white/60 text-sm">Calendar</p>
      </GlassTile>

      {/* Music — spans col 2-3, row 2 */}
      <GlassTile gradient="from-green-600 to-green-800"
        className="col-span-2"
        style={{ gridColumn: '2 / 4', gridRow: '2' }}
      >
        <p className="text-white/60 text-sm">Music</p>
      </GlassTile>
    </main>
  )
}
```

Note: The `style` prop on GlassTile is not yet wired — grid placement is handled by wrapping divs in the next step. For now, verify the aurora background and glass tiles render.

- [ ] **Step 5: Fix grid placement — update page.tsx to use wrapper divs**

Replace `app/page.tsx` with the proper grid approach:

```tsx
'use client'
import GlassTile from '@/components/ui/GlassTile'

export default function DashboardPage() {
  return (
    <main
      className="aurora-bg w-screen h-screen p-4 grid gap-3"
      style={{
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      <div style={{ gridColumn: '1 / 3', gridRow: '1' }}>
        <GlassTile gradient="from-purple-700 to-cyan-500" className="h-full">
          <p className="text-white/60 text-sm">Weather</p>
        </GlassTile>
      </div>

      <div style={{ gridColumn: '3', gridRow: '1' }}>
        <GlassTile gradient="from-amber-400 to-amber-600" className="h-full">
          <p className="text-white/60 text-sm">Clock</p>
        </GlassTile>
      </div>

      <div style={{ gridColumn: '1', gridRow: '2' }}>
        <GlassTile gradient="from-emerald-500 to-teal-600" className="h-full">
          <p className="text-white/60 text-sm">Calendar</p>
        </GlassTile>
      </div>

      <div style={{ gridColumn: '2 / 4', gridRow: '2' }}>
        <GlassTile gradient="from-green-600 to-green-800" className="h-full">
          <p className="text-white/60 text-sm">Music</p>
        </GlassTile>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: dark aurora animated background, 4 glass tiles in bento grid layout.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx components/ui/GlassTile.tsx
git commit -m "feat: add aurora glass tile component and bento grid layout"
```

---

## Task 4: Clock / Date Tile

**Files:**
- Create: `components/tiles/ClockTile.tsx`

- [ ] **Step 1: Create the ClockTile component**

Create `components/tiles/ClockTile.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import GlassTile from '@/components/ui/GlassTile'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ClockTile() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <GlassTile gradient="from-amber-400 to-amber-600" className="h-full flex flex-col justify-center items-center gap-2">
      <span className="text-4xl font-light text-white tabular-nums tracking-tight">
        {now ? formatTime(now) : '--:--:--'}
      </span>
      <span className="text-sm text-amber-100/80 font-medium">
        {now ? formatDate(now) : ''}
      </span>
    </GlassTile>
  )
}
```

- [ ] **Step 2: Wire ClockTile into the dashboard**

Edit `app/page.tsx` — replace the Clock placeholder:

```tsx
// Add import at top:
import ClockTile from '@/components/tiles/ClockTile'

// Replace the clock GlassTile wrapper:
<div style={{ gridColumn: '3', gridRow: '1' }}>
  <ClockTile />
</div>
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000`. Expected: amber tile top-right showing live clock ticking every second and current date below.

- [ ] **Step 4: Commit**

```bash
git add components/tiles/ClockTile.tsx app/page.tsx
git commit -m "feat: add live clock/date tile"
```

---

## Task 5: Weather API Route + Weather Tile

**Files:**
- Create: `lib/weather.ts`
- Create: `lib/weather.test.ts`
- Create: `app/api/weather/route.ts`
- Create: `components/tiles/WeatherTile.tsx`

> **Before starting:** Sign up for a free API key at https://openweathermap.org/api (Current Weather Data + 3-day forecast). Add `OPENWEATHER_API_KEY` to `.env.local`.

- [ ] **Step 1: Write failing tests for weather lib**

Create `lib/weather.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { fetchWeather } from './weather'

describe('fetchWeather', () => {
  it('returns WeatherData shape on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'San Francisco',
        main: { temp: 18.5, feels_like: 17 },
        weather: [{ description: 'partly cloudy', icon: '02d' }],
      }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: [
          { dt: 1700000000, main: { temp_max: 20, temp_min: 14 }, weather: [{ icon: '02d' }] },
          { dt: 1700086400, main: { temp_max: 22, temp_min: 15 }, weather: [{ icon: '01d' }] },
          { dt: 1700172800, main: { temp_max: 19, temp_min: 13 }, weather: [{ icon: '03d' }] },
        ],
      }),
    }) as any

    const result = await fetchWeather({ lat: 37.77, lon: -122.41 })
    expect(result.city).toBe('San Francisco')
    expect(result.temp).toBe(19)  // rounded
    expect(result.forecast).toHaveLength(3)
  })

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as any
    await expect(fetchWeather({ lat: 0, lon: 0 })).rejects.toThrow('OpenWeatherMap error: 401')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/weather.test.ts
```

Expected: FAIL — `fetchWeather` not found.

- [ ] **Step 3: Implement `lib/weather.ts`**

```ts
import type { WeatherData } from '@/types'

const BASE = 'https://api.openweathermap.org/data/2.5'

export async function fetchWeather({ lat, lon }: { lat: number; lon: number }): Promise<WeatherData> {
  const key = process.env.OPENWEATHER_API_KEY
  const [current, forecast] = await Promise.all([
    fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`),
    fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=24&appid=${key}`),
  ])

  if (!current.ok) throw new Error(`OpenWeatherMap error: ${current.status}`)
  if (!forecast.ok) throw new Error(`OpenWeatherMap error: ${forecast.status}`)

  const c = await current.json()
  const f = await forecast.json()

  // One entry per day: pick noon-ish entries (every 8th = every 24h at 3h intervals)
  const days = f.list.filter((_: unknown, i: number) => i % 8 === 0).slice(0, 3)

  return {
    temp: Math.round(c.main.temp),
    feels_like: Math.round(c.main.feels_like),
    condition: c.weather[0].description,
    icon: c.weather[0].icon,
    city: c.name,
    forecast: days.map((d: any) => ({
      date: new Date(d.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      icon: d.weather[0].icon,
      high: Math.round(d.main.temp_max),
      low: Math.round(d.main.temp_min),
    })),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/weather.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Create `app/api/weather/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '0')
  const lon = parseFloat(searchParams.get('lon') ?? '0')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  try {
    const data = await fetchWeather({ lat, lon })
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=600' },  // 10 min cache
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create `components/tiles/WeatherTile.tsx`**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { WeatherData } from '@/types'

const WEATHER_ICON_URL = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`

export default function WeatherTile({ locationOverride }: { locationOverride?: { lat: number; lon: number } }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error()
      setWeather(await res.json())
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    if (locationOverride) {
      load(locationOverride.lat, locationOverride.lon)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(37.7749, -122.4194)  // fallback: San Francisco
    )
    const id = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => {}
      )
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [load, locationOverride])

  return (
    <GlassTile gradient="from-purple-700 to-cyan-500" className="h-full flex flex-col justify-between">
      {error ? (
        <p className="text-white/60 text-sm">Weather unavailable</p>
      ) : !weather ? (
        <p className="text-white/40 text-sm animate-pulse">Loading weather...</p>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-200/70 text-xs font-semibold tracking-widest uppercase">Weather</p>
              <p className="text-white text-5xl font-light mt-1">{weather.temp}°</p>
              <p className="text-purple-100/80 text-sm capitalize mt-1">{weather.condition}</p>
              <p className="text-purple-200/60 text-xs mt-0.5">{weather.city}</p>
            </div>
            <img src={WEATHER_ICON_URL(weather.icon)} alt={weather.condition} className="w-16 h-16" />
          </div>
          <div className="flex gap-4 mt-3">
            {weather.forecast.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-purple-200/60 text-xs">{day.date}</span>
                <img src={WEATHER_ICON_URL(day.icon)} alt="" className="w-8 h-8" />
                <span className="text-white text-xs">{day.high}°</span>
                <span className="text-purple-200/50 text-xs">{day.low}°</span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassTile>
  )
}
```

- [ ] **Step 7: Wire WeatherTile into dashboard**

Edit `app/page.tsx`:

```tsx
// Add import:
import WeatherTile from '@/components/tiles/WeatherTile'

// Replace weather placeholder:
<div style={{ gridColumn: '1 / 3', gridRow: '1' }}>
  <WeatherTile />
</div>
```

- [ ] **Step 8: Verify in browser**

Open `http://localhost:3000`. Browser will ask for location permission — allow it. Expected: weather tile shows temperature, condition, city, 3-day forecast icons.

- [ ] **Step 9: Commit**

```bash
git add lib/weather.ts lib/weather.test.ts app/api/weather/route.ts components/tiles/WeatherTile.tsx app/page.tsx
git commit -m "feat: add weather API route and WeatherTile with geolocation"
```

---

## Task 6: Swipe Container + Dot Indicator

**Files:**
- Create: `components/ui/SwipeContainer.tsx`
- Create: `components/ui/DotIndicator.tsx`

These are used by both CalendarTile and MusicTile.

- [ ] **Step 1: Create `DotIndicator` component**

Create `components/ui/DotIndicator.tsx`:

```tsx
interface DotIndicatorProps {
  count: number
  active: number
}

export default function DotIndicator({ count, active }: DotIndicatorProps) {
  return (
    <div className="flex gap-1.5 justify-center mt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            i === active ? 'bg-white scale-125' : 'bg-white/30'
          }`}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `SwipeContainer` component**

Create `components/ui/SwipeContainer.tsx`:

```tsx
'use client'
import { useState, useRef, Children } from 'react'
import DotIndicator from './DotIndicator'

interface SwipeContainerProps {
  children: React.ReactNode
  className?: string
}

export default function SwipeContainer({ children, className = '' }: SwipeContainerProps) {
  const [active, setActive] = useState(0)
  const startX = useRef<number | null>(null)
  const count = Children.count(children)
  const slides = Children.toArray(children)

  function handleDragStart(x: number) {
    startX.current = x
  }

  function handleDragEnd(x: number) {
    if (startX.current === null) return
    const delta = x - startX.current
    if (Math.abs(delta) > 50) {
      if (delta < 0 && active < count - 1) setActive(active + 1)
      if (delta > 0 && active > 0) setActive(active - 1)
    }
    startX.current = null
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div
        className="flex-1 overflow-hidden relative"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${active * 100}%)`, width: `${count * 100}%` }}
        >
          {slides.map((slide, i) => (
            <div key={i} style={{ width: `${100 / count}%` }} className="h-full flex-shrink-0">
              {slide}
            </div>
          ))}
        </div>
      </div>
      <DotIndicator count={count} active={active} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/SwipeContainer.tsx components/ui/DotIndicator.tsx
git commit -m "feat: add SwipeContainer and DotIndicator UI components"
```

---

## Task 7: Spotify OAuth Flow

**Files:**
- Create: `app/api/auth/spotify/route.ts`
- Create: `app/api/auth/spotify/callback/route.ts`

> **Before starting:**
> 1. Go to https://developer.spotify.com/dashboard → Create an app
> 2. Set Redirect URI to `http://localhost:3000/api/auth/spotify/callback` (add your Vercel URL too when deploying)
> 3. Copy Client ID and Client Secret into `.env.local`

- [ ] **Step 1: Create Spotify OAuth initiation route**

Create `app/api/auth/spotify/route.ts`:

```ts
import { NextResponse } from 'next/server'

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
    scope: SCOPES,
  })
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
}
```

- [ ] **Step 2: Create Spotify OAuth callback route**

Create `app/api/auth/spotify/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { encryptToken } from '@/lib/cookies'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?spotify_error=1`)

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body,
  })

  if (!res.ok) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?spotify_error=1`)

  const json = await res.json()
  const token: OAuthToken = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  }

  const sealed = await encryptToken(token)
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?spotify_connected=1`)
  response.cookies.set('spotify_token', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
```

- [ ] **Step 3: Verify OAuth flow manually**

```bash
npm run dev
```

Open `http://localhost:3000/api/auth/spotify` in your browser. Expected: redirects to Spotify login → after approving, redirects back to `http://localhost:3000?spotify_connected=1`.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/spotify/route.ts app/api/auth/spotify/callback/route.ts
git commit -m "feat: add Spotify OAuth initiation and callback routes"
```

---

## Task 8: Spotify API Client + Proxy Routes

**Files:**
- Create: `lib/spotify.ts`
- Create: `lib/spotify.test.ts`
- Create: `app/api/spotify/now-playing/route.ts`
- Create: `app/api/spotify/control/route.ts`

- [ ] **Step 1: Write failing tests for Spotify lib**

Create `lib/spotify.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { refreshSpotifyToken, getNowPlaying } from './spotify'
import type { OAuthToken } from '@/types'

const makeToken = (expiresInMs: number): OAuthToken => ({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: Date.now() + expiresInMs,
})

describe('refreshSpotifyToken', () => {
  it('returns existing token if not expired', async () => {
    const token = makeToken(60_000)
    const result = await refreshSpotifyToken(token)
    expect(result.access_token).toBe('access')
  })

  it('fetches new token when expired', async () => {
    const token = makeToken(-1000)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new_access', expires_in: 3600 }),
    }) as any
    const result = await refreshSpotifyToken(token)
    expect(result.access_token).toBe('new_access')
  })
})

describe('getNowPlaying', () => {
  it('returns null when nothing is playing', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 204 }) as any
    const result = await getNowPlaying('token123')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/spotify.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `lib/spotify.ts`**

```ts
import type { OAuthToken, NowPlaying } from '@/types'

export async function refreshSpotifyToken(token: OAuthToken): Promise<OAuthToken> {
  if (Date.now() < token.expires_at - 60_000) return token

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh_token }),
  })

  if (!res.ok) throw new Error('Failed to refresh Spotify token')
  const json = await res.json()
  return {
    access_token: json.access_token,
    refresh_token: token.refresh_token,  // Spotify may not return a new refresh token
    expires_at: Date.now() + json.expires_in * 1000,
  }
}

export async function getNowPlaying(accessToken: string): Promise<NowPlaying | null> {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)

  const data = await res.json()
  if (!data?.item) return null

  return {
    isPlaying: data.is_playing,
    trackName: data.item.name,
    artistName: data.item.artists.map((a: any) => a.name).join(', '),
    albumName: data.item.album.name,
    albumArtUrl: data.item.album.images[0]?.url ?? '',
    progressMs: data.progress_ms,
    durationMs: data.item.duration_ms,
  }
}

export async function controlPlayback(
  accessToken: string,
  action: 'play' | 'pause' | 'next' | 'previous'
): Promise<void> {
  const endpoints: Record<string, { method: string; path: string }> = {
    play:     { method: 'PUT',  path: '/me/player/play' },
    pause:    { method: 'PUT',  path: '/me/player/pause' },
    next:     { method: 'POST', path: '/me/player/next' },
    previous: { method: 'POST', path: '/me/player/previous' },
  }
  const { method, path } = endpoints[action]
  await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/spotify.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Create `app/api/spotify/now-playing/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshSpotifyToken, getNowPlaying } from '@/lib/spotify'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('spotify_token')?.value
  if (!sealed) return NextResponse.json({ connected: false })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ connected: false })

  const refreshed = await refreshSpotifyToken(token)
  const nowPlaying = await getNowPlaying(refreshed.access_token)

  const res = NextResponse.json({ connected: true, nowPlaying })
  if (refreshed.access_token !== token.access_token) {
    res.cookies.set('spotify_token', await encryptToken(refreshed), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
    })
  }
  return res
}
```

- [ ] **Step 6: Create `app/api/spotify/control/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshSpotifyToken, controlPlayback } from '@/lib/spotify'
import type { OAuthToken } from '@/types'

export async function POST(req: NextRequest) {
  const sealed = req.cookies.get('spotify_token')?.value
  if (!sealed) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { action } = await req.json() as { action: 'play' | 'pause' | 'next' | 'previous' }
  const refreshed = await refreshSpotifyToken(token)
  await controlPlayback(refreshed.access_token, action)

  const res = NextResponse.json({ ok: true })
  if (refreshed.access_token !== token.access_token) {
    res.cookies.set('spotify_token', await encryptToken(refreshed), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
    })
  }
  return res
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/spotify.ts lib/spotify.test.ts app/api/spotify/now-playing/route.ts app/api/spotify/control/route.ts
git commit -m "feat: add Spotify API client and now-playing/control proxy routes"
```

---

## Task 9: Spotify Player Component + Music Tile (Spotify side)

**Files:**
- Create: `components/music/SpotifyPlayer.tsx`
- Create: `components/tiles/MusicTile.tsx` (partial — Spotify only for now)

- [ ] **Step 1: Create `SpotifyPlayer` component**

Create `components/music/SpotifyPlayer.tsx`:

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import type { NowPlaying } from '@/types'

export default function SpotifyPlayer() {
  const [state, setState] = useState<{ connected: boolean; nowPlaying: NowPlaying | null }>({
    connected: false, nowPlaying: null,
  })

  const poll = useCallback(async () => {
    const res = await fetch('/api/spotify/now-playing')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [poll])

  async function control(action: 'play' | 'pause' | 'next' | 'previous') {
    await fetch('/api/spotify/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setTimeout(poll, 500)
  }

  if (!state.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-white/50 text-sm">Spotify not connected</p>
        <a href="/api/auth/spotify"
          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-full transition-colors">
          Connect Spotify
        </a>
      </div>
    )
  }

  if (!state.nowPlaying) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-sm">Nothing playing on Spotify</p>
      </div>
    )
  }

  const { nowPlaying: np } = state
  const progress = (np.progressMs / np.durationMs) * 100

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-3 items-center">
        {np.albumArtUrl && (
          <img src={np.albumArtUrl} alt={np.albumName}
            className="w-16 h-16 rounded-lg object-cover shadow-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{np.trackName}</p>
          <p className="text-white/60 text-xs truncate">{np.artistName}</p>
          <p className="text-white/40 text-xs truncate">{np.albumName}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        {[
          { action: 'previous', label: '⏮', size: 'text-xl' },
          { action: np.isPlaying ? 'pause' : 'play', label: np.isPlaying ? '⏸' : '▶', size: 'text-2xl' },
          { action: 'next', label: '⏭', size: 'text-xl' },
        ].map(({ action, label, size }) => (
          <button key={action}
            onClick={() => control(action as any)}
            className={`${size} text-white/80 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `MusicTile` (Spotify-only stub)**

Create `components/tiles/MusicTile.tsx`:

```tsx
'use client'
import GlassTile from '@/components/ui/GlassTile'
import SpotifyPlayer from '@/components/music/SpotifyPlayer'

export default function MusicTile() {
  return (
    <GlassTile gradient="from-green-600 to-green-800" className="h-full">
      <p className="text-green-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Music</p>
      <div className="flex-1">
        <SpotifyPlayer />
      </div>
    </GlassTile>
  )
}
```

- [ ] **Step 3: Wire MusicTile into dashboard**

Edit `app/page.tsx`:

```tsx
// Add import:
import MusicTile from '@/components/tiles/MusicTile'

// Replace music placeholder:
<div style={{ gridColumn: '2 / 4', gridRow: '2' }}>
  <MusicTile />
</div>
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000`. Expected: music tile shows Spotify connect button (or now-playing if already connected and music is playing).

- [ ] **Step 5: Commit**

```bash
git add components/music/SpotifyPlayer.tsx components/tiles/MusicTile.tsx app/page.tsx
git commit -m "feat: add SpotifyPlayer component and MusicTile"
```

---

## Task 10: YouTube IFrame Player + Music Tile Swipe

**Files:**
- Create: `components/music/YouTubePlayer.tsx`
- Modify: `components/tiles/MusicTile.tsx`

- [ ] **Step 1: Create `YouTubePlayer` component**

Create `components/music/YouTubePlayer.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

interface YouTubePlayerProps {
  videoUrl: string | null
}

export default function YouTubePlayer({ videoUrl }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [apiReady, setApiReady] = useState(false)

  // Extract video/playlist ID from URL
  function parseUrl(url: string): { videoId?: string; listId?: string } {
    try {
      const u = new URL(url)
      const videoId = u.searchParams.get('v') ?? undefined
      const listId = u.searchParams.get('list') ?? undefined
      return { videoId, listId }
    } catch {
      return {}
    }
  }

  useEffect(() => {
    if (window.YT) { setApiReady(true); return }
    window.onYouTubeIframeAPIReady = () => setApiReady(true)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!apiReady || !videoUrl || !containerRef.current) return
    const { videoId, listId } = parseUrl(videoUrl)
    if (!videoId && !listId) return

    if (playerRef.current) playerRef.current.destroy()

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '100%',
      width: '100%',
      videoId: videoId ?? '',
      playerVars: { listType: listId ? 'playlist' : undefined, list: listId, autoplay: 0 },
      events: {
        onStateChange: (e: any) => setIsPlaying(e.data === window.YT.PlayerState.PLAYING),
      },
    })
  }, [apiReady, videoUrl])

  function toggle() { isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo() }
  function next() { playerRef.current?.nextVideo() }
  function prev() { playerRef.current?.previousVideo() }

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-sm text-center px-4">
          Add a YouTube URL in settings ⚙
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 rounded-lg overflow-hidden" ref={containerRef} />
      <div className="flex items-center justify-center gap-6">
        {[
          { fn: prev,   label: '⏮', size: 'text-xl' },
          { fn: toggle, label: isPlaying ? '⏸' : '▶', size: 'text-2xl' },
          { fn: next,   label: '⏭', size: 'text-xl' },
        ].map(({ fn, label, size }, i) => (
          <button key={i} onClick={fn}
            className={`${size} text-white/80 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `MusicTile` to swipe between Spotify and YouTube**

Replace `components/tiles/MusicTile.tsx`:

```tsx
'use client'
import GlassTile from '@/components/ui/GlassTile'
import SwipeContainer from '@/components/ui/SwipeContainer'
import SpotifyPlayer from '@/components/music/SpotifyPlayer'
import YouTubePlayer from '@/components/music/YouTubePlayer'
import { useState } from 'react'

interface MusicTileProps {
  youtubeUrl: string | null
}

export default function MusicTile({ youtubeUrl }: MusicTileProps) {
  return (
    <GlassTile gradient="from-green-600 to-green-800" className="h-full flex flex-col">
      <p className="text-green-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Music</p>
      <div className="flex-1 min-h-0">
        <SwipeContainer className="h-full">
          <SpotifyPlayer />
          <YouTubePlayer videoUrl={youtubeUrl} />
        </SwipeContainer>
      </div>
    </GlassTile>
  )
}
```

- [ ] **Step 3: Update dashboard to pass youtubeUrl prop**

Edit `app/page.tsx` — add state for YouTube URL and pass to MusicTile:

```tsx
'use client'
import { useState } from 'react'
// ... other imports
import MusicTile from '@/components/tiles/MusicTile'

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)

  return (
    <main ...>
      {/* ... other tiles ... */}
      <div style={{ gridColumn: '2 / 4', gridRow: '2' }}>
        <MusicTile youtubeUrl={youtubeUrl} />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000`. Expected: music tile shows Spotify on first swipe position, YouTube (with "Add URL in settings" message) on second swipe. Dots show at bottom. Swipe or drag between them.

- [ ] **Step 5: Commit**

```bash
git add components/music/YouTubePlayer.tsx components/tiles/MusicTile.tsx app/page.tsx
git commit -m "feat: add YouTube IFrame player and swipeable MusicTile"
```

---

## Task 11: Google Calendar OAuth + API Route

**Files:**
- Create: `lib/google-calendar.ts`
- Create: `lib/google-calendar.test.ts`
- Create: `app/api/auth/google/route.ts`
- Create: `app/api/auth/google/callback/route.ts`
- Create: `app/api/calendar/google/route.ts`

> **Before starting:**
> 1. Go to https://console.cloud.google.com → Create project → Enable "Google Calendar API"
> 2. Create OAuth 2.0 credentials (Web application type)
> 3. Add `http://localhost:3000/api/auth/google/callback` as authorized redirect URI
> 4. Copy Client ID and Client Secret to `.env.local`

- [ ] **Step 1: Write failing test for Google Calendar lib**

Create `lib/google-calendar.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { fetchUpcomingEvents } from './google-calendar'

describe('fetchUpcomingEvents', () => {
  it('maps Google API response to CalendarEvent shape', async () => {
    const mockEvents = {
      items: [
        {
          id: '1',
          summary: 'Team Standup',
          start: { dateTime: '2026-06-12T11:00:00Z' },
          end:   { dateTime: '2026-06-12T11:30:00Z' },
        },
        {
          id: '2',
          summary: 'All Day Event',
          start: { date: '2026-06-13' },
          end:   { date: '2026-06-14' },
        },
      ],
    }
    // Mock the googleapis call
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: vi.fn().mockReturnValue({ setCredentials: vi.fn() }) },
        calendar: vi.fn().mockReturnValue({
          events: { list: vi.fn().mockResolvedValue({ data: mockEvents }) },
        }),
      },
    }))

    const { fetchUpcomingEvents: fn } = await import('./google-calendar')
    const result = await fn('access_token_123')
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Team Standup')
    expect(result[1].allDay).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/google-calendar.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `lib/google-calendar.ts`**

```ts
import { google } from 'googleapis'
import type { CalendarEvent } from '@/types'

export async function fetchUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth })
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (data.items ?? []).map((e) => ({
    id: e.id ?? '',
    title: e.summary ?? '(No title)',
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end:   e.end?.dateTime ?? e.end?.date ?? '',
    allDay: !e.start?.dateTime,
  }))
}
```

- [ ] **Step 4: Create Google OAuth initiation route**

Create `app/api/auth/google/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )
}

export async function GET() {
  const auth = getOAuth2Client()
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
  })
  return NextResponse.redirect(url)
}
```

- [ ] **Step 5: Create Google OAuth callback route**

Create `app/api/auth/google/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encryptToken } from '@/lib/cookies'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_error=1`)

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )

  const { tokens } = await auth.getToken(code)
  if (!tokens.access_token) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_error=1`)

  const token: OAuthToken = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? '',
    expires_at: tokens.expiry_date ?? Date.now() + 3600_000,
  }

  const sealed = await encryptToken(token)
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_connected=1`)
  response.cookies.set('google_token', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
```

- [ ] **Step 6: Create Google Calendar API route**

Create `app/api/calendar/google/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { fetchUpcomingEvents } from '@/lib/google-calendar'
import { google } from 'googleapis'
import type { OAuthToken } from '@/types'

async function refreshGoogleToken(token: OAuthToken): Promise<OAuthToken> {
  if (Date.now() < token.expires_at - 60_000) return token

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: token.refresh_token })
  const { credentials } = await auth.refreshAccessToken()

  return {
    access_token: credentials.access_token!,
    refresh_token: token.refresh_token,
    expires_at: credentials.expiry_date ?? Date.now() + 3600_000,
  }
}

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('google_token')?.value
  if (!sealed) return NextResponse.json({ connected: false, events: [] })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ connected: false, events: [] })

  const refreshed = await refreshGoogleToken(token)
  const events = await fetchUpcomingEvents(refreshed.access_token)

  const res = NextResponse.json({ connected: true, events })
  if (refreshed.access_token !== token.access_token) {
    res.cookies.set('google_token', await encryptToken(refreshed), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
    })
  }
  return res
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/google-calendar.ts lib/google-calendar.test.ts \
  app/api/auth/google/route.ts app/api/auth/google/callback/route.ts \
  app/api/calendar/google/route.ts
git commit -m "feat: add Google Calendar OAuth and events API route"
```

---

## Task 12: Apple CalDAV API Route

**Files:**
- Create: `lib/apple-caldav.ts`
- Create: `lib/apple-caldav.test.ts`
- Create: `app/api/calendar/apple/route.ts`

- [ ] **Step 1: Write failing test for CalDAV lib**

Create `lib/apple-caldav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseCalDAVEvents } from './apple-caldav'

describe('parseCalDAVEvents', () => {
  it('parses a basic VCALENDAR response', () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:abc123
SUMMARY:Gym Session
DTSTART:20260612T180000Z
DTEND:20260612T190000Z
END:VEVENT
END:VCALENDAR`

    const events = parseCalDAVEvents(ical)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Gym Session')
    expect(events[0].allDay).toBe(false)
  })

  it('handles all-day events (DATE format)', () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:xyz789
SUMMARY:Birthday
DTSTART;VALUE=DATE:20260613
DTEND;VALUE=DATE:20260614
END:VEVENT
END:VCALENDAR`

    const events = parseCalDAVEvents(ical)
    expect(events[0].allDay).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/apple-caldav.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `lib/apple-caldav.ts`**

```ts
import type { CalendarEvent } from '@/types'

// Minimal iCal parser — handles only what we need (VEVENT blocks)
export function parseCalDAVEvents(icalText: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const veventBlocks = icalText.split('BEGIN:VEVENT').slice(1)

  for (const block of veventBlocks) {
    const get = (key: string) => {
      const match = block.match(new RegExp(`^${key}[^:]*:(.+)`, 'm'))
      return match?.[1]?.trim() ?? ''
    }

    const uid = get('UID')
    const summary = get('SUMMARY') || '(No title)'
    const dtstart = get('DTSTART')
    const dtend = get('DTEND')
    const allDay = dtstart.length === 8  // DATE format: YYYYMMDD

    events.push({
      id: uid,
      title: summary,
      start: allDay ? dtstart : new Date(
        dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')
      ).toISOString(),
      end: allDay ? dtend : new Date(
        dtend.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')
      ).toISOString(),
      allDay,
    })
  }

  // Sort by start time, return next 5 upcoming
  const now = new Date()
  return events
    .filter(e => new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5)
}

export async function fetchAppleCalendarEvents(
  email: string,
  appPassword: string
): Promise<CalendarEvent[]> {
  const auth = Buffer.from(`${email}:${appPassword}`).toString('base64')
  const now = new Date().toISOString()
  const later = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // CalDAV REPORT request for events in the next 7 days
  const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${now.replace(/[-:]/g, '').split('.')[0]}Z" end="${later.replace(/[-:]/g, '').split('.')[0]}Z"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

  const res = await fetch('https://caldav.icloud.com/', {
    method: 'REPORT',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml',
      Depth: '1',
    },
    body,
  })

  if (!res.ok) throw new Error(`CalDAV error: ${res.status}`)
  const text = await res.text()

  // Extract iCal data from XML multi-status response
  const icalBlocks = [...text.matchAll(/<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/g)]
    .map(m => m[1])
    .join('\n')

  return parseCalDAVEvents(icalBlocks)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/apple-caldav.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Create `app/api/calendar/apple/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken } from '@/lib/cookies'
import { fetchAppleCalendarEvents } from '@/lib/apple-caldav'
import type { AppleCredentials } from '@/types'

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('apple_credentials')?.value
  if (!sealed) return NextResponse.json({ connected: false, events: [] })

  const creds = await decryptToken<AppleCredentials>(sealed)
  if (!creds) return NextResponse.json({ connected: false, events: [] })

  try {
    const events = await fetchAppleCalendarEvents(creds.email, creds.app_password)
    return NextResponse.json({ connected: true, events })
  } catch {
    return NextResponse.json({ connected: false, events: [], error: 'CalDAV fetch failed' })
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/apple-caldav.ts lib/apple-caldav.test.ts app/api/calendar/apple/route.ts
git commit -m "feat: add Apple CalDAV client and calendar API route"
```

---

## Task 13: Calendar Components + CalendarTile

**Files:**
- Create: `components/calendar/GoogleCalendar.tsx`
- Create: `components/calendar/AppleCalendar.tsx`
- Create: `components/tiles/CalendarTile.tsx`

- [ ] **Step 1: Create `GoogleCalendar` component**

Create `components/calendar/GoogleCalendar.tsx`:

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import type { CalendarEvent } from '@/types'

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function GoogleCalendar() {
  const [state, setState] = useState<{ connected: boolean; events: CalendarEvent[] }>({
    connected: false, events: [],
  })

  const load = useCallback(async () => {
    const res = await fetch('/api/calendar/google')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (!state.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-white/50 text-xs">Google Calendar</p>
        <a href="/api/auth/google"
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-full transition-colors">
          Connect Google
        </a>
      </div>
    )
  }

  if (state.events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/40 text-xs">No upcoming events</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <p className="text-emerald-200/60 text-xs font-semibold tracking-widest uppercase">Google</p>
      {state.events.map((event) => (
        <div key={event.id} className="flex gap-2 items-start">
          <span className="text-emerald-300 text-xs font-medium w-16 shrink-0 mt-0.5">
            {formatEventTime(event)}
          </span>
          <span className="text-white text-xs truncate">{event.title}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `AppleCalendar` component**

Create `components/calendar/AppleCalendar.tsx`:

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import type { CalendarEvent } from '@/types'

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function AppleCalendar() {
  const [state, setState] = useState<{ connected: boolean; events: CalendarEvent[] }>({
    connected: false, events: [],
  })

  const load = useCallback(async () => {
    const res = await fetch('/api/calendar/apple')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (!state.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-white/50 text-xs">Apple Calendar</p>
        <p className="text-white/30 text-xs text-center px-2">Set up in Settings ⚙</p>
      </div>
    )
  }

  if (state.events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/40 text-xs">No upcoming events</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <p className="text-rose-200/60 text-xs font-semibold tracking-widest uppercase">Apple</p>
      {state.events.map((event) => (
        <div key={event.id} className="flex gap-2 items-start">
          <span className="text-rose-300 text-xs font-medium w-16 shrink-0 mt-0.5">
            {formatEventTime(event)}
          </span>
          <span className="text-white text-xs truncate">{event.title}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `CalendarTile`**

Create `components/tiles/CalendarTile.tsx`:

```tsx
'use client'
import GlassTile from '@/components/ui/GlassTile'
import SwipeContainer from '@/components/ui/SwipeContainer'
import GoogleCalendar from '@/components/calendar/GoogleCalendar'
import AppleCalendar from '@/components/calendar/AppleCalendar'

export default function CalendarTile() {
  return (
    <GlassTile gradient="from-emerald-500 to-teal-600" className="h-full flex flex-col">
      <p className="text-emerald-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Calendar</p>
      <div className="flex-1 min-h-0">
        <SwipeContainer className="h-full">
          <GoogleCalendar />
          <AppleCalendar />
        </SwipeContainer>
      </div>
    </GlassTile>
  )
}
```

- [ ] **Step 4: Wire CalendarTile into dashboard**

Edit `app/page.tsx`:

```tsx
// Add import:
import CalendarTile from '@/components/tiles/CalendarTile'

// Replace calendar placeholder:
<div style={{ gridColumn: '1', gridRow: '2' }}>
  <CalendarTile />
</div>
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000`. Expected: calendar tile shows Google connect button (swipe left to see Apple calendar placeholder). Both swipe with dot indicators.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/GoogleCalendar.tsx components/calendar/AppleCalendar.tsx \
  components/tiles/CalendarTile.tsx app/page.tsx
git commit -m "feat: add calendar components and swipeable CalendarTile"
```

---

## Task 14: Settings Panel

**Files:**
- Create: `components/settings/SettingsPanel.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `SettingsPanel` component**

Create `components/settings/SettingsPanel.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface SettingsPanelProps {
  youtubeUrl: string | null
  onYoutubeUrlChange: (url: string) => void
  weatherLocation: { lat: number; lon: number } | null
  onWeatherLocationChange: (loc: { lat: number; lon: number } | null) => void
}

export default function SettingsPanel({
  youtubeUrl,
  onYoutubeUrlChange,
  weatherLocation,
  onWeatherLocationChange,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const [ytInput, setYtInput] = useState(youtubeUrl ?? '')
  const [appleEmail, setAppleEmail] = useState('')
  const [applePassword, setApplePassword] = useState('')
  const [weatherCity, setWeatherCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [appleStatus, setAppleStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function saveAppleCredentials() {
    setAppleStatus('saving')
    const res = await fetch('/api/calendar/apple/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: appleEmail, app_password: applePassword }),
    })
    setAppleStatus(res.ok ? 'saved' : 'error')
    if (res.ok) { setAppleEmail(''); setApplePassword('') }
  }

  async function resolveWeatherCity() {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(weatherCity)}&format=json&limit=1`
    )
    const [result] = await res.json()
    if (result) {
      onWeatherLocationChange({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) })
      setWeatherCity('')
    }
  }

  return (
    <>
      {/* Gear button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center
          bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors"
        aria-label="Settings"
      >
        ⚙
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-t-2xl w-full max-w-2xl p-6 pb-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Settings</h2>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white text-2xl">×</button>
            </div>

            {/* Spotify */}
            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Spotify</h3>
              <div className="flex gap-3">
                <a href="/api/auth/spotify"
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors">
                  Reconnect Spotify
                </a>
              </div>
            </section>

            {/* Google Calendar */}
            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Google Calendar</h3>
              <a href="/api/auth/google"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                Reconnect Google
              </a>
            </section>

            {/* Apple Calendar */}
            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Apple Calendar</h3>
              <p className="text-white/40 text-xs">
                Generate an app-specific password at appleid.apple.com → Sign-In and Security → App-Specific Passwords
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="email" placeholder="Apple ID email" value={appleEmail}
                  onChange={(e) => setAppleEmail(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                />
                <input
                  type="password" placeholder="App-specific password" value={applePassword}
                  onChange={(e) => setApplePassword(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                />
                <button onClick={saveAppleCredentials} disabled={!appleEmail || !applePassword}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors w-fit">
                  {appleStatus === 'saving' ? 'Saving...' : appleStatus === 'saved' ? 'Saved ✓' : appleStatus === 'error' ? 'Error — check credentials' : 'Save Apple Credentials'}
                </button>
              </div>
            </section>

            {/* YouTube */}
            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">YouTube</h3>
              <div className="flex gap-2">
                <input
                  type="url" placeholder="YouTube video or playlist URL" value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                />
                <button onClick={() => { onYoutubeUrlChange(ytInput); setOpen(false) }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors">
                  Set
                </button>
              </div>
            </section>

            {/* Weather location */}
            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Weather Location</h3>
              <div className="flex gap-2">
                <input
                  type="text" placeholder="City name (leave blank for GPS)" value={weatherCity}
                  onChange={(e) => setWeatherCity(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                />
                <button onClick={resolveWeatherCity} disabled={!weatherCity}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors">
                  Set
                </button>
                {weatherLocation && (
                  <button onClick={() => onWeatherLocationChange(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
                    Use GPS
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Add Apple credentials save endpoint**

Create `app/api/calendar/apple/credentials/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { encryptToken } from '@/lib/cookies'
import { fetchAppleCalendarEvents } from '@/lib/apple-caldav'
import type { AppleCredentials } from '@/types'

export async function POST(req: NextRequest) {
  const { email, app_password } = await req.json() as AppleCredentials

  // Verify credentials work before saving
  try {
    await fetchAppleCalendarEvents(email, app_password)
  } catch {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const sealed = await encryptToken({ email, app_password } satisfies AppleCredentials)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('apple_credentials', sealed, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  return response
}
```

- [ ] **Step 3: Wire SettingsPanel into dashboard**

Replace `app/page.tsx` with the final assembled version:

```tsx
'use client'
import { useState } from 'react'
import ClockTile from '@/components/tiles/ClockTile'
import WeatherTile from '@/components/tiles/WeatherTile'
import CalendarTile from '@/components/tiles/CalendarTile'
import MusicTile from '@/components/tiles/MusicTile'
import SettingsPanel from '@/components/settings/SettingsPanel'

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lon: number } | null>(null)

  return (
    <>
      <main
        className="aurora-bg w-screen h-screen p-4 grid gap-3"
        style={{ gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }}
      >
        <div style={{ gridColumn: '1 / 3', gridRow: '1' }}>
          <WeatherTile locationOverride={weatherLocation ?? undefined} />
        </div>

        <div style={{ gridColumn: '3', gridRow: '1' }}>
          <ClockTile />
        </div>

        <div style={{ gridColumn: '1', gridRow: '2' }}>
          <CalendarTile />
        </div>

        <div style={{ gridColumn: '2 / 4', gridRow: '2' }}>
          <MusicTile youtubeUrl={youtubeUrl} />
        </div>
      </main>

      <SettingsPanel
        youtubeUrl={youtubeUrl}
        onYoutubeUrlChange={setYoutubeUrl}
        weatherLocation={weatherLocation}
        onWeatherLocationChange={setWeatherLocation}
      />
    </>
  )
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000`. Expected:
- Gear icon (⚙) visible top-right
- Clicking it opens the slide-up settings panel
- Panel has sections for Spotify, Google, Apple, YouTube, Weather
- Clicking × or outside closes it

- [ ] **Step 5: Commit**

```bash
git add components/settings/SettingsPanel.tsx app/api/calendar/apple/credentials/route.ts app/page.tsx
git commit -m "feat: add settings panel with all service configuration options"
```

---

## Task 15: Deploy to Vercel

**Files:**
- Create: `.gitignore` (verify)

- [ ] **Step 1: Run all tests to confirm clean state**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Create a GitHub repository and push**

```bash
git remote add origin https://github.com/<your-username>/ipad-dashboard.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel
```

Follow prompts: link to your Vercel account, create new project, accept defaults. Note the preview URL.

- [ ] **Step 4: Add environment variables in Vercel**

Go to your Vercel project → Settings → Environment Variables. Add all variables from `.env.example`:

```
SPOTIFY_CLIENT_ID         = <your value>
SPOTIFY_CLIENT_SECRET     = <your value>
GOOGLE_CLIENT_ID          = <your value>
GOOGLE_CLIENT_SECRET      = <your value>
OPENWEATHER_API_KEY       = <your value>
SESSION_SECRET            = <your value>
NEXT_PUBLIC_APP_URL       = https://<your-vercel-domain>.vercel.app
```

- [ ] **Step 5: Add Vercel domain to OAuth app allowed redirect URIs**

**Spotify Dashboard:** Add `https://<your-vercel-domain>.vercel.app/api/auth/spotify/callback`

**Google Cloud Console:** Add `https://<your-vercel-domain>.vercel.app/api/auth/google/callback` to authorized redirect URIs.

- [ ] **Step 6: Deploy to production**

```bash
npx vercel --prod
```

- [ ] **Step 7: Verify on iPad**

Open the production URL in Safari on your iPad. Expected: full-screen dashboard with aurora background, all four tiles visible. Test the OAuth flows for Spotify and Google Calendar. Add Apple credentials in Settings. Test swipe gestures with your finger.

- [ ] **Step 8: Optional — Add to iPad home screen**

In Safari: Share → Add to Home Screen. The dashboard becomes a full-screen web app with no browser chrome.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: complete iPad dashboard with all integrations"
git push
```

---

## Spec Coverage Checklist

| Requirement | Task |
|---|---|
| Bento Grid layout | Task 3 |
| Aurora Glass visual style | Task 3 |
| Weather tile with geolocation + forecast | Task 5 |
| Clock/Date tile | Task 4 |
| Google Calendar OAuth + events | Task 11 + 13 |
| Apple Calendar CalDAV + events | Task 12 + 13 |
| Calendar swipe Google ↔ Apple | Task 13 |
| Spotify OAuth | Task 7 |
| Spotify now-playing + controls | Task 8 + 9 |
| YouTube IFrame player + controls | Task 10 |
| Music swipe Spotify ↔ YouTube | Task 10 |
| Settings panel (all services) | Task 14 |
| YouTube URL in settings | Task 14 |
| Weather location override | Task 14 |
| Apple credentials in settings | Task 14 |
| First-run connect buttons | Tasks 9, 11, 13 |
| Tokens in encrypted httpOnly cookies | Task 2 |
| All secrets server-side | Tasks 5, 7, 8, 11, 12 |
| Vercel deployment | Task 15 |
| iPad-optimized viewport | Task 3 |
| Add to home screen PWA meta | Task 3 |
