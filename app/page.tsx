'use client'
import { useState } from 'react'
import ClockWeatherTile from '@/components/tiles/ClockWeatherTile'
import CalendarTile from '@/components/tiles/CalendarTile'
import MusicTile from '@/components/tiles/MusicTile'
import PhotoTile from '@/components/tiles/PhotoTile'
import TasksTile from '@/components/tiles/TasksTile'
import NewsTile from '@/components/tiles/NewsTile'
import SettingsPanel from '@/components/settings/SettingsPanel'

export default function DashboardPage() {
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lon: number } | null>(null)

  return (
    <>
      <main
        className="aurora-bg w-screen h-screen p-4 grid gap-3"
        style={{
          gridTemplateColumns: '0.85fr 1.8fr 1fr',
          gridTemplateRows: '1fr 1fr 0.42fr',
        }}
      >
        {/* col 1 row 1 — Clock & Weather (compact) */}
        <div style={{ gridColumn: '1', gridRow: '1' }} className="h-full overflow-hidden">
          <ClockWeatherTile locationOverride={weatherLocation ?? undefined} />
        </div>

        {/* col 1 row 2 — Photo of Day (compact) */}
        <div style={{ gridColumn: '1', gridRow: '2' }} className="h-full overflow-hidden">
          <PhotoTile />
        </div>

        {/* col 2 row 1 — Tasks (large) */}
        <div style={{ gridColumn: '2', gridRow: '1' }} className="h-full overflow-hidden">
          <TasksTile />
        </div>

        {/* col 2 row 2 — Calendar (large) */}
        <div style={{ gridColumn: '2', gridRow: '2' }} className="h-full overflow-hidden">
          <CalendarTile />
        </div>

        {/* col 3 rows 1-3 — Music full height */}
        <div style={{ gridColumn: '3', gridRow: '1 / 4' }} className="h-full overflow-hidden">
          <MusicTile />
        </div>

        {/* col 1-2 row 3 — News strip */}
        <div style={{ gridColumn: '1 / 3', gridRow: '3' }} className="h-full overflow-hidden">
          <NewsTile />
        </div>
      </main>

      <SettingsPanel
        weatherLocation={weatherLocation}
        onWeatherLocationChange={setWeatherLocation}
      />
    </>
  )
}
