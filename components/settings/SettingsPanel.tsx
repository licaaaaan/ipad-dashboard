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
        onClick={() => setOpen(true)}
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
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-t-2xl w-full max-w-2xl p-6 pb-10 space-y-6">
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
              <h3 className="text-white/70 text-sm font-medium">Google Calendar</h3>
              <a href="/api/auth/google"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                Reconnect Google
              </a>
            </section>

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
                <button
                  onClick={saveAppleCredentials}
                  disabled={!appleEmail || !applePassword}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors w-fit"
                >
                  {appleStatus === 'saving' ? 'Saving...'
                    : appleStatus === 'saved' ? 'Saved ✓'
                    : appleStatus === 'error' ? 'Error — check credentials'
                    : 'Save Apple Credentials'}
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">YouTube</h3>
              <div className="flex gap-2">
                <input
                  type="url" placeholder="YouTube video or playlist URL" value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={() => { onYoutubeUrlChange(ytInput); setOpen(false) }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  Set
                </button>
              </div>
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
          </div>
        </div>
      )}
    </>
  )
}
