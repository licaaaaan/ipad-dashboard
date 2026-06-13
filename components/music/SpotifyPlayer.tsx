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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-white/50 text-sm text-center">Spotify not connected</p>
        <a href="/api/auth/spotify"
          className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-full transition-colors">
          Connect Spotify
        </a>
      </div>
    )
  }

  if (!state.nowPlaying) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-sm">Nothing playing</p>
      </div>
    )
  }

  const { nowPlaying: np } = state
  const progress = (np.progressMs / np.durationMs) * 100

  return (
    <div className="flex flex-col h-full gap-4 justify-between">
      {/* Album art — large, fills vertical space */}
      {np.albumArtUrl && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <img
            src={np.albumArtUrl}
            alt={np.albumName}
            className="w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Track info */}
      <div className="shrink-0">
        <p className="text-white font-semibold text-base truncate">{np.trackName}</p>
        <p className="text-white/60 text-sm truncate">{np.artistName}</p>
        <p className="text-white/40 text-xs truncate">{np.albumName}</p>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 w-full h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-8 pb-1">
        {[
          { action: 'previous' as const, label: '⏮', size: 'text-2xl' },
          { action: np.isPlaying ? 'pause' : 'play', label: np.isPlaying ? '⏸' : '▶', size: 'text-3xl' },
          { action: 'next' as const, label: '⏭', size: 'text-2xl' },
        ].map(({ action, label, size }) => (
          <button key={action}
            onClick={() => control(action as 'play' | 'pause' | 'next' | 'previous')}
            className={`${size} text-white/80 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
