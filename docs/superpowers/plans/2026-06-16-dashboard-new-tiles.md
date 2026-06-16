# Dashboard New Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Tasks (with check-off), Bing Photo of the Day, and RSS News tiles to the iPad dashboard, with a new 3-column grid layout.

**Architecture:** Three new API routes follow the existing Next.js route-handler pattern. A shared `lib/google-auth.ts` helper avoids duplicating the token-refresh logic. RSS parsing lives in `lib/news.ts` using `fast-xml-parser`. UI components wrap the existing `GlassTile` (except `PhotoTile`, which is full-bleed and renders its own glass shell).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Vitest, `fast-xml-parser`, `googleapis`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/google-auth.ts` | Shared Google token refresh helper |
| Create | `lib/google-tasks.ts` | Fetch task lists + mark task complete |
| Create | `lib/google-tasks.test.ts` | Unit tests for google-tasks lib |
| Create | `lib/news.ts` | Fetch + parse RSS feeds |
| Create | `lib/news.test.ts` | Unit tests for news lib |
| Create | `app/api/tasks/google/route.ts` | GET task lists, PATCH to complete |
| Create | `app/api/news/route.ts` | GET RSS headlines |
| Create | `app/api/photo/bing/route.ts` | GET Bing daily photo |
| Create | `components/tiles/TasksTile.tsx` | Tasks tile UI |
| Create | `components/tiles/NewsTile.tsx` | News tile UI |
| Create | `components/tiles/PhotoTile.tsx` | Full-bleed photo tile UI |
| Modify | `types/index.ts` | Add Task, TaskList, NewsItem, BingPhoto types |
| Modify | `lib/google-auth.ts` | (created above) |
| Modify | `app/api/auth/google/route.ts` | Add Tasks OAuth scope |
| Modify | `app/api/calendar/google/route.ts` | Import refreshGoogleToken from lib |
| Modify | `components/settings/SettingsPanel.tsx` | Add News Feeds section |
| Modify | `app/page.tsx` | New 3-column 3-row grid |

---

## Task 1: Add new types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add the four new interfaces** to the end of `types/index.ts`:

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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Task, TaskList, NewsItem, BingPhoto types"
```

---

## Task 2: Extract shared Google token refresh helper

**Files:**
- Create: `lib/google-auth.ts`
- Modify: `app/api/calendar/google/route.ts`

- [ ] **Step 1: Create `lib/google-auth.ts`**

```ts
import { google } from 'googleapis'
import type { OAuthToken } from '@/types'

export async function refreshGoogleToken(token: OAuthToken): Promise<OAuthToken> {
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
```

- [ ] **Step 2: Update `app/api/calendar/google/route.ts`** — remove the inlined `refreshGoogleToken` function and import from the new lib instead. Replace lines 1–22 with:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshGoogleToken } from '@/lib/google-auth'
import { fetchUpcomingEvents } from '@/lib/google-calendar'
import type { OAuthToken } from '@/types'
```

(The `async function refreshGoogleToken` block that follows is now deleted — the rest of the file is unchanged.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/google-auth.ts app/api/calendar/google/route.ts
git commit -m "refactor: extract refreshGoogleToken to lib/google-auth"
```

---

## Task 3: Add Tasks scope to Google OAuth

**Files:**
- Modify: `app/api/auth/google/route.ts`

- [ ] **Step 1: Add the Tasks scope** — update the `scope` array in `app/api/auth/google/route.ts`:

```ts
scope: [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
],
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/google/route.ts
git commit -m "feat: add Google Tasks scope to OAuth flow"
```

> **Note:** After deploying, disconnect and reconnect Google in the Settings panel to get a token that covers both Calendar and Tasks.

---

## Task 4: Google Tasks library + tests

**Files:**
- Create: `lib/google-tasks.ts`
- Create: `lib/google-tasks.test.ts`

- [ ] **Step 1: Write the failing tests** in `lib/google-tasks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('fetchTaskLists', () => {
  beforeEach(() => vi.resetModules())

  it('returns task lists with their incomplete tasks', async () => {
    const mockTasksApi = {
      tasklists: {
        list: vi.fn().mockResolvedValue({
          data: { items: [{ id: 'list1', title: 'My Tasks' }] },
        }),
      },
      tasks: {
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              { id: 't1', title: 'Buy milk', due: '2026-06-20T00:00:00.000Z' },
              { id: 't2', title: 'Call dentist' },
            ],
          },
        }),
        patch: vi.fn(),
      },
    }
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: class { setCredentials() {} } },
        tasks: vi.fn().mockReturnValue(mockTasksApi),
      },
    }))

    const { fetchTaskLists } = await import('./google-tasks')
    const result = await fetchTaskLists('token123')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('list1')
    expect(result[0].title).toBe('My Tasks')
    expect(result[0].tasks).toHaveLength(2)
    expect(result[0].tasks[0].title).toBe('Buy milk')
    expect(result[0].tasks[0].due).toBe('2026-06-20T00:00:00.000Z')
    expect(result[0].tasks[1].title).toBe('Call dentist')
    expect(result[0].tasks[1].due).toBeUndefined()
  })

  it('excludes task lists that have no incomplete tasks', async () => {
    const mockTasksApi = {
      tasklists: {
        list: vi.fn().mockResolvedValue({
          data: { items: [{ id: 'list1', title: 'Empty' }] },
        }),
      },
      tasks: {
        list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        patch: vi.fn(),
      },
    }
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: class { setCredentials() {} } },
        tasks: vi.fn().mockReturnValue(mockTasksApi),
      },
    }))

    const { fetchTaskLists } = await import('./google-tasks')
    const result = await fetchTaskLists('token123')
    expect(result).toHaveLength(0)
  })
})

describe('completeTask', () => {
  beforeEach(() => vi.resetModules())

  it('calls tasks.patch with status "completed"', async () => {
    const mockPatch = vi.fn().mockResolvedValue({})
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: class { setCredentials() {} } },
        tasks: vi.fn().mockReturnValue({
          tasklists: { list: vi.fn() },
          tasks: { list: vi.fn(), patch: mockPatch },
        }),
      },
    }))

    const { completeTask } = await import('./google-tasks')
    await completeTask('token123', 'list1', 'task1')

    expect(mockPatch).toHaveBeenCalledWith({
      tasklist: 'list1',
      task: 'task1',
      requestBody: { status: 'completed' },
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- lib/google-tasks.test.ts
```
Expected: FAIL — `Cannot find module './google-tasks'`

- [ ] **Step 3: Create `lib/google-tasks.ts`**

```ts
import { google } from 'googleapis'
import type { Task, TaskList } from '@/types'

export async function fetchTaskLists(accessToken: string): Promise<TaskList[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const tasks = google.tasks({ version: 'v1', auth })

  const listsRes = await tasks.tasklists.list()
  const lists = listsRes.data.items ?? []

  const results = await Promise.all(
    lists.map(async (list): Promise<TaskList> => {
      try {
        const tasksRes = await tasks.tasks.list({
          tasklist: list.id!,
          showCompleted: false,
          showHidden: false,
        })
        const taskItems: Task[] = (tasksRes.data.items ?? []).map(t => ({
          id: t.id!,
          title: t.title ?? '(no title)',
          due: t.due ?? undefined,
          notes: t.notes ?? undefined,
        }))
        return { id: list.id!, title: list.title ?? '', tasks: taskItems }
      } catch {
        return { id: list.id!, title: list.title ?? '', tasks: [] }
      }
    })
  )

  return results.filter(l => l.tasks.length > 0)
}

export async function completeTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
): Promise<void> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const tasks = google.tasks({ version: 'v1', auth })
  await tasks.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: { status: 'completed' },
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- lib/google-tasks.test.ts
```
Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/google-tasks.ts lib/google-tasks.test.ts
git commit -m "feat: add Google Tasks library with fetchTaskLists and completeTask"
```

---

## Task 5: Tasks API routes (GET + PATCH)

**Files:**
- Create: `app/api/tasks/google/route.ts`

- [ ] **Step 1: Create `app/api/tasks/google/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshGoogleToken } from '@/lib/google-auth'
import { fetchTaskLists, completeTask } from '@/lib/google-tasks'
import type { OAuthToken } from '@/types'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

async function getRefreshedToken(req: NextRequest): Promise<{ token: OAuthToken; refreshed: OAuthToken } | null> {
  const sealed = req.cookies.get('google_token')?.value
  if (!sealed) return null
  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return null
  const refreshed = await refreshGoogleToken(token)
  return { token, refreshed }
}

async function maybeSetCookie(res: NextResponse, token: OAuthToken, refreshed: OAuthToken): Promise<void> {
  if (refreshed.access_token !== token.access_token) {
    const sealed = await encryptToken(refreshed)
    res.cookies.set('google_token', sealed, COOKIE_OPTS)
  }
}

export async function GET(req: NextRequest) {
  const pair = await getRefreshedToken(req)
  if (!pair) return NextResponse.json({ connected: false, taskLists: [] })

  try {
    const taskLists = await fetchTaskLists(pair.refreshed.access_token)
    const res = NextResponse.json({ connected: true, taskLists })
    await maybeSetCookie(res, pair.token, pair.refreshed)
    return res
  } catch (err) {
    console.error('[google-tasks GET]', err)
    return NextResponse.json({ connected: false, taskLists: [] })
  }
}

export async function PATCH(req: NextRequest) {
  const pair = await getRefreshedToken(req)
  if (!pair) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { taskListId, taskId } = body ?? {}
  if (!taskListId || !taskId) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    await completeTask(pair.refreshed.access_token, taskListId, taskId)
    const res = NextResponse.json({ ok: true })
    await maybeSetCookie(res, pair.token, pair.refreshed)
    return res
  } catch (err) {
    console.error('[google-tasks PATCH]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/tasks/google/route.ts
git commit -m "feat: add GET/PATCH /api/tasks/google route"
```

---

## Task 6: TasksTile component

**Files:**
- Create: `components/tiles/TasksTile.tsx`

- [ ] **Step 1: Create `components/tiles/TasksTile.tsx`**

```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { TaskList } from '@/types'

export default function TasksTile() {
  const [state, setState] = useState<{ connected: boolean; taskLists: TaskList[] }>({
    connected: false,
    taskLists: [],
  })
  const [completing, setCompleting] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const res = await fetch('/api/tasks/google')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  async function handleComplete(taskListId: string, taskId: string) {
    setCompleting(prev => new Set(prev).add(taskId))
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(list =>
        list.id === taskListId
          ? { ...list, tasks: list.tasks.filter(t => t.id !== taskId) }
          : list
      ),
    }))
    await fetch('/api/tasks/google', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskListId, taskId }),
    })
    setCompleting(prev => { const s = new Set(prev); s.delete(taskId); return s })
    load()
  }

  if (!state.connected) {
    return (
      <GlassTile gradient="from-purple-200 to-violet-200" className="h-full flex flex-col">
        <p className="text-purple-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Tasks</p>
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-white/50 text-base">Google Tasks</p>
          <a
            href="/api/auth/google"
            className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold rounded-full transition-colors"
          >
            Connect Google
          </a>
        </div>
      </GlassTile>
    )
  }

  return (
    <GlassTile gradient="from-purple-200 to-violet-200" className="h-full flex flex-col">
      <p className="text-purple-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Tasks</p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3">
        {state.taskLists.length === 0 && (
          <p className="text-white/40 text-sm mt-4 text-center">No pending tasks</p>
        )}
        {state.taskLists.map(list => (
          <div key={list.id}>
            <p className="text-purple-300/70 text-xs font-semibold uppercase tracking-wider mb-1.5">
              {list.title}
            </p>
            <div className="flex flex-col gap-1.5">
              {list.tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-2.5 cursor-pointer group"
                  onClick={() => handleComplete(list.id, task.id)}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 border-purple-300/60
                      flex items-center justify-center transition-colors
                      ${completing.has(task.id) ? 'bg-purple-400' : 'group-hover:bg-purple-400/30'}`}
                  />
                  <span
                    className={`text-sm leading-snug flex-1
                      ${completing.has(task.id) ? 'line-through text-white/40' : 'text-white/85'}`}
                  >
                    {task.title}
                  </span>
                  {task.due && (
                    <span className="text-purple-200/50 text-xs shrink-0">
                      {new Date(task.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassTile>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/tiles/TasksTile.tsx
git commit -m "feat: add TasksTile component with optimistic check-off"
```

---

## Task 7: Install fast-xml-parser + RSS news library + tests

**Files:**
- Create: `lib/news.ts`
- Create: `lib/news.test.ts`

- [ ] **Step 1: Install `fast-xml-parser`**

```bash
npm install fast-xml-parser
```

- [ ] **Step 2: Write the failing tests** in `lib/news.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>First headline</title>
      <link>https://example.com/1</link>
      <pubDate>Mon, 16 Jun 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second headline</title>
      <link>https://example.com/2</link>
      <pubDate>Mon, 16 Jun 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

describe('fetchRssHeadlines', () => {
  beforeEach(() => vi.resetModules())

  it('parses RSS items into NewsItem shape', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(RSS_XML),
    } as unknown as Response)

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://feeds.bbci.co.uk/news/rss.xml')

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('First headline')
    expect(result[0].link).toBe('https://example.com/1')
    expect(result[0].source).toBe('feeds.bbci.co.uk')
    expect(result[0].pubDate).toBe('Mon, 16 Jun 2026 10:00:00 GMT')
  })

  it('returns empty array when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as unknown as Response)

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://bad.example.com/rss')
    expect(result).toHaveLength(0)
  })

  it('respects the limit parameter', async () => {
    const manyItems = Array.from({ length: 20 }, (_, i) =>
      `<item><title>Headline ${i}</title><link>https://example.com/${i}</link></item>`
    ).join('')
    const bigXml = `<rss version="2.0"><channel>${manyItems}</channel></rss>`
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(bigXml),
    } as unknown as Response)

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://example.com/rss', 5)
    expect(result).toHaveLength(5)
  })

  it('returns empty array when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://example.com/rss')
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- lib/news.test.ts
```
Expected: FAIL — `Cannot find module './news'`

- [ ] **Step 4: Create `lib/news.ts`**

```ts
import { XMLParser } from 'fast-xml-parser'
import type { NewsItem } from '@/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'item' || name === 'entry',
})

function sourceFromUrl(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname
  } catch {
    return feedUrl
  }
}

export async function fetchRssHeadlines(feedUrl: string, limit = 8): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'iPad-Dashboard/1.0' },
    })
    if (!res.ok) return []

    const xml = await res.text()
    const parsed = parser.parse(xml)

    const rssItems: unknown[] = parsed?.rss?.channel?.item ?? []
    const atomItems: unknown[] = parsed?.feed?.entry ?? []
    const rawItems = rssItems.length > 0 ? rssItems : atomItems

    const source = sourceFromUrl(feedUrl)

    return rawItems
      .slice(0, limit)
      .map((item: any): NewsItem => ({
        title: typeof item.title === 'object' ? (item.title?.['#text'] ?? '') : (item.title ?? ''),
        link: item.link?.['@_href'] ?? item.link ?? '',
        source,
        pubDate: item.pubDate ?? item.updated ?? item.published ?? '',
      }))
      .filter(item => item.title && item.link)
  } catch {
    return []
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- lib/news.test.ts
```
Expected: all 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/news.ts lib/news.test.ts package.json package-lock.json
git commit -m "feat: add RSS news library with fast-xml-parser"
```

---

## Task 8: News API route

**Files:**
- Create: `app/api/news/route.ts`

- [ ] **Step 1: Create `app/api/news/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchRssHeadlines } from '@/lib/news'

const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.reuters.com/reuters/topNews',
]

export async function GET(req: NextRequest) {
  const feedsParam = req.nextUrl.searchParams.get('feeds')
  const feeds = feedsParam
    ? feedsParam.split(',').map(f => decodeURIComponent(f.trim())).filter(Boolean)
    : DEFAULT_FEEDS

  try {
    const results = await Promise.all(feeds.map(url => fetchRssHeadlines(url, 8)))
    const items = results
      .flat()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 40)

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[news]', err)
    return NextResponse.json({ items: [] })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/news/route.ts
git commit -m "feat: add GET /api/news RSS aggregation route"
```

---

## Task 9: NewsTile component

**Files:**
- Create: `components/tiles/NewsTile.tsx`

- [ ] **Step 1: Create `components/tiles/NewsTile.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { NewsItem } from '@/types'

const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.reuters.com/reuters/topNews',
]

function getFeeds(): string[] {
  try {
    const stored = localStorage.getItem('news_feeds')
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      return parsed.length > 0 ? parsed : DEFAULT_FEEDS
    }
  } catch {}
  return DEFAULT_FEEDS
}

export default function NewsTile() {
  const [items, setItems] = useState<NewsItem[]>([])

  useEffect(() => {
    async function load() {
      try {
        const feeds = getFeeds()
        const params = feeds.map(f => encodeURIComponent(f)).join(',')
        const res = await fetch(`/api/news?feeds=${params}`)
        if (res.ok) {
          const data = await res.json()
          setItems(data.items)
        }
      } catch {}
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <GlassTile gradient="from-emerald-200 to-teal-200" className="h-full flex flex-col">
      <p className="text-emerald-200/70 text-xs font-semibold tracking-widest uppercase mb-2 shrink-0">
        News
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar flex-1 items-stretch">
        {items.length === 0 && (
          <p className="text-white/40 text-sm self-center">Loading headlines...</p>
        )}
        {items.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-48 bg-white/5 hover:bg-white/10 border border-white/10
              rounded-xl p-3 flex flex-col gap-1 transition-colors"
          >
            <p className="text-white text-sm font-medium leading-snug line-clamp-3 flex-1">
              {item.title}
            </p>
            <p className="text-emerald-200/60 text-xs">{item.source}</p>
          </a>
        ))}
      </div>
    </GlassTile>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/tiles/NewsTile.tsx
git commit -m "feat: add NewsTile with horizontal scrolling headlines"
```

---

## Task 10: News Feeds in SettingsPanel

**Files:**
- Modify: `components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Update `components/settings/SettingsPanel.tsx`** — add news feed state, helpers, and the new section. Replace the entire file content with:

```tsx
'use client'
import { useState } from 'react'

const DEFAULT_NEWS_FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.reuters.com/reuters/topNews',
]

function loadNewsFeeds(): string[] {
  try {
    const stored = localStorage.getItem('news_feeds')
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      return parsed.length > 0 ? parsed : DEFAULT_NEWS_FEEDS
    }
  } catch {}
  return DEFAULT_NEWS_FEEDS
}

interface SettingsPanelProps {
  weatherLocation: { lat: number; lon: number } | null
  onWeatherLocationChange: (loc: { lat: number; lon: number } | null) => void
}

export default function SettingsPanel({
  weatherLocation,
  onWeatherLocationChange,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const [weatherCity, setWeatherCity] = useState('')
  const [newsFeeds, setNewsFeeds] = useState<string[]>(DEFAULT_NEWS_FEEDS)
  const [newFeedUrl, setNewFeedUrl] = useState('')

  function handleOpen() {
    setNewsFeeds(loadNewsFeeds())
    setOpen(true)
  }

  function saveFeeds(feeds: string[]) {
    setNewsFeeds(feeds)
    localStorage.setItem('news_feeds', JSON.stringify(feeds))
  }

  function addFeed() {
    const url = newFeedUrl.trim()
    if (!url || newsFeeds.includes(url)) return
    saveFeeds([...newsFeeds, url])
    setNewFeedUrl('')
  }

  function removeFeed(index: number) {
    saveFeeds(newsFeeds.filter((_, i) => i !== index))
  }

  async function resolveWeatherCity() {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(weatherCity)}&format=json&limit=1`
    )
    const results = await res.json()
    const result = results[0]
    if (result) {
      onWeatherLocationChange({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) })
      setWeatherCity('')
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center
          bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors"
        aria-label="Settings"
      >
        ⚙
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-t-2xl w-full max-w-2xl p-6 pb-10 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Settings</h2>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white text-2xl">×</button>
            </div>

            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Spotify</h3>
              <a href="/api/auth/spotify"
                className="inline-block px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors">
                Reconnect Spotify
              </a>
            </section>

            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Google Calendar &amp; Tasks</h3>
              <a href="/api/auth/google"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                Reconnect Google
              </a>
            </section>

            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">Weather Location</h3>
              <div className="flex gap-2">
                <input
                  type="text" placeholder="City name (leave blank for GPS)" value={weatherCity}
                  onChange={(e) => setWeatherCity(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={resolveWeatherCity}
                  disabled={!weatherCity}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
                >
                  Set
                </button>
                {weatherLocation && (
                  <button
                    onClick={() => onWeatherLocationChange(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                  >
                    Use GPS
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-white/70 text-sm font-medium">News Feeds</h3>
              <div className="flex flex-col gap-2">
                {newsFeeds.map((feed, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-white/60 text-xs truncate bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      {feed}
                    </span>
                    <button
                      onClick={() => removeFeed(i)}
                      className="text-white/40 hover:text-white/80 text-lg px-2 transition-colors"
                      aria-label="Remove feed"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="RSS feed URL"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeed()}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={addFeed}
                    disabled={!newFeedUrl}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/settings/SettingsPanel.tsx
git commit -m "feat: add News Feeds section to SettingsPanel"
```

---

## Task 11: Bing photo API route

**Files:**
- Create: `app/api/photo/bing/route.ts`

- [ ] **Step 1: Create the directory and route file** `app/api/photo/bing/route.ts`:

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1',
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`Bing API responded ${res.status}`)

    const data = await res.json()
    const image = data.images?.[0]
    if (!image) throw new Error('No image in Bing response')

    return NextResponse.json(
      { url: `https://www.bing.com${image.url}`, title: image.copyright ?? '' },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    )
  } catch (err) {
    console.error('[bing-photo]', err)
    return NextResponse.json({ url: '', title: '' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/photo/bing/route.ts
git commit -m "feat: add GET /api/photo/bing Bing daily photo proxy"
```

---

## Task 12: PhotoTile component

**Files:**
- Create: `components/tiles/PhotoTile.tsx`

- [ ] **Step 1: Create `components/tiles/PhotoTile.tsx`**

PhotoTile renders full-bleed, so it builds its own glass shell rather than wrapping `GlassTile` (which always adds inner padding).

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { BingPhoto } from '@/types'

export default function PhotoTile() {
  const [photo, setPhoto] = useState<BingPhoto | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/photo/bing')
        if (res.ok) setPhoto(await res.json())
      } catch {}
    }
    load()
    const id = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative rounded-2xl overflow-hidden h-full border border-white/15 bg-amber-900/20">
      {photo?.url ? (
        <img
          src={photo.url}
          alt={photo.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-amber-800/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {photo?.title && (
        <p className="absolute bottom-2 left-3 right-3 text-white/75 text-xs leading-snug line-clamp-2">
          {photo.title}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/tiles/PhotoTile.tsx
git commit -m "feat: add PhotoTile with Bing daily image full-bleed display"
```

---

## Task 13: Update grid layout

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`** with the new 3-column 3-row layout:

```tsx
'use client'
import { useState } from 'react'
import ClockWeatherTile from '@/components/tiles/ClockWeatherTile'
import CalendarTile from '@/components/tiles/CalendarTile'
import MusicTile from '@/components/tiles/MusicTile'
import PhotoTile from '@/components/tiles/PhotoTile'
import TasksTile from '@/components/tiles/TasksTile'
import NewsTile from '@/components/tiles/NewsTile'
import SettingsPanel from '@/components/settings/SettingsPanel'

export default function DashboardPage() {
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lon: number } | null>(null)

  return (
    <>
      <main
        className="aurora-bg w-screen h-screen p-4 grid gap-3"
        style={{
          gridTemplateColumns: '0.85fr 1.8fr 1fr',
          gridTemplateRows: '1fr 1fr 0.42fr',
        }}
      >
        {/* col 1 row 1 — Clock & Weather (compact) */}
        <div style={{ gridColumn: '1', gridRow: '1' }} className="h-full overflow-hidden">
          <ClockWeatherTile locationOverride={weatherLocation ?? undefined} />
        </div>

        {/* col 1 row 2 — Photo of Day (compact) */}
        <div style={{ gridColumn: '1', gridRow: '2' }} className="h-full overflow-hidden">
          <PhotoTile />
        </div>

        {/* col 2 row 1 — Tasks (large) */}
        <div style={{ gridColumn: '2', gridRow: '1' }} className="h-full overflow-hidden">
          <TasksTile />
        </div>

        {/* col 2 row 2 — Calendar (large) */}
        <div style={{ gridColumn: '2', gridRow: '2' }} className="h-full overflow-hidden">
          <CalendarTile />
        </div>

        {/* col 3 rows 1-3 — Music full height */}
        <div style={{ gridColumn: '3', gridRow: '1 / 4' }} className="h-full overflow-hidden">
          <MusicTile />
        </div>

        {/* col 1-2 row 3 — News strip */}
        <div style={{ gridColumn: '1 / 3', gridRow: '3' }} className="h-full overflow-hidden">
          <NewsTile />
        </div>
      </main>

      <SettingsPanel
        weatherLocation={weatherLocation}
        onWeatherLocationChange={setWeatherLocation}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 4: Start the dev server and verify the layout visually**

```bash
npm run dev
```
Open `http://localhost:3000`. Confirm:
- Left column is narrow: ClockWeather on top, Photo placeholder below
- Middle column is wide: Tasks (with Connect Google prompt) on top, Calendar below
- Right column: Music unchanged, full height
- Bottom strip: News loading headlines
- Settings gear shows "Google Calendar & Tasks" reconnect button and News Feeds section

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: update dashboard to 3-column 3-row grid with Tasks, Photo, and News tiles"
```
