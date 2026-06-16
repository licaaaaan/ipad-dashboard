# Dashboard New Tiles Design

**Date:** 2026-06-16  
**Status:** Approved

## Overview

Add three new tiles to the iPad dashboard: Google Tasks (with check-off), Bing Photo of the Day, and RSS News. Reorganise the grid to accommodate all six tiles cleanly on an iPad Air 2 in landscape.

---

## 1. Grid Layout

File: `app/page.tsx`

Switch from a 2-column 2-row grid to a **3-column 3-row** grid:

```
gridTemplateColumns: '0.85fr 1.8fr 1fr'
gridTemplateRows:    '1fr 1fr 0.42fr'
```

| Position | Tile | Notes |
|---|---|---|
| col 1, row 1 | ClockWeatherTile | Unchanged, compact |
| col 1, row 2 | PhotoTile | New, compact |
| col 2, row 1 | TasksTile | New, spacious |
| col 2, row 2 | CalendarTile | Moved here from col 1 row 2 |
| col 3, rows 1–3 | MusicTile | Unchanged, full height |
| col 1–2, row 3 | NewsTile | New, short horizontal strip |

---

## 2. New Components

### `components/tiles/PhotoTile.tsx`
- Fetches `/api/photo/bing` on mount, refreshes every 60 minutes
- Displays the Bing daily image as a full-bleed background (`object-cover`)
- Photo title overlaid as a small caption at the bottom
- Shows a skeleton placeholder while loading
- Gradient: amber/yellow (`from-amber-200 to-yellow-200`)

### `components/tiles/TasksTile.tsx`
- Fetches `GET /api/tasks/google` every 60 seconds
- Shows task lists; tasks rendered with a checkbox
- Tapping a checkbox calls `PATCH /api/tasks/google` with `{ taskListId, taskId }`
- Optimistic UI: marks task visually complete immediately, re-fetches on response
- If Google not connected: shows "Connect Google" prompt (same as CalendarTile pattern)
- Gradient: purple (`from-purple-200 to-violet-200`)

### `components/tiles/NewsTile.tsx`
- Reads feed URLs from `localStorage` key `news_feeds` on mount
- Fetches `GET /api/news?feeds=<url1>,<url2>,...`
- Displays a horizontally scrollable list of headlines: title + source name
- Clicking a headline opens the link in a new tab
- Auto-refreshes every 15 minutes
- Gradient: green (`from-emerald-200 to-teal-200`)

---

## 3. API Routes

### `GET /api/photo/bing`
- Proxies `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1`
- Extracts `images[0].url` (prepend `https://www.bing.com`) and `images[0].copyright`
- Returns `{ url: string, title: string }`
- Response header: `Cache-Control: public, max-age=3600`
- No authentication required

### `GET /api/tasks/google`
- Reads `google_token` cookie, refreshes if needed (same pattern as `/api/calendar/google`)
- Calls Google Tasks API: lists all task lists, then fetches incomplete tasks per list
- Returns `{ connected: boolean, taskLists: Array<{ id, title, tasks: Array<{ id, title, due?, notes? }> }> }`

### `PATCH /api/tasks/google`
- Body: `{ taskListId: string, taskId: string }`
- Reads + refreshes `google_token` cookie
- Calls `PATCH tasks/v1/lists/{taskListId}/tasks/{taskId}` with `{ status: "completed" }`
- Returns `{ ok: boolean }`

### `GET /api/news`
- Query param: `?feeds=url1,url2,...` (comma-separated, URL-encoded)
- Server-side fetches each RSS URL in parallel
- Parses XML: extracts `<item>` elements → `title`, `link`, `pubDate`, infers source from feed URL
- Returns up to 8 items per feed, merged and sorted by `pubDate` descending
- Returns `{ items: Array<{ title, link, source, pubDate }> }`
- No authentication required

---

## 4. Google OAuth Scope Update

File: `app/api/auth/google/route.ts`

Add `https://www.googleapis.com/auth/tasks` to the existing OAuth scopes array.

**Action required after deploy:** disconnect and reconnect Google in the Settings panel once to obtain a token that includes the Tasks scope. The Calendar integration continues working with the new token.

---

## 5. News Settings

### SettingsPanel addition (`components/settings/SettingsPanel.tsx`)
- New "News Feeds" section at the bottom of the settings panel
- Lists current feed URLs, each with a remove (×) button
- "Add feed" text input + button to append a URL to the list
- Persists to `localStorage` key `news_feeds` (JSON array of strings) on every change

### Default feeds
If `news_feeds` is absent or empty, both `NewsTile` and `SettingsPanel` fall back to:
```
https://feeds.bbci.co.uk/news/rss.xml      (BBC Top Stories)
https://feeds.reuters.com/reuters/topNews   (Reuters Top News)
```

---

## Types to add (`types/index.ts`)

```ts
export interface Task {
  id: string
  title: string
  due?: string
  notes?: string
}

export interface TaskList {
  id: string
  title: string
  tasks: Task[]
}

export interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
}

export interface BingPhoto {
  url: string
  title: string
}
```

---

## Out of Scope

- Adding or editing tasks (check-off only)
- Configuring the photo source (Bing only)
- Push notifications for tasks or news
- Pagination for tasks or news items
