'use client'
import { useState } from 'react'
import ClockWeatherTile from '@/components/tiles/ClockWeatherTile'
import CalendarTile from '@/components/tiles/CalendarTile'
import MusicTile from '@/components/tiles/MusicTile'
import SettingsPanel from '@/components/settings/SettingsPanel'

export default function DashboardPage() {
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lon: number } | null>(null)

  return (
    <>
      <main
        className="aurora-bg w-screen h-screen p-4 grid gap-3"
        style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' }}
      >
        {/* Top-left: clock + weather combined */}
        <div style={{ gridColumn: '1', gridRow: '1' }}>
          <ClockWeatherTile locationOverride={weatherLocation ?? undefined} />
        </div>

        {/* Bottom-left: calendar */}
        <div style={{ gridColumn: '1', gridRow: '2' }}>
          <CalendarTile />
        </div>

        {/* Right column full-height: Spotify */}
        <div style={{ gridColumn: '2', gridRow: '1 / 3' }}>
          <MusicTile />
        </div>
      </main>

      <SettingsPanel
        weatherLocation={weatherLocation}
        onWeatherLocationChange={setWeatherLocation}
      />
    </>
  )
}
