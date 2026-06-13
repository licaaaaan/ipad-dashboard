'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { NowPlaying } from '@/types'

// ── SVG icons ──────────────────────────────────────────────────────────────

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  )
}
function IconNext() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M6 18l8.5-6L6 6v12zm8.5-6v6h2V6h-2v6z" />
    </svg>
  )
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}
function IconVolumeLow() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.5 12A4.5 4.5 0 0 0 16 7.97V16c1.48-.73 2.5-2.25 2.5-4zM5 9v6h4l5 5V4L9 9H5z" />
    </svg>
  )
}
function IconVolumeHigh() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

// ── Control button ──────────────────────────────────────────────────────────

function CtrlBtn({ onClick, children, large = false }: {
  onClick: () => void
  children: React.ReactNode
  large?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`
        ${large ? 'w-16 h-16' : 'w-12 h-12'}
        rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-90
        flex items-center justify-center text-white transition-all duration-100 select-none
      `}
    >
      {children}
    </button>
  )
}

// ── iOS detection (SDK not supported on iOS Safari) ─────────────────────────

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// ── REST-based player (iOS fallback) ────────────────────────────────────────

function RESTPlayer() {
  const [state, setState] = useState<{ connected: boolean; nowPlaying: NowPlaying | null }>({
    connected: false, nowPlaying: null,
  })
  const [position, setPosition] = useState(0)
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

  useEffect(() => {
    if (!state.nowPlaying?.isPlaying) return
    const id = setInterval(() => {
      positionRef.current += 1000
      setPosition(positionRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [state.nowPlaying?.isPlaying, state.nowPlaying?.trackName])

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

  const np = state.nowPlaying
  const progress = np ? Math.min((position / np.durationMs) * 100, 100) : 0

  return (
    <div className="flex flex-col h-full gap-4 justify-between">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {np?.albumArtUrl ? (
          <img src={np.albumArtUrl} alt={np.albumName}
            className="w-full max-h-full object-contain rounded-xl shadow-2xl" />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center">
            <span className="text-4xl">🎵</span>
          </div>
        )}
      </div>

      <div className="shrink-0 min-h-[3rem]">
        {np ? (
          <>
            <p className="text-white font-semibold text-base truncate">{np.trackName}</p>
            <p className="text-white/60 text-sm truncate">{np.artistName}</p>
            <p className="text-white/40 text-xs truncate">{np.albumName}</p>
          </>
        ) : (
          <p className="text-white/40 text-sm">Nothing playing</p>
        )}
      </div>

      <div className="shrink-0 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }} />
      </div>

      <div className="shrink-0 flex items-center justify-center gap-4 pb-1">
        <CtrlBtn onClick={() => control('previous')}><IconPrev /></CtrlBtn>
        <CtrlBtn onClick={() => control(np?.isPlaying ? 'pause' : 'play')} large>
          {np?.isPlaying ? <IconPause /> : <IconPlay />}
        </CtrlBtn>
        <CtrlBtn onClick={() => control('next')}><IconNext /></CtrlBtn>
      </div>
    </div>
  )
}

// ── SDK types ───────────────────────────────────────────────────────────────

interface SDKTrack {
  name: string
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string }> }
}
interface SDKState {
  paused: boolean
  position: number
  duration: number
  track_window: { current_track: SDKTrack }
}
interface SDKPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  togglePlay(): Promise<void>
  nextTrack(): Promise<void>
  previousTrack(): Promise<void>
  setVolume(v: number): Promise<void>
  addListener(event: 'ready', cb: (e: { device_id: string }) => void): void
  addListener(event: 'player_state_changed', cb: (state: SDKState | null) => void): void
  addListener(event: string, cb: (arg: unknown) => void): void
}
declare global {
  interface Window {
    Spotify: { Player: new (opts: { name: string; getOAuthToken: (cb: (t: string) => void) => void; volume?: number }) => SDKPlayer }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

// ── SDK-based player (desktop) ──────────────────────────────────────────────

function SDKPlayerView() {
  const [connected, setConnected] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [playbackState, setPlaybackState] = useState<SDKState | null>(null)
  const [volume, setVolume] = useState(0.8)
  const [position, setPosition] = useState(0)
  const playerRef = useRef<SDKPlayer | null>(null)
  const positionRef = useRef(0)
  const volumeRef = useRef(0.8)

  useEffect(() => {
    fetch('/api/spotify/token').then(r => { if (r.ok) setConnected(true) }).catch(() => {})
  }, [])

  const initPlayer = useCallback(() => {
    if (!window.Spotify || playerRef.current) return
    const player = new window.Spotify.Player({
      name: 'iPad Dashboard',
      getOAuthToken: (cb) => {
        fetch('/api/spotify/token')
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(({ access_token }) => cb(access_token))
          .catch(() => {})
      },
      volume: volumeRef.current,
    })
    player.addListener('ready', ({ device_id }) => setDeviceId(device_id))
    player.addListener('player_state_changed', (state) => {
      if (!state) return
      setPlaybackState(state)
      positionRef.current = state.position
      setPosition(state.position)
    })
    player.connect()
    playerRef.current = player
  }, [])

  useEffect(() => {
    if (!connected) return
    if (window.Spotify) { initPlayer() } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer
      const s = document.createElement('script')
      s.src = 'https://sdk.scdn.co/spotify-player.js'
      document.head.appendChild(s)
    }
    return () => { playerRef.current?.disconnect(); playerRef.current = null }
  }, [connected, initPlayer])

  useEffect(() => {
    if (!playbackState || playbackState.paused) return
    const id = setInterval(() => { positionRef.current += 1000; setPosition(positionRef.current) }, 1000)
    return () => clearInterval(id)
  }, [playbackState?.paused, playbackState?.track_window.current_track.name])

  async function transfer() {
    if (!deviceId) return
    await fetch('/api/spotify/transfer-playback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
  }

  async function handleVolume(v: number) {
    volumeRef.current = v; setVolume(v)
    await playerRef.current?.setVolume(v)
  }

  if (!connected) {
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

  const track = playbackState?.track_window.current_track
  const progress = playbackState ? Math.min((position / playbackState.duration) * 100, 100) : 0
  const isPlaying = playbackState ? !playbackState.paused : false

  return (
    <div className="flex flex-col h-full gap-4 justify-between">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {track?.album.images[0]?.url ? (
          <img src={track.album.images[0].url} alt={track.album.name}
            className="w-full max-h-full object-contain rounded-xl shadow-2xl" />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center">
            <span className="text-4xl">🎵</span>
          </div>
        )}
      </div>

      <div className="shrink-0 min-h-[3rem]">
        {track ? (
          <>
            <p className="text-white font-semibold text-base truncate">{track.name}</p>
            <p className="text-white/60 text-sm truncate">{track.artists.map(a => a.name).join(', ')}</p>
            <p className="text-white/40 text-xs truncate">{track.album.name}</p>
          </>
        ) : (
          <p className="text-white/40 text-sm">{deviceId ? 'Nothing playing' : 'Connecting…'}</p>
        )}
      </div>

      {deviceId && !playbackState && (
        <button onClick={transfer}
          className="shrink-0 text-sm text-green-300 hover:text-green-200 active:text-green-100 flex items-center gap-2 justify-center py-2 rounded-full bg-white/5 active:bg-white/10 transition-all">
          <IconPlay /> Play on this device
        </button>
      )}

      <div className="shrink-0 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }} />
      </div>

      <div className="shrink-0 flex items-center justify-center gap-4">
        <CtrlBtn onClick={() => playerRef.current?.previousTrack()}><IconPrev /></CtrlBtn>
        <CtrlBtn onClick={() => playerRef.current?.togglePlay()} large>
          {isPlaying ? <IconPause /> : <IconPlay />}
        </CtrlBtn>
        <CtrlBtn onClick={() => playerRef.current?.nextTrack()}><IconNext /></CtrlBtn>
      </div>

      <div className="shrink-0 flex items-center gap-2 pb-1">
        <span className="text-white/40"><IconVolumeLow /></span>
        <input type="range" min="0" max="1" step="0.02" value={volume}
          onChange={(e) => handleVolume(parseFloat(e.target.value))}
          className="flex-1 accent-green-400 cursor-pointer" style={{ height: '4px' }} />
        <span className="text-white/40"><IconVolumeHigh /></span>
      </div>
    </div>
  )
}

// ── Entry point ─────────────────────────────────────────────────────────────

export default function SpotifyPlayer() {
  const [isIOS, setIsIOS] = useState(false)
  useEffect(() => { setIsIOS(detectIOS()) }, [])
  return isIOS ? <RESTPlayer /> : <SDKPlayerView />
}
