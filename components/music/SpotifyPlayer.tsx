'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { NowPlaying } from '@/types'

// ── SVG icons ───────────────────────────────────────────────────────────────

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  )
}
function IconNext() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M6 18l8.5-6L6 6v12zm8.5-6v6h2V6h-2v6z" />
    </svg>
  )
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function CtrlBtn({ onClick, children, large = false }: {
  onClick: () => void
  children: React.ReactNode
  large?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`
        ${large ? 'w-20 h-20' : 'w-14 h-14'}
        rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-90
        flex items-center justify-center text-white transition-all duration-100 select-none
      `}
    >
      {children}
    </button>
  )
}

// ── Lyrics ──────────────────────────────────────────────────────────────────

interface LyricLine { time: number; text: string }

function parseLRC(lrc: string): LyricLine[] {
  return lrc
    .split('\n')
    .flatMap(line => {
      const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/)
      if (!m) return []
      return [{ time: (parseInt(m[1]) * 60 + parseFloat(m[2])) * 1000, text: m[3].trim() }]
    })
    .filter(l => l.text)
    .sort((a, b) => a.time - b.time)
}

async function fetchLyrics(np: NowPlaying): Promise<LyricLine[] | null> {
  try {
    const params = new URLSearchParams({
      artist:   np.artistName,
      title:    np.trackName,
      album:    np.albumName,
      duration: String(Math.round(np.durationMs / 1000)),
    })
    const res = await fetch(`/api/spotify/lyrics?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    // Only use synced lyrics — plain lyrics have no timestamps so 3-line display is meaningless
    if (data.syncedLyrics) return parseLRC(data.syncedLyrics)
    return null
  } catch {
    return null
  }
}

function LyricsDisplay({ lines, positionMs }: { lines: LyricLine[]; positionMs: number }) {
  const activeIdx = lines.reduce((best, line, i) => line.time <= positionMs ? i : best, 0)
  const prev = activeIdx > 0 ? lines[activeIdx - 1].text : null
  const curr = lines[activeIdx]?.text ?? null
  const next = lines[activeIdx + 1]?.text ?? null

  return (
    <div className="flex flex-col items-center gap-1.5 py-1 px-3">
      <p className={`text-center text-xs leading-snug transition-all duration-300 ${prev ? 'text-white/30' : 'invisible'}`}>
        {prev ?? '​'}
      </p>
      <p className="text-center text-sm font-semibold text-white leading-snug transition-all duration-300">
        {curr}
      </p>
      <p className={`text-center text-xs leading-snug transition-all duration-300 ${next ? 'text-white/40' : 'invisible'}`}>
        {next ?? '​'}
      </p>
    </div>
  )
}

// ── Main player ─────────────────────────────────────────────────────────────

export default function SpotifyPlayer() {
  const [state, setState] = useState<{ connected: boolean; nowPlaying: NowPlaying | null }>({
    connected: false, nowPlaying: null,
  })
  const [position, setPosition] = useState(0)
  // undefined = loading, null = not found, LyricLine[] = found
  const [lyrics, setLyrics] = useState<LyricLine[] | null | undefined>(undefined)
  const positionRef = useRef(0)

  const poll = useCallback(async () => {
    const res = await fetch('/api/spotify/now-playing')
    if (res.ok) {
      const data = await res.json()
      setState(data)
      if (data.nowPlaying) {
        positionRef.current = data.nowPlaying.progressMs
        setPosition(data.nowPlaying.progressMs)
      }
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [poll])

  // Progress ticker
  useEffect(() => {
    if (!state.nowPlaying?.isPlaying) return
    const id = setInterval(() => {
      positionRef.current += 1000
      setPosition(positionRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [state.nowPlaying?.isPlaying, state.nowPlaying?.trackName])

  // Fetch lyrics when track changes
  const np = state.nowPlaying
  const trackKey = np ? `${np.artistName}|${np.trackName}` : null
  useEffect(() => {
    if (!np || !trackKey) { setLyrics(undefined); return }
    setLyrics(undefined)
    fetchLyrics(np).then(result => setLyrics(result))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey])

  async function control(action: 'play' | 'pause' | 'next' | 'previous') {
    await fetch('/api/spotify/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setTimeout(poll, 600)
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

  const progress = np ? Math.min((position / np.durationMs) * 100, 100) : 0

  return (
    <div className="flex flex-col h-full items-center gap-3 pt-2">
      {/* Album art */}
      <div className="shrink-0">
        {np?.albumArtUrl ? (
          <img src={np.albumArtUrl} alt={np.albumName}
            className="w-48 h-48 rounded-2xl shadow-2xl object-cover" />
        ) : (
          <div className="w-48 h-48 rounded-2xl bg-white/5 flex items-center justify-center">
            <span className="text-5xl">🎵</span>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="shrink-0 text-center w-full px-2">
        {np ? (
          <>
            <p className="text-white font-semibold text-base truncate">{np.trackName}</p>
            <p className="text-white/60 text-sm truncate">{np.artistName}</p>
          </>
        ) : (
          <p className="text-white/40 text-sm">Nothing playing</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="shrink-0 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-5">
        <CtrlBtn onClick={() => control('previous')}><IconPrev /></CtrlBtn>
        <CtrlBtn onClick={() => control(np?.isPlaying ? 'pause' : 'play')} large>
          {np?.isPlaying ? <IconPause /> : <IconPlay />}
        </CtrlBtn>
        <CtrlBtn onClick={() => control('next')}><IconNext /></CtrlBtn>
      </div>

      {/* Lyrics — 3-line display below controls */}
      <div className="shrink-0 w-full border-t border-white/10 pt-2">
        {lyrics === undefined && np && (
          <p className="text-center text-white/25 text-xs">Loading lyrics…</p>
        )}
        {lyrics === null && np && (
          <p className="text-center text-white/20 text-xs">No lyrics available</p>
        )}
        {lyrics && lyrics.length > 0 && (
          <LyricsDisplay lines={lyrics} positionMs={position} />
        )}
      </div>
    </div>
  )
}
