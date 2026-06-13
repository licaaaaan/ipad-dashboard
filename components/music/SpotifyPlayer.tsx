'use client'
import { useEffect, useState, useRef, useCallback } from 'react'

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

declare global {
  interface Window {
    Spotify: {
      Player: new (opts: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SDKPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
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

export default function SpotifyPlayer() {
  const [connected, setConnected] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [playbackState, setPlaybackState] = useState<SDKState | null>(null)
  const [volume, setVolume] = useState(0.8)
  const [position, setPosition] = useState(0)
  const playerRef = useRef<SDKPlayer | null>(null)
  const positionRef = useRef(0)
  const volumeRef = useRef(0.8)

  // Check connection
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
    if (window.Spotify) {
      initPlayer()
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      document.head.appendChild(script)
    }
    return () => { playerRef.current?.disconnect(); playerRef.current = null }
  }, [connected, initPlayer])

  // Tick position forward while playing
  useEffect(() => {
    if (!playbackState || playbackState.paused) return
    const id = setInterval(() => {
      positionRef.current += 1000
      setPosition(positionRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [playbackState?.paused, playbackState?.track_window.current_track.name])

  async function transferPlayback() {
    if (!deviceId) return
    await fetch('/api/spotify/transfer-playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
  }

  async function handleVolume(v: number) {
    volumeRef.current = v
    setVolume(v)
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
      {/* Album art */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {track?.album.images[0]?.url ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            className="w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center">
            <span className="text-4xl">🎵</span>
          </div>
        )}
      </div>

      {/* Track info */}
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

      {/* Play on this device */}
      {deviceId && !playbackState && (
        <button onClick={transferPlayback}
          className="shrink-0 text-sm text-green-300 hover:text-green-200 flex items-center gap-2 justify-center py-1">
          <span>▶</span> Play on this device
        </button>
      )}

      {/* Progress bar */}
      <div className="shrink-0 w-full h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Playback controls */}
      <div className="shrink-0 flex items-center justify-center gap-8">
        <button onClick={() => playerRef.current?.previousTrack()}
          className="text-2xl text-white/70 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          ⏮
        </button>
        <button onClick={() => playerRef.current?.togglePlay()}
          className="text-3xl text-white/80 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={() => playerRef.current?.nextTrack()}
          className="text-2xl text-white/70 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          ⏭
        </button>
      </div>

      {/* Volume */}
      <div className="shrink-0 flex items-center gap-2 pb-1">
        <span className="text-white/40 text-sm">🔈</span>
        <input type="range" min="0" max="1" step="0.02" value={volume}
          onChange={(e) => handleVolume(parseFloat(e.target.value))}
          className="flex-1 accent-green-400 h-1 cursor-pointer" />
        <span className="text-white/40 text-sm">🔊</span>
      </div>
    </div>
  )
}
