'use client'
import GlassTile from '@/components/ui/GlassTile'
import SpotifyPlayer from '@/components/music/SpotifyPlayer'

export default function MusicTile() {
  return (
    <GlassTile gradient="from-pink-200 to-pink-300" className="h-full flex flex-col">
      <p className="text-pink-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Music</p>
      <div className="flex-1 min-h-0">
        <SpotifyPlayer />
      </div>
    </GlassTile>
  )
}
