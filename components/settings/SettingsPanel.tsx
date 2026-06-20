'use client'
import { useState } from 'react'
import { DEFAULT_NEWS_FEEDS } from '@/lib/news-defaults'

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
        title="Settings"
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center
          bg-black/30 hover:bg-black/50 border border-white/20 rounded-full text-white/70
          hover:text-white transition-all backdrop-blur-sm"
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
          className="w-5 h-5" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
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
                  <div key={feed} className="flex items-center gap-2">
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
