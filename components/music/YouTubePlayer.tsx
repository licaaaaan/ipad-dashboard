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
  const playerRef = useRef<{
    destroy(): void
    pauseVideo(): void
    playVideo(): void
    nextVideo(): void
    previousVideo(): void
  } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [apiReady, setApiReady] = useState(false)

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
