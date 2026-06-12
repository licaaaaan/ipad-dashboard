'use client'
import GlassTile from '@/components/ui/GlassTile'
import SpotifyPlayer from '@/components/music/SpotifyPlayer'

export default function MusicTile() {
  return (
    <GlassTile gradient="from-green-600 to-green-800" className="h-full flex flex-col">
      <p className="text-green-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Music</p>
      <div className="flex-1 min-h-0">
        <SpotifyPlayer />
      </div>
    </GlassTile>
  )
}
