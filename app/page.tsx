'use client'
import { useState } from 'react'
import ClockTile from '@/components/tiles/ClockTile'
import WeatherTile from '@/components/tiles/WeatherTile'
import CalendarTile from '@/components/tiles/CalendarTile'
import MusicTile from '@/components/tiles/MusicTile'

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)

  return (
    <main
      className="aurora-bg w-screen h-screen p-4 grid gap-3"
      style={{ gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }}
    >
      <div style={{ gridColumn: '1 / 3', gridRow: '1' }}>
        <WeatherTile />
      </div>

      <div style={{ gridColumn: '3', gridRow: '1' }}>
        <ClockTile />
      </div>

      <div style={{ gridColumn: '1', gridRow: '2' }}>
        <CalendarTile />
      </div>

      <div style={{ gridColumn: '2 / 4', gridRow: '2' }}>
        <MusicTile youtubeUrl={youtubeUrl} />
      </div>
    </main>
  )
}
