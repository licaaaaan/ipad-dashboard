'use client'
import GlassTile from '@/components/ui/GlassTile'
import ClockTile from '@/components/tiles/ClockTile'
import WeatherTile from '@/components/tiles/WeatherTile'

export default function DashboardPage() {
  return (
    <main
      className="aurora-bg w-screen h-screen p-4 grid gap-3"
      style={{
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      <div style={{ gridColumn: '1 / 3', gridRow: '1' }}>
        <WeatherTile />
      </div>

      <div style={{ gridColumn: '3', gridRow: '1' }}>
        <ClockTile />
      </div>

      <div style={{ gridColumn: '1', gridRow: '2' }}>
        <GlassTile gradient="from-emerald-500 to-teal-600" className="h-full">
          <p className="text-white/60 text-sm">Calendar</p>
        </GlassTile>
      </div>

      <div style={{ gridColumn: '2 / 4', gridRow: '2' }}>
        <GlassTile gradient="from-green-600 to-green-800" className="h-full">
          <p className="text-white/60 text-sm">Music</p>
        </GlassTile>
      </div>
    </main>
  )
}
