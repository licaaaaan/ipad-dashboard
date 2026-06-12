'use client'
import GlassTile from '@/components/ui/GlassTile'
import SwipeContainer from '@/components/ui/SwipeContainer'
import SpotifyPlayer from '@/components/music/SpotifyPlayer'
import YouTubePlayer from '@/components/music/YouTubePlayer'

interface MusicTileProps {
  youtubeUrl: string | null
}

export default function MusicTile({ youtubeUrl }: MusicTileProps) {
  return (
    <GlassTile gradient="from-green-600 to-green-800" className="h-full flex flex-col">
      <p className="text-green-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Music</p>
      <div className="flex-1 min-h-0">
        <SwipeContainer className="h-full">
          <SpotifyPlayer />
          <YouTubePlayer videoUrl={youtubeUrl} />
        </SwipeContainer>
      </div>
    </GlassTile>
  )
}
