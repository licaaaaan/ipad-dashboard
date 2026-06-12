# iPad Dashboard — Design Spec
**Date:** 2026-06-12

## Overview

A full-screen iPad dashboard web app displaying live data across four widget tiles: weather, clock/date, calendar events, and a music player. Deployed on Vercel as a Next.js app. Designed to be pinned as a browser tab or iOS home screen web app.

---

## Architecture

**Stack:** Next.js 14 (App Router), Tailwind CSS, deployed on Vercel.

**Pages / Routes:**
- `/` — full-screen dashboard UI
- `/api/auth/spotify` — Spotify OAuth initiation (redirects to Spotify)
- `/api/auth/spotify/callback` — Spotify OAuth callback (exchanges code for tokens)
- `/api/auth/google` — Google Calendar OAuth initiation (redirects to Google)
- `/api/auth/google/callback` — Google OAuth callback (exchanges code for tokens)
- `/api/spotify/now-playing` — proxies Spotify currently-playing endpoint
- `/api/spotify/control` — proxies Spotify playback control (play/pause/skip)
- `/api/calendar/google` — fetches upcoming Google Calendar events
- `/api/calendar/apple` — proxies iCloud CalDAV requests
- `/api/weather` — fetches from OpenWeatherMap (keeps API key server-side)

**Environment variables (stored in Vercel, never in client code):**
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENWEATHER_API_KEY`
- `SESSION_SECRET` (32-byte random string for encrypting httpOnly cookies)

**Token storage:** Spotify and Google OAuth access + refresh tokens stored in encrypted httpOnly cookies. Apple iCloud app-specific password stored in an encrypted cookie after user entry.

---

## Layout

Bento Grid — 3-column asymmetric layout, full-screen, no scrolling. Optimized for iPad (1024px+). Degrades to 2-column on smaller screens.

```
┌─────────────────────┬──────────┐
│                     │  CLOCK   │
│      WEATHER        │──────────│
│                     │  DATE    │
├──────────┬──────────┴──────────┤
│          │                     │
│ CALENDAR │    MUSIC PLAYER     │
│          │                     │
└──────────┴─────────────────────┘
```

**Background:** Deep dark base (`#020617`) with subtle animated aurora gradient effect behind all tiles.

---

## Visual Style — Aurora Glass

Each tile: vivid semi-transparent gradient overlay on a dark base, subtle white/light border (`rgba(255,255,255,0.15)`), backdrop blur.

| Tile | Gradient Colors |
|------|----------------|
| Weather | Purple → Cyan (`#7c3aed` → `#06b6d4`) |
| Clock/Date | Amber/Yellow (`#fbbf24` → `#f59e0b`) |
| Google Calendar | Emerald green (`#10b981` → `#059669`) |
| Apple Calendar | Rose/Red (`#ef4444` → `#ec4899`) |
| Music (Spotify) | Green (`#16a34a` → `#15803d`) |
| Music (YouTube) | Red/Orange (`#dc2626` → `#ea580c`) |

---

## Widgets

### Weather Tile
- Displays: current temperature, condition icon, condition text, city name, 3-day mini forecast with icons
- Data source: OpenWeatherMap API via `/api/weather`
- Location: device geolocation on load; manual override via Settings panel
- Refresh: every 10 minutes

### Clock / Date Tile
- Displays: live digital clock (updates every second), full date (e.g. "Thursday, June 12")
- Data source: client-side JS (`Date`)
- No API calls needed

### Calendar Tile
- Displays: next 3–5 upcoming events with event name and time
- Two sources, swipeable left/right with dot indicators:
  - **Google Calendar** — fetched via `/api/calendar/google` using Google Calendar API
  - **Apple Calendar** — fetched via `/api/calendar/apple` using iCloud CalDAV
- Refresh: every 5 minutes
- First-run: "Connect Google" button; Apple Calendar prompts for iCloud app-specific password in a modal

### Music Player Tile
- Two sources, swipeable left/right with dot indicators:

**Spotify sub-view:**
- Displays: album art, track name, artist name, progress bar
- Controls: previous ⏮, play/pause ⏸, next ⏭
- Data source: `/api/spotify/now-playing` polled every 5 seconds
- Controls POST to `/api/spotify/control`
- First-run: "Connect Spotify" button triggers OAuth flow

**YouTube IFrame sub-view:**
- Displays: embedded YouTube IFrame player
- Controls: standard YouTube IFrame API controls (play/pause/skip for playlists)
- User pastes a YouTube video or playlist URL via Settings panel
- No API key required; fully client-side via `postMessage`

---

## Data Flow & Auth

**Spotify OAuth:**
1. User clicks "Connect Spotify" → `/api/auth/spotify` → Spotify consent screen
2. Spotify redirects to `/api/auth/spotify/callback` → server exchanges code for tokens → stores in encrypted httpOnly cookie
3. Server auto-refreshes token when expired

**Google Calendar OAuth:**
1. User clicks "Connect Google" → `/api/auth/google` → Google consent screen
2. Google redirects to `/api/auth/google/callback` → same cookie-based token storage as Spotify

**Apple Calendar (iCloud CalDAV):**
- No OAuth; uses an iCloud app-specific password generated at appleid.apple.com
- User enters Apple ID email + app-specific password once in Settings modal
- Stored in encrypted cookie; server proxies CalDAV calls to `caldav.icloud.com`

**Weather:**
- No user auth; server calls OpenWeatherMap with API key from env var

---

## Interactions

- **Swipe gesture** on Calendar and Music tiles to switch between sources (touch + mouse drag)
- **Dot indicators** below swipeable tiles show active source
- **Hover/press**: subtle scale + glow pulse on all tiles
- **Music controls**: minimum 44px tap targets for comfortable iPad thumb use
- **Settings panel**: gear icon (⚙) in top corner opens a slide-up modal with:
  - Connect/disconnect Spotify and Google
  - Enter/update Apple iCloud credentials
  - Paste YouTube playlist/video URL
  - Weather location override (city name or coordinates)

---

## First-Run Experience

Tiles requiring auth show a centered connect button until configured. Once all services are connected the dashboard shows live data. The app is designed to stay open indefinitely as a pinned tab — no page reloads required.

---

## Out of Scope

- User accounts or multi-user support
- Push notifications
- Mobile (non-iPad) layout optimization
- Offline mode / service worker caching
